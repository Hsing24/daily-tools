export type DitherAlgorithm = "floyd-steinberg" | "bayer";
export type DitherPalette = "monochrome" | "mint" | "amber" | "color";

export interface DitherSettings {
  algorithm: DitherAlgorithm;
  palette: DitherPalette;
  colors: 8 | 27 | 64;
  brightness: number;
  contrast: number;
  pixelSize: number;
}

export const DEFAULT_DITHER_SETTINGS: Readonly<DitherSettings> = {
  algorithm: "floyd-steinberg",
  palette: "monochrome",
  colors: 64,
  brightness: 0,
  contrast: 0,
  pixelSize: 1,
};

export const MAX_DITHER_PIXELS = 40_000_000;
export const MAX_DITHER_BYTES = 20 * 1024 * 1024;

export interface DitherRequest {
  id: number;
  data: ArrayBuffer;
  width: number;
  height: number;
  settings: DitherSettings;
}

export type DitherResponse =
  | {
      id: number;
      type: "done";
      data: ArrayBuffer;
      width: number;
      height: number;
    }
  | { id: number; type: "error" };

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
// Exported image colors are fixed, independent of the interface theme.
const PALETTES = {
  monochrome: [
    [0, 0, 0],
    [255, 255, 255],
  ],
  mint: [
    [10, 26, 47],
    [63, 224, 197],
  ],
  amber: [
    [10, 26, 47],
    [241, 180, 52],
  ],
} as const;

const clamp = (value: number) => Math.max(0, Math.min(255, value));

/** White composite → block average → tone adjustment → dither → nearest-neighbor. */
export function ditherRgba(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  settings: DitherSettings,
): Uint8ClampedArray {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1 ||
    width * height > MAX_DITHER_PIXELS ||
    pixels.length !== width * height * 4
  )
    throw new Error("圖片像素資料或尺寸無效。");
  if (
    !["floyd-steinberg", "bayer"].includes(settings.algorithm) ||
    !["monochrome", "mint", "amber", "color"].includes(settings.palette) ||
    ![8, 27, 64].includes(settings.colors) ||
    !Number.isFinite(settings.brightness) ||
    Math.abs(settings.brightness) > 100 ||
    !Number.isFinite(settings.contrast) ||
    Math.abs(settings.contrast) > 100 ||
    !Number.isFinite(settings.pixelSize) ||
    settings.pixelSize < 1 ||
    settings.pixelSize > 16
  )
    throw new Error("抖色設定超出可用範圍。");

  const size = settings.pixelSize;
  const columns = Math.ceil(width / size);
  const rows = Math.ceil(height / size);
  const color = settings.palette === "color";
  const channels = color ? 3 : 1;
  const levels = color ? Math.round(Math.cbrt(settings.colors)) : 2;
  const step = 255 / (levels - 1);
  const contrast = settings.contrast * 2.55;
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const adjust = (value: number) =>
    clamp(factor * (value - 128) + 128 + settings.brightness * 2.55);
  const output = new Uint8ClampedArray(pixels.length);
  const values = new Float64Array(3);
  const quantized = new Uint8ClampedArray(3);
  let current = new Float32Array(columns * channels);
  let next = new Float32Array(columns * channels);

  for (let y = 0; y < rows; y++) {
    const y0 = Math.floor(y * size);
    const y1 = Math.min(height, Math.floor((y + 1) * size));
    for (let x = 0; x < columns; x++) {
      const x0 = Math.floor(x * size);
      const x1 = Math.min(width, Math.floor((x + 1) * size));
      values.fill(0);
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * width + sx) * 4;
          const alpha = pixels[i + 3] / 255;
          for (let c = 0; c < 3; c++)
            values[c] += pixels[i + c] * alpha + 255 * (1 - alpha);
        }
      }
      const count = (x1 - x0) * (y1 - y0);
      for (let c = 0; c < 3; c++) values[c] = adjust(values[c] / count);
      if (!color)
        values[0] =
          values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
      const threshold =
        ((BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16 - 0.5) * step;
      for (let c = 0; c < channels; c++) {
        const index = x * channels + c;
        const value = clamp(
          values[c] +
            (settings.algorithm === "bayer" ? threshold : current[index]),
        );
        const result = Math.round(value / step) * step;
        quantized[c] = result;
        if (settings.algorithm === "floyd-steinberg") {
          const error = value - result;
          if (x + 1 < columns) current[index + channels] += (error * 7) / 16;
          if (y + 1 < rows) {
            if (x > 0) next[index - channels] += (error * 3) / 16;
            next[index] += (error * 5) / 16;
            if (x + 1 < columns) next[index + channels] += error / 16;
          }
        }
      }
      const rgb = color
        ? quantized
        : PALETTES[settings.palette as Exclude<DitherPalette, "color">][
            quantized[0] === 0 ? 0 : 1
          ];
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * width + sx) * 4;
          output[i] = rgb[0];
          output[i + 1] = rgb[1];
          output[i + 2] = rgb[2];
          output[i + 3] = 255;
        }
      }
    }
    [current, next] = [next, current];
    next.fill(0);
  }
  return output;
}
