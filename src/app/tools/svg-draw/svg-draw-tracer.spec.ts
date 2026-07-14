import {
  estimateTraceTime,
  formatEstimatedTime,
  formatFileSize,
  WARNING_THRESHOLD_SECONDS,
  TRACE_PRESETS,
} from './svg-draw-tracer';
import { describe, it, expect } from 'vitest';

describe('estimateTraceTime', () => {
  it('100x100 pixel_perfect 應為 0.2 秒', () => {
    expect(estimateTraceTime(100, 100, 'pixel_perfect')).toBeCloseTo(0.2);
  });

  it('100x100 detailed 應約 0.083 秒', () => {
    expect(estimateTraceTime(100, 100, 'detailed')).toBeCloseTo(10000 / 120000);
  });

  it('100x100 simple 應約 0.033 秒', () => {
    expect(estimateTraceTime(100, 100, 'simple')).toBeCloseTo(10000 / 300000);
  });

  it('1920x1080 pixel_perfect 應約 41.5 秒', () => {
    const result = estimateTraceTime(1920, 1080, 'pixel_perfect');
    expect(result).toBeCloseTo((1920 * 1080) / 50000);
  });

  it('pixel_perfect 比 simple 慢', () => {
    const pp = estimateTraceTime(800, 600, 'pixel_perfect');
    const simple = estimateTraceTime(800, 600, 'simple');
    expect(pp).toBeGreaterThan(simple);
  });
});

describe('formatEstimatedTime', () => {
  it('小於 60 秒顯示秒數', () => {
    expect(formatEstimatedTime(30)).toBe('約 30 秒');
  });

  it('5.4 秒四捨五入為 5 秒', () => {
    expect(formatEstimatedTime(5.4)).toBe('約 5 秒');
  });

  it('大於 60 秒顯示分秒', () => {
    expect(formatEstimatedTime(90)).toBe('約 1 分 30 秒');
  });

  it('整數分鐘顯示分鐘', () => {
    expect(formatEstimatedTime(120)).toBe('約 2 分鐘');
  });

  it('180 秒顯示為 3 分鐘', () => {
    expect(formatEstimatedTime(180)).toBe('約 3 分鐘');
  });

  it('150 秒顯示為 2 分 30 秒', () => {
    expect(formatEstimatedTime(150)).toBe('約 2 分 30 秒');
  });
});

describe('formatFileSize', () => {
  it('0 byte', () => expect(formatFileSize(0)).toBe('0 B'));
  it('bytes', () => expect(formatFileSize(512)).toBe('512 B'));
  it('KB', () => expect(formatFileSize(1536)).toBe('1.5 KB'));
  it('MB', () => expect(formatFileSize(2 * 1024 * 1024)).toBe('2.0 MB'));
});

describe('WARNING_THRESHOLD_SECONDS', () => {
  it('應為 120', () => {
    expect(WARNING_THRESHOLD_SECONDS).toBe(120);
  });
});

describe('TRACE_PRESETS 語義驗證', () => {
  it('pixel_perfect 色彩數量最多', () => {
    expect(TRACE_PRESETS['pixel_perfect'].numberofcolors)
      .toBeGreaterThan(TRACE_PRESETS['simple'].numberofcolors);
  });

  it('simple pathomit 最大', () => {
    expect(TRACE_PRESETS['simple'].pathomit)
      .toBeGreaterThan(TRACE_PRESETS['pixel_perfect'].pathomit);
  });

  it('大圖 (4000x3000) pixel_perfect 超過 WARNING_THRESHOLD_SECONDS', () => {
    const time = estimateTraceTime(4000, 3000, 'pixel_perfect');
    expect(time).toBeGreaterThan(WARNING_THRESHOLD_SECONDS);
  });
});
