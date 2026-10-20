import { TestBed, type ComponentFixture } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { ImageDither } from "./image-dither";
import {
  DEFAULT_DITHER_SETTINGS,
  MAX_DITHER_BYTES,
  type DitherRequest,
  type DitherResponse,
} from "./image-dither-core";

class MockImageData {
  constructor(
    readonly data: Uint8ClampedArray,
    readonly width: number,
    readonly height: number,
  ) {}
}
class MockImage {
  static width = 4;
  static height = 2;
  static fail = false;
  static deferred = false;
  static instances: MockImage[] = [];
  naturalWidth = MockImage.width;
  naturalHeight = MockImage.height;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    MockImage.instances.push(this);
  }
  set src(value: string) {
    if (value && !MockImage.deferred)
      queueMicrotask(() =>
        MockImage.fail ? this.onerror?.() : this.onload?.(),
      );
  }
}
class MockWorker {
  static instances: MockWorker[] = [];
  onmessage: ((event: MessageEvent<DitherResponse>) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessageerror: (() => void) | null = null;
  requests: DitherRequest[] = [];
  terminate = vi.fn();
  constructor() {
    MockWorker.instances.push(this);
  }
  postMessage(request: DitherRequest) {
    this.requests.push(request);
  }
  respond(request = this.requests.at(-1)!, id = request.id) {
    const pixels = new Uint8ClampedArray(
      request.width * request.height * 4,
    ).fill(255);
    this.onmessage?.({
      data: {
        id,
        type: "done",
        data: pixels.buffer,
        width: request.width,
        height: request.height,
      },
    } as MessageEvent<DitherResponse>);
  }
}

const pause = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms));

describe("ImageDither", () => {
  let fixture: ComponentFixture<ImageDither>;
  let component: ImageDither;
  let element: HTMLElement;
  let contexts: WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>;
  let downloads: { name: string; url: string }[];
  let encoded: { width: number; height: number; type: string }[];

  beforeEach(async () => {
    MockImage.width = 4;
    MockImage.height = 2;
    MockImage.fail = false;
    MockImage.deferred = false;
    MockImage.instances = [];
    MockWorker.instances = [];
    contexts = new WeakMap();
    downloads = [];
    encoded = [];
    vi.stubGlobal("Image", MockImage);
    vi.stubGlobal("ImageData", MockImageData);
    vi.stubGlobal("Worker", MockWorker);
    let urlId = 0;
    vi.spyOn(URL, "createObjectURL").mockImplementation(
      () => `blob:dither-${++urlId}`,
    );
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      function (this: HTMLCanvasElement) {
        if (!contexts.has(this))
          contexts.set(this, {
            drawImage: vi.fn(),
            fillRect: vi.fn(),
            putImageData: vi.fn(),
            getImageData: vi.fn(
              (_x: number, _y: number, w: number, h: number) =>
                new MockImageData(
                  new Uint8ClampedArray(w * h * 4).fill(255),
                  w,
                  h,
                ),
            ),
            fillStyle: "",
          } as unknown as CanvasRenderingContext2D);
        return contexts.get(this)!;
      } as unknown as typeof HTMLCanvasElement.prototype.getContext,
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      function (this: HTMLCanvasElement, callback, type) {
        encoded.push({ width: this.width, height: this.height, type: type! });
        callback(new Blob(["png"], { type }));
      },
    );
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloads.push({ name: this.download, url: this.href });
    });
    await TestBed.configureTestingModule({
      imports: [ImageDither],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(ImageDither);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function upload(
    file = new File(["image"], "photo.png", { type: "image/png" }),
  ) {
    const input =
      element.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [file],
    });
    input.dispatchEvent(new Event("change"));
    await pause();
    await fixture.whenStable();
    await pause(0);
    await fixture.whenStable();
  }
  async function ready() {
    await upload();
    MockWorker.instances.at(-1)!.respond();
    await fixture.whenStable();
  }
  function drop(files: File[]) {
    const event = new Event("drop", { cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: { files } });
    element.querySelector('[class*="dashed"]')!.dispatchEvent(event);
    return event;
  }

  it("shows neutral defaults, accessible controls, live status and format limits", () => {
    expect(component["settings"]()).toEqual(DEFAULT_DITHER_SETTINGS);
    expect(
      element.querySelector('[role="status"]')?.getAttribute("aria-live"),
    ).toBe("polite");
    expect(element.querySelectorAll('input[type="range"]').length).toBe(3);
    expect(element.textContent).toContain("20 MiB");
    expect(element.textContent).toContain("透明區域統一合成白底");
  });

  it.each(["image/png", "image/jpeg", "image/webp", "image/avif"])(
    "accepts %s and automatically processes a preview",
    async (type) => {
      await upload(new File(["image"], "photo", { type }));
      expect(MockWorker.instances.at(-1)?.requests[0].settings).toEqual(
        DEFAULT_DITHER_SETTINGS,
      );
      MockWorker.instances.at(-1)!.respond();
      await fixture.whenStable();
      expect(element.querySelectorAll("canvas")).toHaveLength(2);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:dither-1");
    },
  );

  it("accepts a dropped image and rejects multi-file drops", async () => {
    const file = new File(["image"], "drop.png", { type: "image/png" });
    expect(drop([file]).defaultPrevented).toBe(true);
    await pause();
    await fixture.whenStable();
    expect(component["source"]()?.name).toBe("drop.png");
    drop([file, file]);
    await fixture.whenStable();
    expect(component["error"]()).toContain("單張圖片");
  });

  it("rejects unsupported and oversized files without discarding the current image", async () => {
    await ready();
    await upload(new File(["svg"], "vector.svg", { type: "image/svg+xml" }));
    expect(component["error"]()).toContain("只支援");
    const large = new File(["image"], "large.png", { type: "image/png" });
    Object.defineProperty(large, "size", { value: MAX_DITHER_BYTES + 1 });
    await upload(large);
    expect(component["error"]()).toContain("20 MiB");
    expect(component["source"]()?.name).toBe("photo.png");
  });

  it("reports decoding, dimension and Canvas failures and releases decode URLs", async () => {
    MockImage.fail = true;
    await upload();
    expect(component["error"]()).toContain("無法解碼");
    expect(component["loading"]()).toBe(false);
    MockImage.fail = false;
    MockImage.width = 40_000_001;
    MockImage.height = 1;
    await upload();
    expect(component["error"]()).toContain("4,000 萬像素");
    MockImage.width = 0;
    await upload();
    expect(component["error"]()).toContain("尺寸無效");
    MockImage.width = 4;
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
    await upload();
    expect(component["error"]()).toContain("Canvas");
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(4);
  });

  it("translates Canvas exceptions into a recoverable zh-Hant error", async () => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation(() => {
      throw new Error("The operation is insecure");
    });
    await upload();
    expect(component["error"]()).toContain("Canvas 讀取失敗");
    expect(component["error"]()).not.toContain("insecure");
    expect(component["loading"]()).toBe(false);
  });

  it("ignores stale worker errors and continues with the latest preview", async () => {
    await upload();
    const worker = MockWorker.instances[0];
    component["setNumber"]("brightness", 25);
    await pause(170);
    worker.onmessage?.({
      data: { id: worker.requests[0].id, type: "error" },
    } as MessageEvent<DitherResponse>);
    expect(worker.requests).toHaveLength(2);
    expect(component["error"]()).toBe("");
    worker.respond();
    expect(component["processing"]()).toBe(false);
  });

  it("bounds previews to 1024px while preserving the original and scaling pixel size", async () => {
    MockImage.width = 2048;
    MockImage.height = 1200;
    component["setNumber"]("pixelSize", 8);
    await upload();
    const request = MockWorker.instances[0].requests[0];
    expect([request.width, request.height]).toEqual([1024, 600]);
    expect(request.settings.pixelSize).toBe(4);
    expect(component["source"]()?.canvas.width).toBe(2048);
    expect(component["settings"]().pixelSize).toBe(8);
    const originalContext = contexts.get(component["source"]()!.canvas)!;
    expect(originalContext.fillStyle).toBe("#ffffff");
    expect(originalContext.fillRect).toHaveBeenCalledWith(0, 0, 2048, 1200);
  });

  it("debounces 150ms, retains only the latest pending settings and ignores stale results", async () => {
    await upload();
    const worker = MockWorker.instances[0];
    const slider = element.querySelector<HTMLInputElement>(
      'input[aria-label="亮度"]',
    )!;
    slider.value = "10";
    slider.dispatchEvent(new Event("input"));
    await pause(30);
    slider.value = "40";
    slider.dispatchEvent(new Event("input"));
    await pause(90);
    expect(worker.requests).toHaveLength(1);
    await pause(90);
    expect(worker.requests).toHaveLength(1);
    worker.respond(worker.requests[0]);
    expect(component["result"]()).toBeNull();
    expect(worker.requests).toHaveLength(2);
    expect(worker.requests[1].settings.brightness).toBe(40);
    worker.respond(worker.requests[0]);
    expect(component["result"]()).toBeNull();
    worker.respond();
    await fixture.whenStable();
    expect(component["result"]()).not.toBeNull();
    expect(component["processing"]()).toBe(false);
  });

  it("changes algorithm, palettes and levels, defaults color to 64, and resets all parameters", async () => {
    await ready();
    component["setOption"]("algorithm", "bayer");
    component["setOption"]("palette", "color");
    component["setOption"]("colors", "27");
    component["setNumber"]("contrast", 30);
    component["setNumber"]("pixelSize", 16);
    await pause(170);
    expect(MockWorker.instances[0].requests.at(-1)?.settings).toMatchObject({
      algorithm: "bayer",
      palette: "color",
      colors: 27,
      contrast: 30,
      pixelSize: 16,
    });
    MockWorker.instances[0].respond();
    component["setOption"]("palette", "mint");
    component["setOption"]("palette", "color");
    expect(component["settings"]().colors).toBe(64);
    component["reset"]();
    expect(component["settings"]()).toEqual(DEFAULT_DITHER_SETTINGS);
    await pause(170);
    expect(MockWorker.instances[0].requests.at(-1)?.settings).toEqual(
      DEFAULT_DITHER_SETTINGS,
    );
  });

  it("exports original dimensions and PNG filename, locking all edits until encoding completes", async () => {
    MockImage.width = 1200;
    MockImage.height = 600;
    await ready();
    let finish: BlobCallback | undefined;
    vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation(function (
      this: HTMLCanvasElement,
      callback,
      type,
    ) {
      encoded.push({ width: this.width, height: this.height, type: type! });
      finish = callback;
    });
    component["download"]();
    await fixture.whenStable();
    const worker = MockWorker.instances.at(-1)!;
    expect([worker.requests[0].width, worker.requests[0].height]).toEqual([
      1200, 600,
    ]);
    const settings = component["settings"]();
    component["setNumber"]("brightness", 50);
    component["setOption"]("palette", "color");
    component["clear"]();
    component["reset"]();
    drop([new File(["image"], "other.png", { type: "image/png" })]);
    expect(component["settings"]()).toEqual(settings);
    expect(element.querySelector("fieldset")?.disabled).toBe(true);
    expect(
      element.querySelector<HTMLInputElement>('input[type="file"]')?.disabled,
    ).toBe(true);
    worker.respond();
    await fixture.whenStable();
    expect(component["exporting"]()).toBe(true);
    expect(encoded).toEqual([{ width: 1200, height: 600, type: "image/png" }]);
    finish!(new Blob(["png"], { type: "image/png" }));
    await fixture.whenStable();
    expect(downloads).toEqual([
      { name: "photo-dither.png", url: "blob:dither-2" },
    ]);
    expect(component["exporting"]()).toBe(false);
    expect(component["status"]()).toContain("1200 × 600");
    component["clear"]();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:dither-2");
  });

  it("recovers from worker creation, runtime, message and export failures", async () => {
    vi.stubGlobal(
      "Worker",
      class {
        constructor() {
          throw new Error();
        }
      },
    );
    await upload();
    expect(component["error"]()).toContain("運算失敗");
    expect(component["processing"]()).toBe(false);
    vi.stubGlobal("Worker", MockWorker);
    component["reset"]();
    await pause(170);
    MockWorker.instances.at(-1)!.onerror?.();
    expect(component["processing"]()).toBe(false);
    component["download"]();
    MockWorker.instances.at(-1)!.onmessageerror?.();
    expect(component["exporting"]()).toBe(false);
    component["download"]();
    const worker = MockWorker.instances.at(-1)!;
    worker.onmessage?.({
      data: { type: "error", id: worker.requests[0].id },
    } as MessageEvent<DitherResponse>);
    expect(component["exporting"]()).toBe(false);
    component["download"]();
    vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation(
      (callback) => callback(null),
    );
    MockWorker.instances.at(-1)!.respond();
    await fixture.whenStable();
    expect(component["error"]()).toContain("PNG 編碼");
    expect(component["exporting"]()).toBe(false);
  });

  it("terminates workers, clears timers and rejects old results on replacement, clear and destroy", async () => {
    await upload();
    const first = MockWorker.instances[0];
    const canvas = component["source"]()!.canvas;
    component["setNumber"]("brightness", 10);
    await upload(new File(["new"], "new.webp", { type: "image/webp" }));
    expect(first.terminate).toHaveBeenCalled();
    expect(canvas.width).toBe(0);
    first.respond();
    expect(component["result"]()).toBeNull();
    const second = MockWorker.instances.at(-1)!;
    component["setNumber"]("pixelSize", 4);
    component["clear"]();
    await pause(170);
    expect(second.requests).toHaveLength(1);
    expect(second.terminate).toHaveBeenCalled();
    second.respond();
    expect(component["source"]()).toBeNull();
    expect(component["result"]()).toBeNull();
    await upload();
    const last = MockWorker.instances.at(-1)!;
    fixture.destroy();
    expect(last.terminate).toHaveBeenCalled();
    last.respond();
    expect(component["result"]()).toBeNull();
  });

  it("cancels stale decodes and prevents late encoding from downloading after destruction", async () => {
    MockImage.deferred = true;
    await upload();
    const image = MockImage.instances[0];
    const staleLoad = image.onload!;
    component["clear"]();
    staleLoad();
    expect(component["source"]()).toBeNull();
    expect(image.onload).toBeNull();
    MockImage.deferred = false;
    await ready();
    let finish: BlobCallback | undefined;
    vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation(
      (callback) => {
        finish = callback;
      },
    );
    component["download"]();
    MockWorker.instances.at(-1)!.respond();
    fixture.destroy();
    finish!(new Blob(["png"], { type: "image/png" }));
    await Promise.resolve();
    expect(downloads).toHaveLength(0);
  });
});
