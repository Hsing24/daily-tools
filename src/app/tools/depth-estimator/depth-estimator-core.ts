import { ColorMapType } from "./depth-estimator-types";
import { zlibSync } from "fflate";

export const MAX_DEPTH_IMAGE_PIXELS = 40_000_000;
export const MAX_UINT16_VERTICES = 65_535;

export type GlbImageMimeType = "image/jpeg" | "image/png" | "image/webp";

const GLB_IMAGE_MIME_TYPES: readonly GlbImageMimeType[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function assertPositiveDimensions(
  width: number,
  height: number,
  label: string,
): void {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1
  ) {
    throw new Error(`${label} 尺寸必須是正整數`);
  }
}

function assertDepthDimensions(
  depthArray: Float32Array,
  width: number,
  height: number,
): void {
  assertPositiveDimensions(width, height, "深度資料");
  if (width * height !== depthArray.length) {
    throw new Error("深度資料尺寸與影像尺寸不符");
  }
}

function clampDepth(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function hasPrefix(bytes: Uint8Array, prefix: readonly number[]): boolean {
  return prefix.every((value, index) => bytes[index] === value);
}

/** 依檔頭辨識 GLB 可內嵌的圖片格式。 */
export function detectGlbImageMimeType(
  imageBytes: Uint8Array,
): GlbImageMimeType | null {
  if (hasPrefix(imageBytes, [137, 80, 78, 71, 13, 10, 26, 10])) {
    return "image/png";
  }
  if (hasPrefix(imageBytes, [255, 216])) {
    return "image/jpeg";
  }
  if (
    imageBytes.length >= 12 &&
    hasPrefix(imageBytes, [82, 73, 70, 70]) &&
    hasPrefix(imageBytes.subarray(8), [87, 69, 66, 80])
  ) {
    return "image/webp";
  }
  return null;
}

function assertGlbImage(
  imageBytes: Uint8Array,
  imageMimeType: GlbImageMimeType,
): void {
  if (!GLB_IMAGE_MIME_TYPES.includes(imageMimeType)) {
    throw new Error("GLB 貼圖只支援 JPEG、PNG 或 WebP");
  }
  const detectedMimeType = detectGlbImageMimeType(imageBytes);
  if (detectedMimeType !== imageMimeType) {
    throw new Error("GLB 貼圖格式與檔案內容不一致");
  }
}

export interface MeshGridDimensions {
  readonly cols: number;
  readonly rows: number;
  readonly vertices: number;
}

/** 以 Uint16 index 可表達的頂點數上限，找出安全的預覽降採樣網格。 */
export function getSafePreviewGrid(
  width: number,
  height: number,
  initialStep = 2,
): MeshGridDimensions & { readonly step: number } {
  assertPositiveDimensions(width, height, "預覽網格");
  let step = Number.isFinite(initialStep)
    ? Math.max(1, Math.floor(initialStep))
    : 2;
  let cols = Math.floor((width - 1) / step) + 1;
  let rows = Math.floor((height - 1) / step) + 1;

  while (cols * rows > MAX_UINT16_VERTICES && step < Math.max(width, height)) {
    step += 1;
    cols = Math.floor((width - 1) / step) + 1;
    rows = Math.floor((height - 1) / step) + 1;
  }

  return { step, cols, rows, vertices: cols * rows };
}

function getBoundedExportGrid(
  width: number,
  height: number,
  maxGridDimension: number,
): MeshGridDimensions {
  const aspect = width / height;
  let cols = Math.max(2, Math.round(maxGridDimension * Math.min(1, aspect)));
  let rows = Math.max(
    2,
    Math.round(maxGridDimension * Math.min(1, 1 / aspect)),
  );
  const vertexCount = cols * rows;

  if (vertexCount > MAX_UINT16_VERTICES) {
    const scale = Math.sqrt(MAX_UINT16_VERTICES / vertexCount);
    cols = Math.max(2, Math.floor(cols * scale));
    rows = Math.max(2, Math.floor(rows * scale));
    while (cols * rows > MAX_UINT16_VERTICES) {
      if (cols >= rows) cols--;
      else rows--;
    }
  }

  return { cols, rows, vertices: cols * rows };
}

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
  invert = false,
): RGB {
  let val = clampDepth(depth);
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
  height: number,
): ImageData {
  assertPositiveDimensions(width, height, "ImageData");
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
  },
): ImageData {
  assertDepthDimensions(depthArray, width, height);
  const {
    colorMap,
    invert = false,
    contrast = 1.0,
    brightness = 0.0,
  } = options;
  const imageData = createCompatibleImageData(width, height);
  const data = imageData.data;
  const total = width * height;

  for (let i = 0; i < total; i++) {
    const rawVal = clampDepth(depthArray[i]);
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

export interface DepthAdjustments {
  readonly invert?: boolean;
  readonly contrast?: number;
  readonly brightness?: number;
}

/** 對深度數值套用會影響資料語意的調整。 */
export function adjustDepthArray(
  depthArray: Float32Array,
  options: DepthAdjustments = {},
): Float32Array {
  if (depthArray.length === 0) return new Float32Array();
  const contrast = options.contrast ?? 1;
  const brightness = options.brightness ?? 0;
  const invert = options.invert ?? false;
  const output = new Float32Array(depthArray.length);

  for (let i = 0; i < depthArray.length; i++) {
    const raw = clampDepth(depthArray[i]);
    const adjusted = Math.max(
      0,
      Math.min(1, (raw - 0.5) * contrast + 0.5 + brightness),
    );
    output[i] = invert ? 1 - adjusted : adjusted;
  }

  return output;
}

/** 以雙線性取樣調整深度圖尺寸，保留 float 精度。 */
export function resizeDepthArray(
  depthArray: Float32Array,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): Float32Array {
  assertDepthDimensions(depthArray, sourceWidth, sourceHeight);
  assertPositiveDimensions(targetWidth, targetHeight, "目標深度圖");
  if (sourceWidth === targetWidth && sourceHeight === targetHeight) {
    return depthArray.slice();
  }

  const output = new Float32Array(targetWidth * targetHeight);
  const scaleX = sourceWidth / targetWidth;
  const scaleY = sourceHeight / targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    const sourceY = Math.max(
      0,
      Math.min(sourceHeight - 1, (y + 0.5) * scaleY - 0.5),
    );
    const y0 = Math.floor(sourceY);
    const y1 = Math.min(sourceHeight - 1, y0 + 1);
    const fy = sourceY - y0;

    for (let x = 0; x < targetWidth; x++) {
      const sourceX = Math.max(
        0,
        Math.min(sourceWidth - 1, (x + 0.5) * scaleX - 0.5),
      );
      const x0 = Math.floor(sourceX);
      const x1 = Math.min(sourceWidth - 1, x0 + 1);
      const fx = sourceX - x0;
      const top =
        clampDepth(depthArray[y0 * sourceWidth + x0]) * (1 - fx) +
        clampDepth(depthArray[y0 * sourceWidth + x1]) * fx;
      const bottom =
        clampDepth(depthArray[y1 * sourceWidth + x0]) * (1 - fx) +
        clampDepth(depthArray[y1 * sourceWidth + x1]) * fx;
      output[y * targetWidth + x] = top * (1 - fy) + bottom * fy;
    }
  }

  return output;
}

function boxBlurHorizontal(
  input: Float32Array,
  width: number,
  height: number,
  radius: number,
): Float32Array {
  const output = new Float32Array(input.length);
  const size = radius * 2 + 1;

  for (let y = 0; y < height; y++) {
    const row = y * width;
    let sum = 0;
    for (let offset = -radius; offset <= radius; offset++) {
      sum += input[row + Math.max(0, Math.min(width - 1, offset))] ?? 0;
    }

    for (let x = 0; x < width; x++) {
      output[row + x] = sum / size;
      const removeX = Math.max(0, x - radius);
      const addX = Math.min(width - 1, x + radius + 1);
      sum += (input[row + addX] ?? 0) - (input[row + removeX] ?? 0);
    }
  }

  return output;
}

function boxBlurVertical(
  input: Float32Array,
  width: number,
  height: number,
  radius: number,
): Float32Array {
  const output = new Float32Array(input.length);
  const size = radius * 2 + 1;

  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let offset = -radius; offset <= radius; offset++) {
      sum += input[Math.max(0, Math.min(height - 1, offset)) * width + x] ?? 0;
    }

    for (let y = 0; y < height; y++) {
      output[y * width + x] = sum / size;
      const removeY = Math.max(0, y - radius);
      const addY = Math.min(height - 1, y + radius + 1);
      sum += (input[addY * width + x] ?? 0) - (input[removeY * width + x] ?? 0);
    }
  }

  return output;
}

/** 三次 box blur 近似 Gaussian blur；邊界採 clamp，不引入黑邊。 */
export function gaussianBlurDepthArray(
  depthArray: Float32Array,
  width: number,
  height: number,
  radius: number,
): Float32Array {
  assertDepthDimensions(depthArray, width, height);
  if (radius <= 0) return depthArray.slice();

  const sigma = Math.max(0.01, radius / 2);
  const boxCount = 3;
  const idealWidth = Math.sqrt((12 * sigma * sigma) / boxCount + 1);
  let lowerWidth = Math.floor(idealWidth);
  if (lowerWidth % 2 === 0) lowerWidth--;
  const upperWidth = lowerWidth + 2;
  const lowerCount = Math.round(
    (12 * sigma * sigma -
      boxCount * lowerWidth * lowerWidth -
      4 * boxCount * lowerWidth -
      3 * boxCount) /
      (-4 * lowerWidth - 4),
  );
  const radii = Array.from({ length: boxCount }, (_, index) =>
    Math.max(
      0,
      Math.floor(((index < lowerCount ? lowerWidth : upperWidth) - 1) / 2),
    ),
  );

  let output: Float32Array<ArrayBufferLike> = depthArray.slice();
  for (const boxRadius of radii) {
    if (boxRadius === 0) continue;
    output = boxBlurVertical(
      boxBlurHorizontal(output, width, height, boxRadius),
      width,
      height,
      boxRadius,
    );
  }
  return output;
}

export function prepareDepthForExport(
  depthArray: Float32Array,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  options: DepthAdjustments & { readonly blurPercent?: number },
): Float32Array {
  assertDepthDimensions(depthArray, sourceWidth, sourceHeight);
  assertPositiveDimensions(targetWidth, targetHeight, "目標深度圖");
  const resized = resizeDepthArray(
    depthArray,
    sourceWidth,
    sourceHeight,
    targetWidth,
    targetHeight,
  );
  const adjusted = adjustDepthArray(resized, options);
  const blurRadius = targetWidth * ((options.blurPercent ?? 0) / 100);
  return gaussianBlurDepthArray(
    adjusted,
    targetWidth,
    targetHeight,
    blurRadius,
  );
}

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
let crcTable: Uint32Array | null = null;

function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let value = n;
    for (let bit = 0; bit < 8; bit++) {
      value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    crcTable[n] = value >>> 0;
  }
  return crcTable;
}

function crc32(bytes: Uint8Array): number {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (table[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint32(target: Uint8Array, offset: number, value: number): void {
  target[offset] = (value >>> 24) & 0xff;
  target[offset + 1] = (value >>> 16) & 0xff;
  target[offset + 2] = (value >>> 8) & 0xff;
  target[offset + 3] = value & 0xff;
}

function createPngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const chunk = new Uint8Array(data.length + 12);
  writeUint32(chunk, 0, data.length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  writeUint32(
    chunk,
    data.length + 8,
    crc32(chunk.subarray(4, data.length + 8)),
  );
  return chunk;
}

function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function createTextChunk(keyword: string, value: string): Uint8Array {
  return createPngChunk(
    "tEXt",
    new TextEncoder().encode(`${keyword}\0${value}`),
  );
}

/** 編碼單通道 8/16-bit PNG。16-bit 樣本依 PNG 規格使用 big-endian。 */
export async function encodeGrayscalePng(
  depthArray: Float32Array,
  width: number,
  height: number,
  bitDepth: 8 | 16,
  metadata?: {
    readonly minDepth: number;
    readonly maxDepth: number;
    readonly invert?: boolean;
    readonly contrast?: number;
    readonly brightness?: number;
    readonly blurPercent?: number;
  },
): Promise<Uint8Array> {
  assertDepthDimensions(depthArray, width, height);

  const bytesPerSample = bitDepth / 8;
  const stride = width * bytesPerSample + 1;
  const scanlines = new Uint8Array(stride * height);
  const maxSample = bitDepth === 16 ? 65535 : 255;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * stride;
    scanlines[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const value = clampDepth(depthArray[y * width + x]);
      const sample = Math.round(value * maxSample);
      const offset = rowOffset + 1 + x * bytesPerSample;
      if (bitDepth === 16) {
        scanlines[offset] = sample >>> 8;
        scanlines[offset + 1] = sample & 0xff;
      } else {
        scanlines[offset] = sample;
      }
    }
  }

  const compressed = zlibSync(scanlines);

  const ihdr = new Uint8Array(13);
  writeUint32(ihdr, 0, width);
  writeUint32(ihdr, 4, height);
  ihdr[8] = bitDepth;
  ihdr[9] = 0;

  const chunks: Uint8Array[] = [PNG_SIGNATURE, createPngChunk("IHDR", ihdr)];
  if (metadata) {
    chunks.push(
      createTextChunk("DepthMin", String(metadata.minDepth)),
      createTextChunk("DepthMax", String(metadata.maxDepth)),
      createTextChunk(
        "DepthUnits",
        "normalized relative disparity (0..1; not metres)",
      ),
      createTextChunk("DepthBitDepth", `${bitDepth}-bit unsigned integer`),
      createTextChunk("DepthInvert", String(metadata.invert ?? false)),
      createTextChunk("DepthContrast", String(metadata.contrast ?? 1)),
      createTextChunk("DepthBrightness", String(metadata.brightness ?? 0)),
      createTextChunk("DepthBlurPercent", String(metadata.blurPercent ?? 0)),
    );
  }
  chunks.push(
    createPngChunk("IDAT", compressed),
    createPngChunk("IEND", new Uint8Array()),
  );
  return concatBytes(chunks);
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
    maxGridDimension?: number;
    sourceDimensions?: { readonly width: number; readonly height: number };
  },
): string {
  assertDepthDimensions(depthArray, width, height);
  const step = Math.max(1, Math.floor(options?.step ?? 2));
  const depthScale = options?.depthScale ?? 0.25;
  const invert = options?.invert ?? false;
  const dimensions = options?.sourceDimensions ?? { width, height };
  const maxGridDimension = options?.maxGridDimension;
  const aspect = dimensions.width / dimensions.height;
  const cols = maxGridDimension
    ? Math.max(2, Math.round(maxGridDimension * Math.min(1, aspect)))
    : Math.floor((width - 1) / step) + 1;
  const rows = maxGridDimension
    ? Math.max(2, Math.round(maxGridDimension * Math.min(1, 1 / aspect)))
    : Math.floor((height - 1) / step) + 1;

  const lines: string[] = [
    "# Wavefront OBJ exported from daily-tools Depth Estimator",
    `# Dimensions: ${dimensions.width}x${dimensions.height}, Grid: ${cols}x${rows}`,
    "o DepthMesh",
  ];

  // 頂點 (v) 與 UV (vt)
  for (let r = 0; r < rows; r++) {
    const yPixel = maxGridDimension
      ? Math.round((r / (rows - 1)) * (height - 1))
      : Math.min(r * step, height - 1);
    const vCoord = 1.0 - r / (rows - 1);
    const yWorld = (vCoord - 0.5) * 2.0;

    for (let c = 0; c < cols; c++) {
      const xPixel = maxGridDimension
        ? Math.round((c / (cols - 1)) * (width - 1))
        : Math.min(c * step, width - 1);
      const uCoord = c / (cols - 1);
      const xWorld = (uCoord - 0.5) * 2.0 * aspect;

      const idx = yPixel * width + xPixel;
      let d = clampDepth(depthArray[idx]);
      if (invert) d = 1.0 - d;
      const zWorld = d * depthScale;

      lines.push(
        `v ${xWorld.toFixed(4)} ${yWorld.toFixed(4)} ${zWorld.toFixed(4)}`,
      );
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

function align4(value: number): number {
  return (value + 3) & ~3;
}

/** 建立含原圖貼圖的二進位 glTF 2.0 深度網格。 */
export function exportDepthToGlb(
  depthArray: Float32Array,
  width: number,
  height: number,
  imageBytes: Uint8Array,
  imageMimeType: GlbImageMimeType,
  options?: {
    readonly maxGridDimension?: number;
    readonly depthScale?: number;
    readonly sourceDimensions?: {
      readonly width: number;
      readonly height: number;
    };
  },
): Uint8Array {
  assertDepthDimensions(depthArray, width, height);
  assertGlbImage(imageBytes, imageMimeType);
  const dimensions = options?.sourceDimensions ?? { width, height };
  assertPositiveDimensions(dimensions.width, dimensions.height, "原圖");
  const requestedGridDimension = options?.maxGridDimension ?? 192;
  if (!Number.isFinite(requestedGridDimension) || requestedGridDimension < 2) {
    throw new Error("GLB 網格尺寸無效");
  }
  const maxGridDimension = Math.max(2, Math.floor(requestedGridDimension));
  const depthScale = options?.depthScale ?? 0.25;
  if (!Number.isFinite(depthScale)) {
    throw new Error("GLB 深度比例無效");
  }
  const aspect = dimensions.width / dimensions.height;
  const {
    cols,
    rows,
    vertices: vertexCount,
  } = getBoundedExportGrid(
    dimensions.width,
    dimensions.height,
    maxGridDimension,
  );

  const positions = new Float32Array(vertexCount * 3);
  const texCoords = new Float32Array(vertexCount * 2);
  const indices = new Uint16Array((cols - 1) * (rows - 1) * 6);
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let row = 0; row < rows; row++) {
    const v = row / (rows - 1);
    const sourceY = Math.round(v * (height - 1));
    for (let col = 0; col < cols; col++) {
      const u = col / (cols - 1);
      const sourceX = Math.round(u * (width - 1));
      const depth =
        clampDepth(depthArray[sourceY * width + sourceX]) * depthScale;
      const vertex = row * cols + col;
      positions[vertex * 3] = (u - 0.5) * 2 * aspect;
      positions[vertex * 3 + 1] = (0.5 - v) * 2;
      positions[vertex * 3 + 2] = depth;
      texCoords[vertex * 2] = u;
      texCoords[vertex * 2 + 1] = v;
      minZ = Math.min(minZ, depth);
      maxZ = Math.max(maxZ, depth);
    }
  }

  let index = 0;
  for (let row = 0; row < rows - 1; row++) {
    for (let col = 0; col < cols - 1; col++) {
      const topLeft = row * cols + col;
      const topRight = topLeft + 1;
      const bottomLeft = (row + 1) * cols + col;
      const bottomRight = bottomLeft + 1;
      indices[index++] = topLeft;
      indices[index++] = bottomLeft;
      indices[index++] = topRight;
      indices[index++] = topRight;
      indices[index++] = bottomLeft;
      indices[index++] = bottomRight;
    }
  }

  const positionBytes = new Uint8Array(positions.buffer);
  const texCoordBytes = new Uint8Array(texCoords.buffer);
  const indexBytes = new Uint8Array(indices.buffer);
  const positionOffset = 0;
  const texCoordOffset = align4(positionBytes.length);
  const indexOffset = align4(texCoordOffset + texCoordBytes.length);
  const imageOffset = align4(indexOffset + indexBytes.length);
  const binaryLength = align4(imageOffset + imageBytes.length);
  const binary = new Uint8Array(binaryLength);
  binary.set(positionBytes, positionOffset);
  binary.set(texCoordBytes, texCoordOffset);
  binary.set(indexBytes, indexOffset);
  binary.set(imageBytes, imageOffset);

  const usesWebp = imageMimeType === "image/webp";
  const gltf = {
    asset: { version: "2.0", generator: "daily-tools Depth Estimator" },
    extensionsUsed: [
      "KHR_materials_unlit",
      ...(usesWebp ? ["EXT_texture_webp"] : []),
    ],
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: "DepthMesh" }],
    meshes: [
      {
        name: "DepthMesh",
        primitives: [
          {
            attributes: { POSITION: 0, TEXCOORD_0: 1 },
            indices: 2,
            material: 0,
          },
        ],
      },
    ],
    materials: [
      {
        name: "SourceImage",
        doubleSided: true,
        extensions: { KHR_materials_unlit: {} },
        pbrMetallicRoughness: {
          baseColorTexture: { index: 0 },
          metallicFactor: 0,
          roughnessFactor: 1,
        },
      },
    ],
    textures: [
      usesWebp
        ? { sampler: 0, extensions: { EXT_texture_webp: { source: 0 } } }
        : { sampler: 0, source: 0 },
    ],
    samplers: [
      { magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 },
    ],
    images: [{ bufferView: 3, mimeType: imageMimeType, name: "SourceImage" }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: vertexCount,
        type: "VEC3",
        min: [-aspect, -1, minZ],
        max: [aspect, 1, maxZ],
      },
      {
        bufferView: 1,
        componentType: 5126,
        count: vertexCount,
        type: "VEC2",
        min: [0, 0],
        max: [1, 1],
      },
      {
        bufferView: 2,
        componentType: 5123,
        count: indices.length,
        type: "SCALAR",
        min: [0],
        max: [vertexCount - 1],
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: positionOffset,
        byteLength: positionBytes.length,
        target: 34962,
      },
      {
        buffer: 0,
        byteOffset: texCoordOffset,
        byteLength: texCoordBytes.length,
        target: 34962,
      },
      {
        buffer: 0,
        byteOffset: indexOffset,
        byteLength: indexBytes.length,
        target: 34963,
      },
      { buffer: 0, byteOffset: imageOffset, byteLength: imageBytes.length },
    ],
    buffers: [{ byteLength: binary.length }],
  };

  const jsonBytes = new TextEncoder().encode(JSON.stringify(gltf));
  const jsonLength = align4(jsonBytes.length);
  const totalLength = 12 + 8 + jsonLength + 8 + binary.length;
  const glb = new Uint8Array(totalLength);
  const view = new DataView(glb.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, totalLength, true);
  view.setUint32(12, jsonLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  glb.fill(0x20, 20, 20 + jsonLength);
  glb.set(jsonBytes, 20);
  const binaryHeader = 20 + jsonLength;
  view.setUint32(binaryHeader, binary.length, true);
  view.setUint32(binaryHeader + 4, 0x004e4942, true);
  glb.set(binary, binaryHeader + 8);
  return glb;
}

/**
 * 產生合成測試幾何深度圖 (供範例展示與單元測試使用)
 */
export function generateSampleDepthMap(
  width = 256,
  height = 256,
): {
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
        width * 0.35,
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
