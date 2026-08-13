import { TestBed, ComponentFixture } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { DepthEstimator } from "./depth-estimator";
import { describe, it, expect, beforeEach, vi } from "vitest";

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
    fixture.detectChanges();
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
});
