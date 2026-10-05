import { ComponentFixture, TestBed } from "@angular/core/testing";
import { SvgDraw } from "./svg-draw";
import { provideRouter } from "@angular/router";
import { vi } from "vitest";

describe("SvgDraw Component", () => {
  let component: SvgDraw;
  let fixture: ComponentFixture<SvgDraw>;

  beforeEach(async () => {
    // Stub URL.createObjectURL and URL.revokeObjectURL
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [SvgDraw],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SvgDraw);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("直接 transfer RGBA buffer，收到有效 SVG 後結束 Worker", async () => {
    const rgba = new Uint8ClampedArray([255, 0, 0, 255]);
    const postMessage = vi.fn();
    const terminate = vi.fn();
    let worker: { onmessage?: (event: MessageEvent) => void } | undefined;
    class MockWorker {
      onmessage?: (event: MessageEvent) => void;
      postMessage = postMessage;
      terminate = terminate;
      constructor() {
        worker = this;
      }
    }
    vi.stubGlobal("Worker", MockWorker);
    vi.spyOn(
      component as unknown as {
        getImageData: (file: File) => Promise<ImageData>;
      },
      "getImageData",
    ).mockResolvedValue({ width: 1, height: 1, data: rgba } as ImageData);
    component["sourceFile"].set(
      new File(["image"], "a.png", { type: "image/png" }),
    );
    component["status"].set("ready");
    await component["startTrace"]();
    const request = postMessage.mock.calls[0][0];
    expect(request.data).toBe(rgba.buffer);
    expect(postMessage.mock.calls[0][1]).toEqual([rgba.buffer]);
    worker?.onmessage?.({
      data: {
        type: "done",
        generation: request.generation,
        svgString: '<svg viewBox="0 0 1 1"><path d="M0 0L1 1" /></svg>',
      },
    } as MessageEvent);
    expect(component["status"]()).toBe("done");
    expect(terminate).toHaveBeenCalledOnce();
  });

  it.each(["cancel", "preset"])(
    "decode 期間 %s 不得啟動 Worker 或提交過期結果",
    async (action) => {
      let finishDecode: ((image: ImageData) => void) | undefined;
      const createWorker = vi.fn();
      vi.stubGlobal("Worker", createWorker);
      vi.spyOn(
        component as unknown as {
          getImageData: (file: File) => Promise<ImageData>;
        },
        "getImageData",
      ).mockReturnValue(
        new Promise((resolve) => {
          finishDecode = resolve;
        }),
      );
      component["sourceFile"].set(
        new File(["image"], "a.png", { type: "image/png" }),
      );
      component["status"].set("ready");
      const trace = component["startTrace"]();
      if (action === "cancel") component["cancelTrace"]();
      else component["onPresetChange"]("simple");
      finishDecode?.({
        width: 1,
        height: 1,
        data: new Uint8ClampedArray(4),
      } as ImageData);
      await trace;
      expect(createWorker).not.toHaveBeenCalled();
      expect(component["status"]()).toBe("ready");
      expect(component["svgOutput"]()).toBe("");
    },
  );

  it("應該成功建立元件", () => {
    expect(component).toBeTruthy();
  });

  it("初始狀態為 idle，並且應該渲染上傳區而非主面板", () => {
    expect(component["status"]()).toBe("idle");
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="drop-zone"]')).toBeTruthy();
    expect(
      compiled.querySelector('[data-testid="svg-draw-panels"]'),
    ).toBeFalsy();
  });

  it("當 status 不為 idle 時，應該渲染面板並顯示預估時間", async () => {
    // 模擬已載入一個 100x100 的圖檔
    const file = new File(["dummy content"], "test.png", { type: "image/png" });
    component["sourceFile"].set(file);
    component["sourcePreviewUrl"].set("blob:mock-url");
    component["sourceWidth"].set(100);
    component["sourceHeight"].set(100);
    component["status"].set("ready");

    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="drop-zone"]')).toBeFalsy();
    expect(
      compiled.querySelector('[data-testid="svg-draw-panels"]'),
    ).toBeTruthy();

    const estimateVal = compiled.querySelector(
      '[data-testid="estimate-value"]',
    );
    expect(estimateVal?.textContent).toContain("約 1 秒");
  });

  it("當預估時間大於等於 120 秒時，預估時間區域應套用警告樣式並顯示警告字樣", async () => {
    // 4000x3000 = 12,000,000 pixels. Rate for pixel_perfect is 50,000 px/sec.
    // 12M / 50K = 240s >= 120s
    component["sourceFile"].set(
      new File(["dummy"], "big.png", { type: "image/png" }),
    );
    component["sourcePreviewUrl"].set("blob:mock-url");
    component["sourceWidth"].set(4000);
    component["sourceHeight"].set(3000);
    component["status"].set("ready");

    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const estimateBox = compiled.querySelector('[data-testid="estimate-box"]');
    expect(estimateBox?.getAttribute("data-warning")).toBe("true");

    const warningText = compiled.querySelector(
      '[data-testid="estimate-warning-text"]',
    );
    expect(warningText).toBeTruthy();
    expect(warningText?.textContent).toContain("圖片較複雜");
  });

  it("重設按鈕點擊後應該回到 idle 狀態並清理相關訊號", async () => {
    component["sourceFile"].set(
      new File(["dummy"], "test.png", { type: "image/png" }),
    );
    component["sourcePreviewUrl"].set("blob:mock-url");
    component["status"].set("ready");

    component["reset"]();
    fixture.detectChanges();

    expect(component["status"]()).toBe("idle");
    expect(component["sourceFile"]()).toBeNull();
    expect(component["sourcePreviewUrl"]()).toBe("");
  });
});
