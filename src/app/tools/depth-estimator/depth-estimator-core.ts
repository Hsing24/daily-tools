import { ColorMapType } from "./depth-estimator-types";

/**
 * 顏色 RGB 三元組 [r, g, b] (0~255)
 */
export type RGB = [number, number, number];

/**
 * Viridis 調色盤關鍵節點 (t: 0.0 ~ 1.0)
 */
const VIRIDIS_LUT: readonly RGB[] = [
  [68, 1, 84],
  [72, 35, 116],
  [64, 67, 135],
  [52, 94, 141],
  [41, 120, 142],
  [32, 144, 140],
  [34, 167, 132],
  [68, 190, 112],
  [121, 209, 81],
  [189, 222, 38],
  [253, 231, 37],
];

/**
 * Inferno 調色盤關鍵節點 (t: 0.0 ~ 1.0)
 */
const INFERNO_LUT: readonly RGB[] = [
  [0, 0, 4],
  [40, 11, 84],
  [101, 21, 110],
  [159, 42, 99],
  [212, 72, 66],
  [245, 125, 21],
  [250, 180, 29],
  [252, 255, 164],
];

/**
 * Turbo 調色盤關鍵節點 (t: 0.0 ~ 1.0)
 */
const TURBO_LUT: readonly RGB[] = [
  [48, 18, 59],
  [70, 134, 251],
  [27, 229, 181],
  [164, 252, 60],
  [251, 185, 56],
  [227, 68, 10],
  [122, 4, 3],
];

/**
 * Plasma 調色盤關鍵節點
 */
const PLASMA_LUT: readonly RGB[] = [
  [13, 8, 135],
  [84, 2, 163],
  [139, 10, 165],
  [185, 50, 137],
  [219, 92, 104],
  [244, 136, 73],
  [254, 188, 43],
  [240, 249, 33],
];

/**
 * Magma 調色盤關鍵節點
 */
const MAGMA_LUT: readonly RGB[] = [
  [0, 0, 4],
  [28, 16, 68],
  [79, 18, 123],
  [129, 37, 129],
  [181, 54, 122],
  [229, 89, 100],
  [251, 149, 110],
  [252, 253, 191],
];

/**
 * CoolWarm 調色盤關鍵節點
 */
const COOLWARM_LUT: readonly RGB[] = [
  [59, 76, 192],
  [108, 142, 241],
  [160, 197, 252],
  [212, 225, 243],
  [242, 220, 211],
  [244, 165, 130],
  [214, 96, 77],
  [180, 4, 38],
];

/**
 * 依據 LUT 表對 t (0.0 ~ 1.0) 做線性內插
 */
function interpolateLUT(lut: readonly RGB[], t: number): RGB {
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (lut.length - 1);
  const index = Math.floor(scaled);
  const frac = scaled - index;

  if (index >= lut.length - 1) {
    return lut[lut.length - 1] ?? [255, 255, 255];
  }

  const c1 = lut[index] ?? [0, 0, 0];
  const c2 = lut[index + 1] ?? [255, 255, 255];

  const r = Math.round(c1[0] + (c2[0] - c1[0]) * frac);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * frac);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * frac);

  return [r, g, b];
}

/**
 * 依據調色盤型別與深度值 (0.0 ~ 1.0) 計算對應 RGB 色彩
 */
export function getDepthColor(
  depth: number,
  colorMap: ColorMapType,
  invert = false
): RGB {
  let val = Math.max(0, Math.min(1, depth));
  if (invert) {
    val = 1 - val;
  }

  switch (colorMap) {
    case "grayscale": {
      const gray = Math.round(val * 255);
      return [gray, gray, gray];
    }
    case "viridis":
      return interpolateLUT(VIRIDIS_LUT, val);
    case "inferno":
      return interpolateLUT(INFERNO_LUT, val);
    case "turbo":
      return interpolateLUT(TURBO_LUT, val);
    case "plasma":
      return interpolateLUT(PLASMA_LUT, val);
    case "magma":
      return interpolateLUT(MAGMA_LUT, val);
    case "coolwarm":
      return interpolateLUT(COOLWARM_LUT, val);
    default: {
      const gray = Math.round(val * 255);
      return [gray, gray, gray];
    }
  }
}

export function createCompatibleImageData(
  width: number,
  height: number
): ImageData {
  if (typeof ImageData !== "undefined") {
    return new ImageData(width, height);
  }
  return {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
    colorSpace: "srgb",
  } as ImageData;
}

/**
 * 將深度浮點數陣列轉為 ImageData
 */
export function depthArrayToImageData(
  depthArray: Float32Array,
  width: number,
  height: number,
  options: {
    colorMap: ColorMapType;
    invert?: boolean;
    contrast?: number; // 0.5 ~ 2.0, default 1.0
    brightness?: number; // -0.5 ~ 0.5, default 0
  }
): ImageData {
  const { colorMap, invert = false, contrast = 1.0, brightness = 0.0 } = options;
  const imageData = createCompatibleImageData(width, height);
  const data = imageData.data;
  const total = width * height;

  for (let i = 0; i < total; i++) {
    const rawVal = depthArray[i] ?? 0;
    // 調整對比度與亮度: (val - 0.5) * contrast + 0.5 + brightness
    let adj = (rawVal - 0.5) * contrast + 0.5 + brightness;
    adj = Math.max(0, Math.min(1, adj));

    const [r, g, b] = getDepthColor(adj, colorMap, invert);
    const pixelIndex = i * 4;
    data[pixelIndex] = r;
    data[pixelIndex + 1] = g;
    data[pixelIndex + 2] = b;
    data[pixelIndex + 3] = 255;
  }

  return imageData;
}

/**
 * 將深度圖匯出為 3D Wavefront .OBJ 格式字串
 * 支援透過 step 降取樣以控制頂點與面數
 */
export function exportDepthToObj(
  depthArray: Float32Array,
  width: number,
  height: number,
  options?: {
    step?: number; // 降取樣步長，預設 2 (減少面數加速下載)
    depthScale?: number; // 深度擠壓比例，預設 0.25
    invert?: boolean;
  }
): string {
  const step = Math.max(1, Math.floor(options?.step ?? 2));
  const depthScale = options?.depthScale ?? 0.25;
  const invert = options?.invert ?? false;

  const cols = Math.floor((width - 1) / step) + 1;
  const rows = Math.floor((height - 1) / step) + 1;

  const lines: string[] = [
    "# Wavefront OBJ exported from daily-tools Depth Estimator",
    `# Dimensions: ${width}x${height}, Grid: ${cols}x${rows}`,
    "o DepthMesh",
  ];

  const aspect = width / height;

  // 頂點 (v) 與 UV (vt)
  for (let r = 0; r < rows; r++) {
    const yPixel = Math.min(r * step, height - 1);
    const vCoord = 1.0 - yPixel / (height - 1);
    const yWorld = (vCoord - 0.5) * 2.0;

    for (let c = 0; c < cols; c++) {
      const xPixel = Math.min(c * step, width - 1);
      const uCoord = xPixel / (width - 1);
      const xWorld = (uCoord - 0.5) * 2.0 * aspect;

      const idx = yPixel * width + xPixel;
      let d = depthArray[idx] ?? 0;
      if (invert) d = 1.0 - d;
      const zWorld = d * depthScale;

      lines.push(`v ${xWorld.toFixed(4)} ${yWorld.toFixed(4)} ${zWorld.toFixed(4)}`);
      lines.push(`vt ${uCoord.toFixed(4)} ${vCoord.toFixed(4)}`);
    }
  }

  // 面 (f v1/vt1 v2/vt2 v3/vt3) (三角形網格)
  lines.push("s 1");
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      // 頂點編號從 1 開始
      const p1 = r * cols + c + 1;
      const p2 = r * cols + (c + 1) + 1;
      const p3 = (r + 1) * cols + (c + 1) + 1;
      const p4 = (r + 1) * cols + c + 1;

      // 兩個三角形構建一個四邊格網
      lines.push(`f ${p1}/${p1} ${p2}/${p2} ${p3}/${p3}`);
      lines.push(`f ${p1}/${p1} ${p3}/${p3} ${p4}/${p4}`);
    }
  }

  return lines.join("\n");
}

/**
 * 產生合成測試幾何深度圖 (供範例展示與單元測試使用)
 */
export function generateSampleDepthMap(width = 256, height = 256): {
  depthArray: Float32Array;
  imageCanvas: HTMLCanvasElement;
} {
  const depthArray = new Float32Array(width * height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (ctx && typeof ctx.fillRect === "function") {
    // 繪製背景
    ctx.fillStyle = "#15263F";
    ctx.fillRect(0, 0, width, height);

    // 繪製前景球體
    if (typeof ctx.createRadialGradient === "function") {
      const grad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        10,
        width * 0.5,
        height * 0.5,
        width * 0.35
      );
      grad.addColorStop(0, "#3FE0C5");
      grad.addColorStop(0.7, "#2BAE96");
      grad.addColorStop(1, "#15263F");
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = "#3FE0C5";
    }

    if (typeof ctx.beginPath === "function" && typeof ctx.arc === "function") {
      ctx.beginPath();
      ctx.arc(width * 0.5, height * 0.5, width * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.38;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = y * width + x;

      // 背景平面線性漸層 (遠方 0.1 ~ 0.3)
      const bgDepth = 0.1 + 0.2 * (y / height);

      if (dist < radius) {
        // 球體凸面深度: z = sqrt(R^2 - d^2)
        const sphereZ = Math.sqrt(radius * radius - dist * dist) / radius;
        depthArray[idx] = Math.min(1.0, 0.35 + sphereZ * 0.65);
      } else {
        depthArray[idx] = bgDepth;
      }
    }
  }

  return { depthArray, imageCanvas: canvas };
}
