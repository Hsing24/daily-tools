import { zipSync } from "fflate";

/** 支援的輸出格式 */
export type OutputFormat = "png" | "jpeg" | "webp" | "avif";

/** 格式對應的 MIME type */
export const FORMAT_MIME: Record<OutputFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  avif: "image/avif",
};

/** 格式中文顯示名稱 */
export const FORMAT_LABELS: Record<OutputFormat, string> = {
  png: "PNG",
  jpeg: "JPEG",
  webp: "WebP",
  avif: "AVIF",
};

export const SUPPORTED_INPUT_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
]);

export const MAX_IMAGE_PIXELS = 40_000_000;
const OUTPUT_FORMAT_PRIORITY: OutputFormat[] = ["webp", "avif", "jpeg", "png"];

/** 是否為有損格式（支援品質滑桿） */
export function isLossyFormat(format: OutputFormat): boolean {
  return format === "jpeg" || format === "webp" || format === "avif";
}

/** 預設品質值 (0-1 scale) */
export const DEFAULT_QUALITY = 0.85;

/** 單張圖片的轉換狀態 */
export interface ImageItem {
  readonly id: string;
  readonly file: File;
  readonly previewUrl: string;
  readonly width: number;
  readonly height: number;
  readonly revision: number;
  outputFormat: OutputFormat;
  quality: number;
  status: "pending" | "converting" | "done" | "error";
  resultBlob: Blob | null;
  resultUrl: string;
  errorMessage: string;
}

/** 產生唯一 ID */
export function generateId(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).substring(2, 15);
}

export function isOutputFormat(value: string): value is OutputFormat {
  return value in FORMAT_MIME;
}

export function isSupportedInputFile(file: File): boolean {
  return SUPPORTED_INPUT_MIMES.has(file.type.toLowerCase());
}

export function getDefaultOutputFormat(
  supportedFormats: ReadonlySet<OutputFormat>,
): OutputFormat {
  return (
    OUTPUT_FORMAT_PRIORITY.find((format) => supportedFormats.has(format)) ??
    "png"
  );
}

/** 格式化檔案大小 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** 計算實際壓縮比 (%) */
export function compressionRatio(
  originalSize: number,
  resultSize: number,
): string {
  if (originalSize === 0) return "—";
  const ratio = 1 - resultSize / originalSize;
  if (ratio < 0) return `+${Math.abs(ratio * 100).toFixed(1)}%`;
  return `-${(ratio * 100).toFixed(1)}%`;
}

/** 有損格式只能在實際編碼後計算壓縮比 */
export function estimatedRatio(format: OutputFormat, _quality: number): string {
  return isLossyFormat(format) ? "轉換後計算" : "— (lossless)";
}

/** 將 File 載入為 HTMLImageElement 並取得寬高 */
export function loadImage(
  file: File,
): Promise<{ img: HTMLImageElement; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (!isSupportedInputFile(file)) {
      reject(new Error(`不支援的圖片格式：${file.type || "未知"}`));
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    const cleanup = (): void => URL.revokeObjectURL(url);

    img.onload = () => {
      cleanup();
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      if (!width || !height || width * height > MAX_IMAGE_PIXELS) {
        reject(
          new Error(
            `圖片尺寸過大，最多支援 ${MAX_IMAGE_PIXELS.toLocaleString()} pixels`,
          ),
        );
        return;
      }
      resolve({ img, width, height });
    };
    img.onerror = () => {
      cleanup();
      reject(new Error(`無法載入圖片: ${file.name}`));
    };
    img.src = url;
  });
}

/** 使用 Canvas 將圖片轉換為指定格式的 Blob */
export function convertImage(
  img: HTMLImageElement,
  format: OutputFormat,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!isOutputFormat(format)) {
      reject(new Error("不支援的輸出格式"));
      return;
    }
    if (!Number.isFinite(quality) || quality < 0 || quality > 100) {
      reject(new Error("品質必須介於 0 至 100"));
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas 2D context 不可用"));
      return;
    }

    if (format === "jpeg") {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0);
    const mime = FORMAT_MIME[format];
    const q = isLossyFormat(format) ? quality / 100 : undefined;

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(
            new Error(`轉換失敗：瀏覽器不支援 ${FORMAT_LABELS[format]} 編碼`),
          );
        } else if (blob.type.toLowerCase() !== mime) {
          reject(
            new Error(
              `轉換失敗：瀏覽器將 ${FORMAT_LABELS[format]} fallback 為 ${blob.type || "未知格式"}`,
            ),
          );
        } else {
          resolve(blob);
        }
      },
      mime,
      q,
    );
  });
}

/** 檢測瀏覽器是否支援指定格式的 Canvas 編碼 */
export function checkFormatSupport(format: OutputFormat): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      canvas.toBlob(
        (blob) => resolve(blob?.type.toLowerCase() === FORMAT_MIME[format]),
        FORMAT_MIME[format],
        0.5,
      );
    } catch {
      resolve(false);
    }
  });
}

/** 產生輸出檔名 */
export function outputFileName(
  originalName: string,
  format: OutputFormat,
): string {
  const baseName = originalName.replace(/\.[^/.]+$/, "");
  return `${baseName}.${format === "jpeg" ? "jpg" : format}`;
}

export interface ZipFileEntry {
  readonly name: string;
  readonly content: Uint8Array;
}

function getUniqueEntryName(name: string, usedNames: Set<string>): string {
  if (!usedNames.has(name)) return name;

  const extensionIndex = name.lastIndexOf(".");
  const baseName = extensionIndex > 0 ? name.slice(0, extensionIndex) : name;
  const extension = extensionIndex > 0 ? name.slice(extensionIndex) : "";
  let suffix = 1;
  let candidate = `${baseName} (${suffix})${extension}`;
  while (usedNames.has(candidate)) {
    suffix += 1;
    candidate = `${baseName} (${suffix})${extension}`;
  }
  return candidate;
}

export function createZipBlob(entries: readonly ZipFileEntry[]): Blob {
  const files: Record<string, Uint8Array> = Object.create(null) as Record<
    string,
    Uint8Array
  >;
  const usedNames = new Set<string>();

  for (const entry of entries) {
    const name = getUniqueEntryName(entry.name, usedNames);
    usedNames.add(name);
    files[name] = entry.content;
  }

  return new Blob([zipSync(files, { level: 0 })], { type: "application/zip" });
}
