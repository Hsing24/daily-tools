/** 支援的輸出格式 */
export type OutputFormat = 'png' | 'jpeg' | 'webp' | 'avif';

/** 格式對應的 MIME type */
export const FORMAT_MIME: Record<OutputFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
};

/** 格式中文顯示名稱 */
export const FORMAT_LABELS: Record<OutputFormat, string> = {
  png: 'PNG',
  jpeg: 'JPEG',
  webp: 'WebP',
  avif: 'AVIF',
};

/** 是否為有損格式（支援品質滑桿） */
export function isLossyFormat(format: OutputFormat): boolean {
  return format === 'jpeg' || format === 'webp' || format === 'avif';
}

/** 預設品質值 (0-1 scale) */
export const DEFAULT_QUALITY = 0.85;

/** 單張圖片的轉換狀態 */
export interface ImageItem {
  /** 唯一識別碼 */
  readonly id: string;
  /** 原始檔案 */
  readonly file: File;
  /** 原始圖片的 Object URL (供縮圖預覽) */
  readonly previewUrl: string;
  /** 原始圖片的寬高 */
  readonly width: number;
  readonly height: number;
  /** 輸出格式 */
  outputFormat: OutputFormat;
  /** 品質 (0-100, 僅 lossy 格式有效) */
  quality: number;
  /** 轉換狀態 */
  status: 'pending' | 'converting' | 'done' | 'error';
  /** 轉換結果 Blob */
  resultBlob: Blob | null;
  /** 轉換結果 Object URL (供預覽) */
  resultUrl: string;
  /** 錯誤訊息 */
  errorMessage: string;
}

/** 產生唯一 ID */
export function generateId(): string {
  return crypto.randomUUID?.() ??
    Math.random().toString(36).substring(2, 15);
}

/** 格式化檔案大小 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** 計算壓縮比 (%) */
export function compressionRatio(
  originalSize: number,
  resultSize: number
): string {
  if (originalSize === 0) return '—';
  const ratio = ((1 - resultSize / originalSize) * 100);
  if (ratio < 0) return `+${Math.abs(ratio).toFixed(1)}%`;
  return `-${ratio.toFixed(1)}%`;
}

/** 根據品質估算壓縮比（示意用，非精確值） */
export function estimatedRatio(
  format: OutputFormat,
  quality: number
): string {
  if (!isLossyFormat(format)) return '— (lossless)';
  const q = quality / 100;
  const estimated = (1 - q * 0.9) * 100;
  return `≈ -${estimated.toFixed(0)}%`;
}

/** 將 File 載入為 HTMLImageElement 並取得寬高 */
export function loadImage(
  file: File
): Promise<{ img: HTMLImageElement; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ img, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`無法載入圖片: ${file.name}`));
    };
    img.src = url;
  });
}

/** 使用 Canvas 將圖片轉換為指定格式的 Blob */
export function convertImage(
  img: HTMLImageElement,
  format: OutputFormat,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas 2D context 不可用'));
      return;
    }

    // JPEG 不支援透明，需填白底
    if (format === 'jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0);

    const mime = FORMAT_MIME[format];
    const q = isLossyFormat(format) ? quality / 100 : undefined;

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error(`轉換失敗：瀏覽器不支援 ${FORMAT_LABELS[format]} 編碼`));
        }
      },
      mime,
      q
    );
  });
}

/** 檢測瀏覽器是否支援指定格式的 Canvas 編碼 */
export async function checkFormatSupport(
  format: OutputFormat
): Promise<boolean> {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob !== null),
        FORMAT_MIME[format],
        0.5
      );
    });
  } catch {
    return false;
  }
}

/** 產生輸出檔名 */
export function outputFileName(
  originalName: string,
  format: OutputFormat
): string {
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  return `${baseName}.${format === 'jpeg' ? 'jpg' : format}`;
}

// ── CRC32 & ZIP 封裝工具 (STORE method) ──

let crcTable: number[] | null = null;

function makeCRCTable(): number[] {
  const table: number[] = [];
  let c: number;
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
}

export function crc32(buf: Uint8Array): number {
  if (!crcTable) {
    crcTable = makeCRCTable();
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

export interface ZipFileEntry {
  name: string;
  content: Uint8Array;
}

export function createZipBlob(entries: ZipFileEntry[]): Blob {
  const parts: any[] = [];
  const centralDirectoryHeaders: Uint8Array[] = [];
  let currentOffset = 0;

  const date = new Date();
  const dosTime = ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)) & 0xFFFF;
  const dosDate = (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xFFFF;

  const encoder = new TextEncoder();

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const contentBytes = entry.content;
    const crc = crc32(contentBytes);
    const size = contentBytes.length;

    // Local file header (30 bytes + name length)
    const lfh = new Uint8Array(30 + nameBytes.length);
    const lfhView = new DataView(lfh.buffer);

    lfhView.setUint32(0, 0x04034b50, true); // signature
    lfhView.setUint16(4, 10, true); // version needed to extract (1.0)
    lfhView.setUint16(6, 0, true); // general purpose bit flag
    lfhView.setUint16(8, 0, true); // compression method (STORE = 0)
    lfhView.setUint16(10, dosTime, true); // last mod file time
    lfhView.setUint16(12, dosDate, true); // last mod file date
    lfhView.setUint32(14, crc, true); // crc-32
    lfhView.setUint32(18, size, true); // compressed size
    lfhView.setUint32(22, size, true); // uncompressed size
    lfhView.setUint16(26, nameBytes.length, true); // file name length
    lfhView.setUint16(28, 0, true); // extra field length
    lfh.set(nameBytes, 30);

    parts.push(lfh as any);
    parts.push(contentBytes as any);

    // Central Directory Header (46 bytes + name length)
    const cdh = new Uint8Array(46 + nameBytes.length);
    const cdhView = new DataView(cdh.buffer);

    cdhView.setUint32(0, 0x02014b50, true); // signature
    cdhView.setUint16(4, 20, true); // version made by
    cdhView.setUint16(6, 10, true); // version needed to extract
    cdhView.setUint16(8, 0, true); // general purpose bit flag
    cdhView.setUint16(10, 0, true); // compression method
    cdhView.setUint16(12, dosTime, true); // last mod file time
    cdhView.setUint16(14, dosDate, true); // last mod file date
    cdhView.setUint32(16, crc, true); // crc-32
    cdhView.setUint32(20, size, true); // compressed size
    cdhView.setUint32(24, size, true); // uncompressed size
    cdhView.setUint16(28, nameBytes.length, true); // file name length
    cdhView.setUint16(30, 0, true); // extra field length
    cdhView.setUint16(32, 0, true); // file comment length
    cdhView.setUint16(34, 0, true); // disk number start
    cdhView.setUint16(36, 0, true); // internal file attributes
    cdhView.setUint32(38, 0, true); // external file attributes
    cdhView.setUint32(42, currentOffset, true); // relative offset of local header
    cdh.set(nameBytes, 46);

    centralDirectoryHeaders.push(cdh);
    currentOffset += lfh.length + contentBytes.length;
  }

  const centralDirectoryOffset = currentOffset;
  let centralDirectorySize = 0;
  for (const cdh of centralDirectoryHeaders) {
    parts.push(cdh as any);
    centralDirectorySize += cdh.length;
  }

  // End of central directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);

  eocdView.setUint32(0, 0x06054b50, true); // signature
  eocdView.setUint16(4, 0, true); // number of this disk
  eocdView.setUint16(6, 0, true); // number of the disk with the start of the central directory
  eocdView.setUint16(8, entries.length, true); // total number of entries in the central directory on this disk
  eocdView.setUint16(10, entries.length, true); // total number of entries in the central directory
  eocdView.setUint32(12, centralDirectorySize, true); // size of the central directory
  eocdView.setUint32(16, centralDirectoryOffset, true); // offset of start of central directory, with respect to the starting disk number
  eocdView.setUint16(20, 0, true); // zip file comment length

  parts.push(eocd as any);

  return new Blob(parts, { type: 'application/zip' });
}
