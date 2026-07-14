/** SVG 描圖選項 */
export interface TraceOptions {
  /** 線段追蹤解析度 */
  ltres: number;
  /** 二次曲線追蹤解析度 */
  qtres: number;
  /** 路徑省略閥值 */
  pathomit: number;
  /** 色彩數量 */
  numberofcolors: number;
  /** 取色方式 (0=random, 1=deterministic, 2=precise) */
  colorsampling: number;
  /** 縮放比例 */
  scale: number;
  /** 座標小數位數 */
  roundcoords: number;
}

/** 預設組合名稱 */
export type TracePresetName = 'pixel_perfect' | 'detailed' | 'simple';

/** 預設追蹤參數 */
export const TRACE_PRESETS: Record<TracePresetName, TraceOptions> = {
  pixel_perfect: {
    ltres: 0.1,
    qtres: 0.1,
    pathomit: 0,
    numberofcolors: 64,
    colorsampling: 2,
    scale: 1,
    roundcoords: 3,
  },
  detailed: {
    ltres: 0.5,
    qtres: 0.5,
    pathomit: 4,
    numberofcolors: 32,
    colorsampling: 2,
    scale: 1,
    roundcoords: 2,
  },
  simple: {
    ltres: 1,
    qtres: 1,
    pathomit: 8,
    numberofcolors: 16,
    colorsampling: 2,
    scale: 1,
    roundcoords: 1,
  },
};

/** 超過此秒數會顯示警告 */
export const WARNING_THRESHOLD_SECONDS = 120;

/** 各預設的處理速率 (像素/秒) */
const TRACE_RATES: Record<TracePresetName, number> = {
  pixel_perfect: 50_000,
  detailed: 120_000,
  simple: 300_000,
};

/** 估算追蹤耗時（秒） */
export function estimateTraceTime(
  width: number,
  height: number,
  preset: string,
): number {
  const pixels = width * height;
  const rate = TRACE_RATES[preset as TracePresetName] ?? 50_000;
  return pixels / rate;
}

/** 將秒數格式化為人類可讀的時間字串 */
export function formatEstimatedTime(seconds: number): string {
  if (seconds < 60) {
    let secs = Math.round(seconds);
    if (seconds > 0 && secs === 0) {
      secs = 1;
    }
    return `約 ${secs} 秒`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (remainingSeconds === 0) {
    return `約 ${minutes} 分鐘`;
  }
  return `約 ${minutes} 分 ${remainingSeconds} 秒`;
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

/** Worker 輸出訊息格式 */
export interface TraceWorkerOutput {
  type: 'done' | 'error';
  svgString?: string;
  elapsedMs?: number;
  error?: string;
}
