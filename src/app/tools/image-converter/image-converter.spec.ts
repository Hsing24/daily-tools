import { TestBed, ComponentFixture } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { ImageConverter } from "./image-converter";
import type { ImageItem } from "./image-converter-utils";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

describe("ImageConverter 元件", () => {
  let fixture: ComponentFixture<ImageConverter>;
  let component: ImageConverter;
  let element: HTMLElement;

  beforeEach(async () => {
    // 模擬 Canvas toBlob
    HTMLCanvasElement.prototype.toBlob = vi.fn(function (
      this: HTMLCanvasElement,
      callback: BlobCallback,
      type?: string,
    ) {
      const blob = new Blob(["fake"], { type: type || "image/png" });
      callback(blob);
    });

    // 模擬 URL.createObjectURL / revokeObjectURL
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [ImageConverter],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ImageConverter);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each(["clear", "destroy"])(
    "圖片載入期間 %s 不得重新加入清單或建立預覽 URL",
    async (action) => {
      await component["formatSupportPromise"];
      let finishLoad: (() => void) | undefined;
      class PendingImage {
        naturalWidth = 10;
        naturalHeight = 10;
        onload: (() => void) | null = null;
        set src(_value: string) {
          finishLoad = () => this.onload?.();
        }
      }
      vi.stubGlobal("Image", PendingImage);
      const upload = component["addFiles"]([
        new File(["image"], "a.png", { type: "image/png" }),
      ] as unknown as FileList);
      await Promise.resolve();
      const urlsBefore = vi.mocked(URL.createObjectURL).mock.calls.length;
      if (action === "clear") component["clearAll"]();
      else fixture.destroy();
      finishLoad?.();
      await upload;

      expect(component["items"]()).toEqual([]);
      expect(URL.createObjectURL).toHaveBeenCalledTimes(urlsBefore);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    },
  );

  it("同一圖片正在轉換時不得重複啟動編碼", async () => {
    let finishLoad: (() => void) | undefined;
    class PendingImage {
      naturalWidth = 10;
      naturalHeight = 10;
      onload: (() => void) | null = null;
      set src(_value: string) {
        finishLoad = () => this.onload?.();
      }
    }
    vi.stubGlobal("Image", PendingImage);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    component["items"].set([
      {
        id: "one-job",
        file: new File(["image"], "a.png", { type: "image/png" }),
        previewUrl: "blob:preview",
        width: 10,
        height: 10,
        revision: 0,
        outputFormat: "webp",
        quality: 85,
        status: "pending",
        resultBlob: null,
        resultUrl: "",
        errorMessage: "",
      },
    ]);
    await component["formatSupportPromise"];
    vi.mocked(HTMLCanvasElement.prototype.toBlob).mockClear();
    const conversion = component["convertSingle"]("one-job");
    await component["convertSingle"]("one-job");
    finishLoad?.();
    await conversion;
    expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledOnce();
    expect(component["items"]()[0].status).toBe("done");
  });

  it("全部圖片 decode 失敗時不得顯示成功加入訊息", async () => {
    class InvalidImage {
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onerror?.();
      }
    }
    vi.stubGlobal("Image", InvalidImage);
    await component["addFiles"]([
      new File(["invalid"], "broken.png", { type: "image/png" }),
    ] as unknown as FileList);
    expect(component["items"]()).toEqual([]);
    expect(component["alertVariant"]()).toBe("error");
    expect(component["alertMessage"]()).toContain("沒有可加入的圖片");
  });

  it("應正確建立元件", () => {
    expect(component).toBeTruthy();
  });

  it("初始狀態應顯示拖放上傳區", () => {
    const dropZone = element.querySelector('[data-testid="drop-zone"]');
    expect(dropZone).toBeTruthy();
    expect(element.textContent).toContain("拖放圖片至此處");
  });

  it("初始狀態下不應顯示批次操作列", () => {
    expect(element.querySelector('[data-testid="btn-convert-all"]')).toBeNull();
  });

  it("清除按鈕空狀態下不應報錯", () => {
    expect(() => {
      component["clearAll"]();
      fixture.detectChanges();
    }).not.toThrow();
  });

  it("轉換期間設定變更時，舊結果不得提交", async () => {
    const originalImage = globalThis.Image;
    let finishConversion: (() => void) | undefined;
    class MockImage {
      naturalWidth = 10;
      naturalHeight = 10;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onload?.();
      }
    }
    globalThis.Image = MockImage as unknown as typeof Image;
    HTMLCanvasElement.prototype.getContext = vi.fn(
      () =>
        ({
          drawImage: vi.fn(),
          fillRect: vi.fn(),
          fillStyle: "",
        }) as unknown as CanvasRenderingContext2D,
    ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toBlob = vi.fn((callback: BlobCallback) => {
      finishConversion = () =>
        callback(new Blob(["old"], { type: "image/webp" }));
    });

    const item: ImageItem = {
      id: "stale-item",
      file: new File(["image"], "image.png", { type: "image/png" }),
      previewUrl: "blob:preview",
      width: 10,
      height: 10,
      revision: 0,
      outputFormat: "webp",
      quality: 85,
      status: "pending",
      resultBlob: null,
      resultUrl: "",
      errorMessage: "",
    };
    component["items"].set([item]);

    try {
      const conversion = component["convertSingle"](item.id);
      component["updateQuality"](item.id, 40);
      await Promise.resolve();
      finishConversion?.();
      await conversion;

      const current = component["items"]()[0];
      expect(current?.status).toBe("pending");
      expect(current?.resultBlob).toBeNull();
    } finally {
      globalThis.Image = originalImage;
    }
  });

  it("轉換完成前移除圖片時，不得留下結果 URL", async () => {
    const originalImage = globalThis.Image;
    let finishConversion: (() => void) | undefined;
    class MockImage {
      naturalWidth = 10;
      naturalHeight = 10;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onload?.();
      }
    }
    globalThis.Image = MockImage as unknown as typeof Image;
    HTMLCanvasElement.prototype.getContext = vi.fn(
      () =>
        ({
          drawImage: vi.fn(),
          fillRect: vi.fn(),
          fillStyle: "",
        }) as unknown as CanvasRenderingContext2D,
    ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toBlob = vi.fn((callback: BlobCallback) => {
      finishConversion = () =>
        callback(new Blob(["old"], { type: "image/webp" }));
    });

    const item: ImageItem = {
      id: "removed-item",
      file: new File(["image"], "image.png", { type: "image/png" }),
      previewUrl: "blob:preview",
      width: 10,
      height: 10,
      revision: 0,
      outputFormat: "webp",
      quality: 85,
      status: "pending",
      resultBlob: null,
      resultUrl: "",
      errorMessage: "",
    };
    component["items"].set([item]);

    try {
      const conversion = component["convertSingle"](item.id);
      component["removeItem"](item.id);
      await Promise.resolve();
      finishConversion?.();
      await conversion;
      expect(component["items"]()).toEqual([]);
    } finally {
      globalThis.Image = originalImage;
    }
  });
});
