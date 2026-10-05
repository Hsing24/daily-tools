import { TestBed, ComponentFixture } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { DepthEstimator } from "./depth-estimator";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("DepthEstimator 元件", () => {
  let fixture: ComponentFixture<DepthEstimator>;
  let component: DepthEstimator;
  let element: HTMLElement;

  beforeEach(async () => {
    // Mock 2D and WebGL contexts for jsdom
    const mockContext2D = {
      scale: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      createImageData: vi.fn().mockImplementation((w: number, h: number) => ({
        width: w,
        height: h,
        data: new Uint8ClampedArray(w * h * 4),
      })),
      putImageData: vi.fn(),
      getImageData: vi
        .fn()
        .mockImplementation((_x: number, _y: number, w: number, h: number) => ({
          width: w,
          height: h,
          data: new Uint8ClampedArray(w * h * 4),
        })),
      createRadialGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn(),
      }),
    };

    const mockContextWebGL = {
      viewport: vi.fn(),
      enable: vi.fn(),
      clearColor: vi.fn(),
      clear: vi.fn(),
      createShader: vi.fn().mockReturnValue({}),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn().mockReturnValue(true),
      getProgramParameter: vi.fn().mockReturnValue(true),
      deleteShader: vi.fn(),
      deleteBuffer: vi.fn(),
      deleteTexture: vi.fn(),
      deleteProgram: vi.fn(),
      COMPILE_STATUS: 35713,
      LINK_STATUS: 35714,
      createProgram: vi.fn().mockReturnValue({}),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      useProgram: vi.fn(),
      createBuffer: vi.fn().mockReturnValue({}),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      getAttribLocation: vi.fn().mockReturnValue(0),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
      createTexture: vi.fn().mockReturnValue({}),
      bindTexture: vi.fn(),
      texParameteri: vi.fn(),
      texImage2D: vi.fn(),
      getUniformLocation: vi.fn().mockReturnValue({}),
      uniformMatrix4fv: vi.fn(),
      uniform1i: vi.fn(),
      drawArrays: vi.fn(),
      drawElements: vi.fn(),
      VERTEX_SHADER: 35633,
      FRAGMENT_SHADER: 35632,
      ARRAY_BUFFER: 34962,
      ELEMENT_ARRAY_BUFFER: 34963,
      STATIC_DRAW: 35044,
      DYNAMIC_DRAW: 35048,
      FLOAT: 5126,
      UNSIGNED_SHORT: 5123,
      TRIANGLES: 4,
      POINTS: 0,
      DEPTH_TEST: 2929,
      COLOR_BUFFER_BIT: 16384,
      DEPTH_BUFFER_BIT: 256,
      TEXTURE_2D: 3553,
      TEXTURE_MIN_FILTER: 10241,
      TEXTURE_MAG_FILTER: 10240,
      TEXTURE_WRAP_S: 10242,
      TEXTURE_WRAP_T: 10243,
      LINEAR: 9729,
      CLAMP_TO_EDGE: 33071,
      RGBA: 6408,
      UNSIGNED_BYTE: 5121,
    };

    HTMLCanvasElement.prototype.getContext = vi
      .fn()
      .mockImplementation((type: string) => {
        if (type === "2d") return mockContext2D;
        if (type === "webgl") return mockContextWebGL;
        return null;
      }) as any;

    HTMLCanvasElement.prototype.toDataURL = vi
      .fn()
      .mockReturnValue("data:image/png;base64,mock");

    await TestBed.configureTestingModule({
      imports: [DepthEstimator],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(DepthEstimator);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  it("應顯示圖片拖放上傳區", () => {
    const fileInput = element.querySelector("input[type='file']");
    expect(fileInput).toBeTruthy();
    expect(element.textContent).toContain("點擊選擇圖片");
  });

  it("初始狀態下未上傳圖片時不應顯示設定控制面板", () => {
    const panels = element.querySelector("app-tool-radio-group");
    expect(panels).toBeFalsy();
  });

  it("只接受目前 request ID 的 Worker 結果", () => {
    component["activeRequestId"] = 2;
    component["handleWorkerMessage"]({
      type: "success",
      requestId: 1,
      depthArray: new Float32Array([0.5]),
      width: 1,
      height: 1,
      minDepth: 0,
      maxDepth: 1,
      inferenceTimeMs: 4,
      device: "wasm",
    });
    expect(component.depthResult()).toBeNull();

    component["handleWorkerMessage"]({
      type: "success",
      requestId: 2,
      depthArray: new Float32Array([0.5]),
      width: 1,
      height: 1,
      minDepth: 0,
      maxDepth: 1,
      inferenceTimeMs: 4,
      device: "wasm",
    });
    expect(component.depthResult()?.width).toBe(1);
  });

  it("清除圖片時應結束 loading 並讓舊 request 失效", () => {
    component["activeRequestId"] = 7;
    component.isLoading.set(true);
    component.progressInfo.set({ status: "processing" });

    component.clearImage();

    expect(component.isLoading()).toBe(false);
    expect(component.progressInfo()).toBeNull();
    expect(component["activeRequestId"]).toBeGreaterThan(7);
  });

  it("camera rotation reuses mesh buffers and source texture", async () => {
    component.inputImageUrl.set("data:image/png;base64,mock");
    component.inputImageElement.set(new Image());
    component.imageDimensions.set({ width: 640, height: 640 });
    component.depthResult.set({
      depthArray: new Float32Array(640 * 640).fill(0.5),
      width: 640,
      height: 640,
      minDepth: 0,
      maxDepth: 1,
      inferenceTimeMs: 1,
      device: "wasm",
    });
    component.previewMode.set("mesh3d");
    await fixture.whenStable();
    component["renderCurrentView"]();
    const gl = component["gl"]!;
    expect(gl.bufferData).toHaveBeenCalledTimes(3);
    expect(gl.texImage2D).toHaveBeenCalledOnce();
    component["on3DMouseDown"](
      new MouseEvent("mousedown", { clientX: 0, clientY: 0 }),
    );
    component["on3DMouseMove"](
      new MouseEvent("mousemove", { clientX: 10, clientY: 10 }),
    );
    expect(gl.bufferData).toHaveBeenCalledTimes(3);
    expect(gl.texImage2D).toHaveBeenCalledOnce();
    component["onBrightnessChange"](10);
    component["renderCurrentView"]();
    expect(gl.bufferData).toHaveBeenCalledTimes(6);
    expect(gl.texImage2D).toHaveBeenCalledOnce();
  });

  it("3D preview preserves a planar ramp on an evenly spaced mesh", async () => {
    component.inputImageUrl.set("data:image/png;base64,mock");
    component.inputImageElement.set(new Image());
    component.imageDimensions.set({ width: 6, height: 4 });
    component.edgeSoftening.set(0);
    component.depthScale3D.set(100);
    component.depthResult.set({
      depthArray: Float32Array.from(
        { length: 24 },
        (_, i) => ((i % 6) / 5) * 0.4 + (Math.floor(i / 6) / 3) * 0.6,
      ),
      width: 6,
      height: 4,
      minDepth: 0,
      maxDepth: 1,
      inferenceTimeMs: 1,
      device: "wasm",
    });
    component.previewMode.set("mesh3d");
    await fixture.whenStable();
    component["renderCurrentView"]();
    const gl = component["gl"]!;
    const uploads = vi.mocked(gl.bufferData).mock.calls;
    const positions = uploads[0][1] as Float32Array;
    const indices = uploads[2][1] as Uint16Array;

    // The centre column falls between source pixels 2 and 3.
    expect(positions[3]).toBeCloseTo(0);
    expect(positions[5]).toBeCloseTo(0.2 * 0.8);
    expect(positions[12]).toBeCloseTo(0);
    expect(positions[14]).toBeCloseTo(0.8 * 0.8);
    expect(Array.from(indices)).toEqual([0, 4, 1, 0, 3, 4, 1, 5, 2, 1, 4, 5]);
  });

  it("只提供已確認可公開載入的 Small 模型", () => {
    expect(component.modelOptions.map((option) => option.value)).toEqual([
      "onnx-community/depth-anything-v2-small",
    ]);
    const estimate = vi.spyOn(
      component as unknown as { startDepthEstimation(): void },
      "startDepthEstimation",
    );
    component.inputImageElement.set(new Image());
    component["onModelChange"]("onnx-community/depth-anything-v2-tiny");
    expect(component.selectedModel()).toBe(
      "onnx-community/depth-anything-v2-small",
    );
    expect(estimate).not.toHaveBeenCalled();
  });

  it("切換預覽模式應更新 previewMode Signal", () => {
    expect(component.previewMode()).toBe("depth");

    component["onPreviewModeChange"]("split");
    fixture.detectChanges();
    expect(component.previewMode()).toBe("split");

    component["onPreviewModeChange"]("parallax");
    fixture.detectChanges();
    expect(component.previewMode()).toBe("parallax");

    component["onPreviewModeChange"]("mesh3d");
    fixture.detectChanges();
    expect(component.previewMode()).toBe("mesh3d");
  });

  it("切換調色盤與反轉深度應正確更新狀態", () => {
    expect(component.colorMap()).toBe("grayscale");
    expect(component.invertDepth()).toBe(false);

    component["onColorMapChange"]("viridis");
    component["onInvertToggle"]();
    fixture.detectChanges();

    expect(component.colorMap()).toBe("viridis");
    expect(component.invertDepth()).toBe(true);
  });

  it("調整對比度與亮度滑塊應更新相應 Signals", () => {
    component["onContrastChange"](120);
    component["onBrightnessChange"](15);
    fixture.detectChanges();

    expect(component.contrast()).toBe(120);
    expect(component.brightness()).toBe(15);
  });

  it("8-bit 與 16-bit 資料匯出應保留原圖尺寸及灰階格式", async () => {
    component.sourceDimensions.set({ width: 1600, height: 1000 });
    component.imageDimensions.set({ width: 640, height: 400 });
    component.depthResult.set({
      depthArray: new Float32Array(640 * 400).map(
        (_, index) => index / (640 * 400 - 1),
      ),
      width: 640,
      height: 400,
      minDepth: 0.15,
      maxDepth: 3.57,
      inferenceTimeMs: 42,
      device: "webgpu",
    });
    const hrefs: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      hrefs.push(this.href);
    });

    await component["downloadPng"]();
    await component["download16BitPng"]();

    expect(hrefs).toHaveLength(2);
    const pngs = hrefs.map((href) => {
      const base64 = href.split(",")[1] ?? "";
      return Uint8Array.from(atob(base64), (character) =>
        character.charCodeAt(0),
      );
    });
    for (const png of pngs) {
      const header = new DataView(png.buffer);
      expect(header.getUint32(16)).toBe(1600);
      expect(header.getUint32(20)).toBe(1000);
      expect(png[25]).toBe(0);
    }
    expect(pngs[0]?.[24]).toBe(8);
    expect(pngs[1]?.[24]).toBe(16);
    expect(hrefs[0]).not.toBe(hrefs[1]);
  });

  it("資料匯出不受著色盤影響，但會烘入深度反轉", async () => {
    component.sourceDimensions.set({ width: 8, height: 4 });
    component.imageDimensions.set({ width: 8, height: 4 });
    component.depthResult.set({
      depthArray: new Float32Array(32).map((_, index) => index / 31),
      width: 8,
      height: 4,
      minDepth: 0,
      maxDepth: 1,
      inferenceTimeMs: 10,
      device: "wasm",
    });
    const hrefs: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      hrefs.push(this.href);
    });

    component.colorMap.set("inferno");
    await component["downloadPng"]();
    component.colorMap.set("viridis");
    await component["downloadPng"]();
    component.invertDepth.set(true);
    await component["downloadPng"]();

    expect(hrefs[0]).toBe(hrefs[1]);
    expect(hrefs[2]).not.toBe(hrefs[1]);
  });

  it("GLB 匯出使用點擊當下的深度調整與拉伸比例", async () => {
    component.sourceImageUrl.set("data:image/png;base64,mock");
    component.sourceImageMimeType.set("image/png");
    component.sourceDimensions.set({ width: 2, height: 2 });
    component.brightness.set(-25);
    component.depthScale3D.set(35);
    component.depthResult.set({
      depthArray: new Float32Array(4).fill(1),
      width: 2,
      height: 2,
      minDepth: 0,
      maxDepth: 1,
      inferenceTimeMs: 1,
      device: "wasm",
    });
    let finishFetch!: (response: Response) => void;
    vi.spyOn(globalThis, "fetch").mockReturnValue(
      new Promise<Response>((resolve) => {
        finishFetch = resolve;
      }),
    );
    const createUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:mesh");
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const downloading = component["downloadGlb"]();
    component.brightness.set(0);
    component.depthScale3D.set(100);
    finishFetch(
      new Response(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])),
    );
    await downloading;

    expect(createUrl).toHaveBeenCalledOnce();
    const blob = createUrl.mock.calls[0][0] as Blob;
    const bytes = await new Promise<ArrayBuffer>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(blob);
    });
    const jsonLength = new DataView(bytes).getUint32(12, true);
    const json = JSON.parse(
      new TextDecoder().decode(new Uint8Array(bytes, 20, jsonLength)),
    );
    expect(json.accessors[0].min[2]).toBeCloseTo(0.75 * 0.35 * 0.8);
    expect(json.accessors[0].max[2]).toBeCloseTo(0.75 * 0.35 * 0.8);
  });

  describe.each(["清除", "銷毀"] as const)("%s後的非同步結果", (action) => {
    const invalidate = () => {
      if (action === "清除") component.clearImage();
      else fixture.destroy();
    };

    beforeEach(() => {
      component.sourceImageUrl.set("data:image/png;base64,mock");
      component.sourceImageMimeType.set("image/png");
      component.sourceDimensions.set({ width: 1, height: 1 });
      component.depthResult.set({
        depthArray: new Float32Array([0.5]),
        width: 1,
        height: 1,
        minDepth: 0,
        maxDepth: 1,
        inferenceTimeMs: 1,
        device: "wasm",
      });
      component.alertState.set({ type: "success", message: "目前的圖片" });
    });

    afterEach(() => vi.unstubAllGlobals());

    it.each(["成功", "失敗"] as const)(
      "clipboard 寫入%s不應覆蓋目前提示",
      async (outcome) => {
        let finishWrite!: () => void;
        let failWrite!: (error: Error) => void;
        const write = vi.fn().mockReturnValue(
          new Promise<void>((resolve, reject) => {
            finishWrite = resolve;
            failWrite = reject;
          }),
        );
        vi.stubGlobal("navigator", { clipboard: { write } });
        vi.stubGlobal("ClipboardItem", class {});
        vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
          (callback) => callback(new Blob(["png"], { type: "image/png" })),
        );

        const copying = component["copyToClipboard"]();
        await vi.waitFor(() => expect(write).toHaveBeenCalledOnce());
        invalidate();
        const currentAlert = component.alertState();
        if (outcome === "成功") finishWrite();
        else failWrite(new Error("Clipboard denied"));
        await copying;

        expect(component.alertState()).toBe(currentAlert);
      },
    );

    it("PNG 讀取失敗不應覆蓋目前提示", async () => {
      let failRead!: (error: Error) => void;
      const readPng = vi
        .spyOn(
          component as unknown as {
            pngBytesToDataUrl(bytes: Uint8Array): Promise<string>;
          },
          "pngBytesToDataUrl",
        )
        .mockReturnValue(
          new Promise<string>((_, reject) => {
            failRead = reject;
          }),
        );

      const downloading = component["downloadPng"]();
      await vi.waitFor(() => expect(readPng).toHaveBeenCalledOnce());
      invalidate();
      const currentAlert = component.alertState();
      failRead(new Error("FileReader failed"));
      await downloading;

      expect(component.alertState()).toBe(currentAlert);
    });

    it("GLB 貼圖讀取失敗不應覆蓋目前提示", async () => {
      let failFetch!: (error: Error) => void;
      vi.spyOn(globalThis, "fetch").mockReturnValue(
        new Promise<Response>((_, reject) => {
          failFetch = reject;
        }),
      );

      const downloading = component["downloadGlb"]();
      invalidate();
      const currentAlert = component.alertState();
      failFetch(new Error("Texture fetch failed"));
      await downloading;

      expect(component.alertState()).toBe(currentAlert);
    });
  });
});
