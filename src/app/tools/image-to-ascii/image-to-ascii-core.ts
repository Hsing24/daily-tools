/**
 * 圖片轉 ASCII 核心演算法與 TypeScript 代碼產生器
 */

export interface ConvertOptions {
  width: number;
  charSet: string;
  dither: boolean;
  contrast: number; // -100 到 100
  brightness: number; // -100 到 100
  colorMode: "monochrome" | "retro-green" | "retro-amber" | "original";
  charAspectRatio: number; // 通常為 0.55
}

export interface ConvertResult {
  width: number;
  height: number;
  chars: string[];
  colors?: string[]; // 只有在 original 模式下需要
}

export const MAX_SOURCE_PIXELS = 20_000_000;
export const MAX_OUTPUT_CELLS = 200_000;
export const DEFAULT_ALPHA_BACKGROUND: readonly [number, number, number] = [
  255, 255, 255,
];

export type AsciiColorMode = ConvertOptions["colorMode"];
export type AsciiAnimationType = "none" | "typewriter" | "matrix" | "jitter";

function splitGraphemes(text: string): string[] {
  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    });
    return Array.from(segmenter.segment(text), (part) => part.segment);
  }
  return Array.from(text);
}

export function getGraphemeCharset(charSet: string): string[] {
  return splitGraphemes(charSet);
}

function validateOptions(
  sourceCanvas: HTMLCanvasElement,
  options: ConvertOptions,
  charSet: string[],
): void {
  if (
    !Number.isInteger(sourceCanvas.width) ||
    !Number.isInteger(sourceCanvas.height) ||
    sourceCanvas.width <= 0 ||
    sourceCanvas.height <= 0
  ) {
    throw new Error("來源圖片尺寸無效");
  }
  if (sourceCanvas.width * sourceCanvas.height > MAX_SOURCE_PIXELS) {
    throw new Error(
      `來源圖片過大，最多支援 ${MAX_SOURCE_PIXELS.toLocaleString()} pixels`,
    );
  }
  if (!Number.isInteger(options.width) || options.width <= 0) {
    throw new Error("ASCII 寬度必須是正整數");
  }
  if (!charSet.length) throw new Error("字元集至少需要 1 個 grapheme");
  if (
    !Number.isFinite(options.charAspectRatio) ||
    options.charAspectRatio <= 0
  ) {
    throw new Error("字元寬高比必須大於 0");
  }
  if (
    !Number.isFinite(options.contrast) ||
    options.contrast < -100 ||
    options.contrast > 100
  ) {
    throw new Error("對比度必須介於 -100 至 100");
  }
  if (
    !Number.isFinite(options.brightness) ||
    options.brightness < -100 ||
    options.brightness > 100
  ) {
    throw new Error("亮度必須介於 -100 至 100");
  }
}

/**
 * 調整對比度與亮度
 */
function adjustColor(
  r: number,
  g: number,
  b: number,
  contrast: number,
  brightness: number,
): [number, number, number] {
  // 1. 調整亮度
  let nr = r + brightness;
  let ng = g + brightness;
  let nb = b + brightness;

  // 2. 調整對比度
  // 對比度公式: factor = (259 * (C + 255)) / (255 * (259 - C))
  if (contrast !== 0) {
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    nr = factor * (nr - 128) + 128;
    ng = factor * (ng - 128) + 128;
    nb = factor * (nb - 128) + 128;
  }

  // 限制在 0-255 區間
  return [
    Math.min(255, Math.max(0, nr)),
    Math.min(255, Math.max(0, ng)),
    Math.min(255, Math.max(0, nb)),
  ];
}

/**
 * 將 RGB 轉為灰階亮度 (0-255)
 */
function getLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * RGB 轉 Hex 字串
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const hex = Math.round(c).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 核心轉換函數：將傳入的 HTMLCanvasElement 上的影像轉換為 ASCII 資料
 */
export function convertImageToAscii(
  sourceCanvas: HTMLCanvasElement,
  options: ConvertOptions,
): ConvertResult {
  const imgW = sourceCanvas.width;
  const imgH = sourceCanvas.height;

  const charSet = getGraphemeCharset(options.charSet);
  validateOptions(sourceCanvas, options, charSet);

  const targetW = options.width;
  const targetH = Math.max(
    1,
    Math.round(targetW * (imgH / imgW) * options.charAspectRatio),
  );
  if (targetW * targetH > MAX_OUTPUT_CELLS) {
    throw new Error(
      `ASCII 輸出過大，最多支援 ${MAX_OUTPUT_CELLS.toLocaleString()} cells`,
    );
  }

  // 建立一個離屏 Canvas 用於重取樣圖片
  const offscreenCanvas = document.createElement("canvas");
  offscreenCanvas.width = targetW;
  offscreenCanvas.height = targetH;
  const ctx = offscreenCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("無法建立 2D 畫布上下文");
  }

  // 將來源影像縮小繪製到離屏 Canvas
  ctx.drawImage(sourceCanvas, 0, 0, targetW, targetH);
  const imgData = ctx.getImageData(0, 0, targetW, targetH);
  const data = imgData.data;

  const totalPixels = targetW * targetH;
  if (data.length < totalPixels * 4) throw new Error("圖片像素資料尺寸無效");
  const rValues = new Float32Array(totalPixels);
  const gValues = new Float32Array(totalPixels);
  const bValues = new Float32Array(totalPixels);

  const charSetLen = charSet.length;
  const asciiChars: string[] = [];
  const asciiColors: string[] = [];

  const background = DEFAULT_ALPHA_BACKGROUND;
  const getAdjustedRgb = (pixelIndex: number): [number, number, number] => {
    const idx = pixelIndex * 4;
    const alpha = data[idx + 3] / 255;
    const r = data[idx] * alpha + background[0] * (1 - alpha);
    const g = data[idx + 1] * alpha + background[1] * (1 - alpha);
    const b = data[idx + 2] * alpha + background[2] * (1 - alpha);
    return adjustColor(r, g, b, options.contrast, options.brightness);
  };

  for (let i = 0; i < totalPixels; i++) {
    const [ar, ag, ab] = getAdjustedRgb(i);
    rValues[i] = ar;
    gValues[i] = ag;
    bValues[i] = ab;
  }

  if (options.dither) {
    const lums = new Float32Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      lums[i] = getLuminance(rValues[i], gValues[i], bValues[i]);
    }

    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        const idx = y * targetW + x;
        const oldVal = lums[idx];

        const clampedVal = Math.min(255, Math.max(0, oldVal));
        const charIdx =
          charSetLen === 1
            ? 0
            : Math.min(
                charSetLen - 1,
                Math.round((clampedVal / 255) * (charSetLen - 1)),
              );
        const newVal =
          charSetLen === 1 ? 0 : (charIdx / (charSetLen - 1)) * 255;
        const err = oldVal - newVal;

        if (x + 1 < targetW) {
          lums[idx + 1] += err * (7 / 16);
        }
        // 左下方 (x - 1, y + 1)
        if (x - 1 >= 0 && y + 1 < targetH) {
          lums[idx + targetW - 1] += err * (3 / 16);
        }
        // 下方 (x, y + 1)
        if (y + 1 < targetH) {
          lums[idx + targetW] += err * (5 / 16);
        }
        // 右下方 (x + 1, y + 1)
        if (x + 1 < targetW && y + 1 < targetH) {
          lums[idx + targetW + 1] += err * (1 / 16);
        }

        asciiChars.push(charSet[charIdx]);
        if (options.colorMode === "original") {
          asciiColors.push(rgbToHex(rValues[idx], gValues[idx], bValues[idx]));
        }
      }
    }
  } else {
    for (let i = 0; i < totalPixels; i++) {
      const lum = getLuminance(rValues[i], gValues[i], bValues[i]);
      const clampedLum = Math.min(255, Math.max(0, lum));
      const charIdx =
        charSetLen === 1
          ? 0
          : Math.min(
              charSetLen - 1,
              Math.round((clampedLum / 255) * (charSetLen - 1)),
            );
      asciiChars.push(charSet[charIdx]);
      if (options.colorMode === "original") {
        asciiColors.push(rgbToHex(rValues[i], gValues[i], bValues[i]));
      }
    }
  }

  return {
    width: targetW,
    height: targetH,
    chars: asciiChars,
    colors: options.colorMode === "original" ? asciiColors : undefined,
  };
}

/**
 * 產生 TypeScript 導出程式碼，內嵌高效 Canvas 渲染播放器
 */
export function generateTsCode(
  result: ConvertResult,
  config: {
    colorMode: "monochrome" | "retro-green" | "retro-amber" | "original";
    animationType: "none" | "typewriter" | "matrix" | "jitter";
    scanlines: boolean;
    flicker: boolean;
  },
): string {
  // 將 ASCII 影像分行，並轉換為 JSON 格式
  if (
    !Number.isInteger(result.width) ||
    !Number.isInteger(result.height) ||
    result.width <= 0 ||
    result.height <= 0 ||
    result.chars.length !== result.width * result.height ||
    (result.colors !== undefined &&
      result.colors.length !== result.chars.length)
  ) {
    throw new Error("ASCII 結果尺寸或字元資料無效");
  }

  const lines: string[][] = [];
  for (let y = 0; y < result.height; y++) {
    lines.push(result.chars.slice(y * result.width, (y + 1) * result.width));
  }

  let colorDataStr = "undefined";
  if (result.colors && config.colorMode === "original") {
    // 壓縮顏色資料：使用調色盤
    const paletteMap = new Map<string, number>();
    const palette: string[] = [];
    const colorIndices: number[] = [];

    for (const color of result.colors) {
      let idx = paletteMap.get(color);
      if (idx === undefined) {
        idx = palette.length;
        palette.push(color);
        paletteMap.set(color, idx);
      }
      colorIndices.push(idx);
    }

    colorDataStr = `{
    palette: ${JSON.stringify(palette)},
    indices: [${colorIndices.join(",")}]
  }`;
  }

  return `/**
 * 由 daily-tools 產生的 ASCII 影像播放器與資料模組
 * 零依賴，純原生 Canvas 2D 實作。
 */

export interface AsciiOptions {
  fontSize?: number;        // 字型大小 (px)
  colorMode?: 'monochrome' | 'retro-green' | 'retro-amber' | 'original'; // 色彩模式
  animationType?: 'none' | 'typewriter' | 'matrix' | 'jitter'; // 動效模式
  fps?: number;             // 動畫更新速率
  scanlines?: boolean;      // 是否開啟 CRT 掃描線
  flicker?: boolean;        // 是否開啟 CRT 閃爍效果
  bgColor?: string;         // 背景色彩 (預設為深海藍 #0a1a2f)
  textColor?: string;       // 文字自訂色彩 (單色模式時生效)
}

// ASCII 影像大小
export const WIDTH = ${result.width};
export const HEIGHT = ${result.height};

// ASCII 字元矩陣資料 (每一行)
export const ASCII_ROWS: string[][] = ${JSON.stringify(lines, null, 2)};

// 影像顏色調色盤與索引 (彩色模式時使用)
export const COLOR_DATA: { palette: string[]; indices: number[] } | undefined = ${colorDataStr};

/**
 * 在傳入的 Canvas 上啟動 ASCII 動態渲染效果
 * @param canvas HTMLCanvasElement 標籤元素
 * @param customOptions 自訂配置選項
 * @returns 包含 destroy 控制函數的物件，用於在元件卸載時釋放動畫資源
 */
export function renderAscii(
  canvas: HTMLCanvasElement,
  customOptions: AsciiOptions = {}
) {
  // 合併預設與傳入設定
  const options: Required<AsciiOptions> = {
    fontSize: 12,
    colorMode: '${config.colorMode}',
    animationType: '${config.animationType}',
    fps: 30,
    scanlines: ${config.scanlines},
    flicker: ${config.flicker},
    bgColor: '#0a1a2f',
    textColor: '',
    ...customOptions
  };

  if (!canvas || typeof canvas.getContext !== 'function') {
    throw new TypeError('renderAscii requires an HTMLCanvasElement');
  }
  if (!Number.isFinite(options.fps) || options.fps <= 0 || options.fps > 120) {
    throw new RangeError('fps must be between 1 and 120');
  }
  if (!Number.isFinite(options.fontSize) || options.fontSize <= 0) {
    throw new RangeError('fontSize must be greater than 0');
  }
  if (!['monochrome', 'retro-green', 'retro-amber', 'original'].includes(options.colorMode)) {
    throw new RangeError('Unknown color mode');
  }
  if (!['none', 'typewriter', 'matrix', 'jitter'].includes(options.animationType)) {
    throw new RangeError('Unknown animation type');
  }
  if (ASCII_ROWS.length !== HEIGHT || ASCII_ROWS.some((row) => row.length !== WIDTH)) {
    throw new Error('ASCII_ROWS dimensions do not match WIDTH and HEIGHT');
  }

  // 初始化自訂顏色
  if (!options.textColor) {
    if (options.colorMode === 'retro-green') {
      options.textColor = '#3fe0c5'; // 復古薄荷綠
    } else if (options.colorMode === 'retro-amber') {
      options.textColor = '#f1b434'; // 復古琥珀色
    } else {
      options.textColor = '#e6f1ff'; // 預設白金色
    }
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable');
  }

  // 設定 Canvas 解析度（防鋸齒、高 DPI）
  const dpr = window.devicePixelRatio || 1;
  const charWidth = options.fontSize * 0.6; // 估計等寬字型寬度
  const charHeight = options.fontSize;

  const displayWidth = WIDTH * charWidth;
  const displayHeight = HEIGHT * charHeight;

  canvas.style.width = \`\${displayWidth}px\`;
  canvas.style.height = \`\${displayHeight}px\`;
  canvas.width = displayWidth * dpr;
  canvas.height = displayHeight * dpr;

  ctx.scale(dpr, dpr);
  ctx.textBaseline = 'top';
  ctx.font = \`\${options.fontSize}px VT323, "IBM Plex Mono", "Courier New", monospace\`;

  let animationId: number | undefined;
  let lastTime = 0;
  const frameInterval = 1000 / options.fps;
  const shouldAnimate = options.animationType !== 'none';

  // 動態效果專用狀態
  let typewriterIndex = 0; // 打字機印出的字元數
  const totalChars = WIDTH * HEIGHT;

  // 矩陣雨掉落進度列
  const matrixProgress = new Float32Array(WIDTH);
  for (let x = 0; x < WIDTH; x++) {
    matrixProgress[x] = -Math.floor(Math.random() * HEIGHT); // 隨機延遲掉落
  }

  let isDestroyed = false;

  function draw(timestamp: number) {
    if (isDestroyed) return;

    if (shouldAnimate) animationId = requestAnimationFrame(draw);

    if (shouldAnimate && timestamp - lastTime < frameInterval) return;
    lastTime = timestamp;

    // 1. 清除畫布，填滿背景色
    ctx.fillStyle = options.bgColor;
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // 2. 渲染 ASCII 字元
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        const charIdx = y * WIDTH + x;
        const char = ASCII_ROWS[y]?.[x] || ' ';

        if (char === ' ') continue;

        // 依據動畫類型決定該字元是否需要渲染，以及渲染的特殊外觀
        let shouldDraw = true;
        let opacity = 1.0;

        if (options.animationType === 'typewriter') {
          shouldDraw = charIdx <= typewriterIndex;
        } else if (options.animationType === 'matrix') {
          const dropY = matrixProgress[x];
          if (y > dropY) {
            shouldDraw = false;
          } else {
            // 越接近掉落頭部亮度越高，尾部淡出
            const dist = dropY - y;
            if (dist > 15) {
              shouldDraw = false;
            } else {
              opacity = Math.max(0.1, 1.0 - dist / 15);
            }
          }
        }

        if (!shouldDraw) continue;

        // 計算繪圖位置
        let renderX = x * charWidth;
        let renderY = y * charHeight;

        // 抖動動畫效果 (Jitter)
        if (options.animationType === 'jitter') {
          renderX += (Math.random() - 0.5) * 0.8;
          renderY += (Math.random() - 0.5) * 0.8;
        }

        // 決定色彩
        let fillStyle = options.textColor;
        if (options.colorMode === 'original' && COLOR_DATA) {
          const colorIdx = COLOR_DATA.indices[charIdx];
          const hex = COLOR_DATA.palette[colorIdx] || '#ffffff';
          fillStyle = hex;
        }

        // 套用透明度（矩陣雨用）
        if (opacity < 1.0) {
          ctx.save();
          ctx.globalAlpha = opacity;
        }

        ctx.fillStyle = fillStyle;
        ctx.fillText(char, renderX, renderY);

        if (opacity < 1.0) {
          ctx.restore();
        }
      }
    }

    // 更新動畫狀態
    if (options.animationType === 'typewriter') {
      typewriterIndex = Math.min(totalChars, typewriterIndex + Math.ceil(totalChars / 150));
    } else if (options.animationType === 'matrix') {
      for (let x = 0; x < WIDTH; x++) {
        matrixProgress[x] += 0.5; // 每訊框下落 0.5 個字元高
        if (matrixProgress[x] - 15 > HEIGHT) {
          matrixProgress[x] = -Math.floor(Math.random() * 10); // 重新循環
        }
      }
    }

    // 3. 繪製模擬 CRT 掃描線
    if (options.scanlines) {
      ctx.fillStyle = 'rgba(63, 224, 197, 0.05)';
      for (let y = 0; y < displayHeight; y += 4) {
        ctx.fillRect(0, y, displayWidth, 1.5);
      }
    }

    // 4. 繪製模擬 CRT 微幅閃爍
    if (options.flicker && Math.random() < 0.15) {
      ctx.fillStyle = 'rgba(63, 224, 197, 0.02)';
      ctx.fillRect(0, 0, displayWidth, displayHeight);
    }
  }

  if (shouldAnimate) animationId = requestAnimationFrame(draw);
  else draw(0);

  return {
    destroy: () => {
      isDestroyed = true;
      if (animationId !== undefined) cancelAnimationFrame(animationId);
    }
  };
}
`;
}
