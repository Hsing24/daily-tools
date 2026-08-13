import {
  formatFileSize,
  compressionRatio,
  estimatedRatio,
  isLossyFormat,
  outputFileName,
  generateId,
  createZipBlob,
  checkFormatSupport,
  convertImage,
  getDefaultOutputFormat,
  loadImage,
  MAX_IMAGE_PIXELS,
} from "./image-converter-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { unzipSync } from "fflate";

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
  it("png extension", () =>
    expect(outputFileName("photo.jpg", "png")).toBe("photo.png"));
  it("jpeg → .jpg", () =>
    expect(outputFileName("photo.png", "jpeg")).toBe("photo.jpg"));
  it("webp extension", () =>
    expect(outputFileName("img.bmp", "webp")).toBe("img.webp"));
  it("handle multiple dots", () =>
    expect(outputFileName("my.photo.png", "webp")).toBe("my.photo.webp"));
});

describe("estimatedRatio", () => {
  it("lossless 格式回傳 lossless 標示", () => {
    expect(estimatedRatio("png", 85)).toContain("lossless");
  });
  it("lossy 格式回傳估算百分比", () => {
    const result = estimatedRatio("jpeg", 85);
    expect(result).toBe("轉換後計算");
  });
});

describe("generateId", () => {
  it("每次產生不同 ID", () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });
});

describe("ZIP 壓縮封裝", () => {
  it("應能正確封裝 ZIP 封包", () => {
    const file1 = {
      name: "test1.txt",
      content: new TextEncoder().encode("content1"),
    };
    const file2 = {
      name: "test2.txt",
      content: new TextEncoder().encode("content2"),
    };
    const blob = createZipBlob([file1, file2]);
    expect(blob).toBeTruthy();
    expect(blob.type).toBe("application/zip");
    expect(blob.size).toBeGreaterThan(60 + 46 * 2 + 22 + 8 * 2); // 大於 Local header + Central Directory + EOCD 大小
  });

  it("應使用 UTF-8 檔名並處理重複名稱", async () => {
    const blob = createZipBlob([
      { name: "截圖.png", content: new Uint8Array([1, 2]) },
      { name: "截圖.png", content: new Uint8Array([3, 4]) },
    ]);
    const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()));

    expect(Object.keys(entries)).toEqual(["截圖.png", "截圖 (1).png"]);
    expect([...entries["截圖.png"]]).toEqual([1, 2]);
    expect([...entries["截圖 (1).png"]]).toEqual([3, 4]);
  });
});

describe("輸出格式驗證", () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn(
      () =>
        ({
          fillStyle: "",
          fillRect: vi.fn(),
          drawImage: vi.fn(),
        }) as unknown as CanvasRenderingContext2D,
    ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toBlob = vi.fn(function (
      callback: BlobCallback,
      type?: string,
    ) {
      callback(new Blob(["fake"], { type: type ?? "image/png" }));
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it("fallback MIME 不得判定為格式支援", async () => {
    HTMLCanvasElement.prototype.toBlob = vi.fn(function (
      callback: BlobCallback,
    ) {
      callback(new Blob(["fake"], { type: "image/png" }));
    });

    await expect(checkFormatSupport("avif")).resolves.toBe(false);
  });

  it("轉換結果 MIME 不符時拒絕輸出", async () => {
    HTMLCanvasElement.prototype.toBlob = vi.fn(function (
      callback: BlobCallback,
    ) {
      callback(new Blob(["fake"], { type: "image/png" }));
    });
    const image = { naturalWidth: 1, naturalHeight: 1 } as HTMLImageElement;
    await expect(convertImage(image, "webp", 85)).rejects.toThrow("fallback");
  });

  it("載入成功與失敗都釋放 Object URL", async () => {
    const revoke = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});
    const create = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:image");
    const originalImage = globalThis.Image;

    class MockImage {
      naturalWidth = 10;
      naturalHeight = 20;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onload?.();
      }
    }
    globalThis.Image = MockImage as unknown as typeof Image;

    await loadImage(new File(["image"], "a.png", { type: "image/png" }));
    expect(create).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith("blob:image");
    globalThis.Image = originalImage;
  });

  it("拒絕不支援的輸入格式與超大圖片", async () => {
    await expect(
      loadImage(new File(["<svg />"], "a.svg", { type: "image/svg+xml" })),
    ).rejects.toThrow("不支援");

    const originalImage = globalThis.Image;
    class HugeImage {
      naturalWidth = MAX_IMAGE_PIXELS;
      naturalHeight = 2;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onload?.();
      }
    }
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:image");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    globalThis.Image = HugeImage as unknown as typeof Image;
    await expect(
      loadImage(new File(["image"], "a.png", { type: "image/png" })),
    ).rejects.toThrow("尺寸過大");
    globalThis.Image = originalImage;
  });

  it("預設格式依 runtime 支援清單選擇", () => {
    expect(getDefaultOutputFormat(new Set(["png", "jpeg"]))).toBe("jpeg");
    expect(getDefaultOutputFormat(new Set(["png", "webp"]))).toBe("webp");
  });
});
