import {
  formatFileSize,
  compressionRatio,
  estimatedRatio,
  isLossyFormat,
  outputFileName,
  generateId,
  crc32,
  createZipBlob,
} from "./image-converter-utils";
import { describe, it, expect } from "vitest";

describe("formatFileSize", () => {
  it("0 byte", () => expect(formatFileSize(0)).toBe("0 B"));
  it("bytes", () => expect(formatFileSize(512)).toBe("512 B"));
  it("KB", () => expect(formatFileSize(1536)).toBe("1.5 KB"));
  it("MB", () => expect(formatFileSize(2 * 1024 * 1024)).toBe("2.0 MB"));
});

describe("compressionRatio", () => {
  it("相同大小", () => expect(compressionRatio(100, 100)).toBe("-0.0%"));
  it("壓縮 50%", () => expect(compressionRatio(100, 50)).toBe("-50.0%"));
  it("膨脹", () => expect(compressionRatio(100, 150)).toContain("+"));
  it("原始為 0", () => expect(compressionRatio(0, 100)).toBe("—"));
});

describe("isLossyFormat", () => {
  it("png is lossless", () => expect(isLossyFormat("png")).toBe(false));
  it("jpeg is lossy", () => expect(isLossyFormat("jpeg")).toBe(true));
  it("webp is lossy", () => expect(isLossyFormat("webp")).toBe(true));
  it("avif is lossy", () => expect(isLossyFormat("avif")).toBe(true));
});

describe("outputFileName", () => {
  it("png extension", () => expect(outputFileName("photo.jpg", "png")).toBe("photo.png"));
  it("jpeg → .jpg", () => expect(outputFileName("photo.png", "jpeg")).toBe("photo.jpg"));
  it("webp extension", () => expect(outputFileName("img.bmp", "webp")).toBe("img.webp"));
  it("handle multiple dots", () => expect(outputFileName("my.photo.png", "webp")).toBe("my.photo.webp"));
});

describe("estimatedRatio", () => {
  it("lossless 格式回傳 lossless 標示", () => {
    expect(estimatedRatio("png", 85)).toContain("lossless");
  });
  it("lossy 格式回傳估算百分比", () => {
    const result = estimatedRatio("jpeg", 85);
    expect(result).toContain("≈");
    expect(result).toContain("%");
  });
});

describe("generateId", () => {
  it("每次產生不同 ID", () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });
});

describe("CRC32 & ZIP 壓縮封裝", () => {
  it("應能計算字串/陣列的 CRC32", () => {
    const data = new TextEncoder().encode("Hello World");
    const crc = crc32(data);
    expect(crc).toBe(1243066710); // "Hello World" 的標準 CRC32
  });

  it("應能正確封裝 ZIP 封包", () => {
    const file1 = { name: "test1.txt", content: new TextEncoder().encode("content1") };
    const file2 = { name: "test2.txt", content: new TextEncoder().encode("content2") };
    const blob = createZipBlob([file1, file2]);
    expect(blob).toBeTruthy();
    expect(blob.type).toBe("application/zip");
    expect(blob.size).toBeGreaterThan(60 + 46*2 + 22 + 8*2); // 大於 Local header + Central Directory + EOCD 大小
  });
});
