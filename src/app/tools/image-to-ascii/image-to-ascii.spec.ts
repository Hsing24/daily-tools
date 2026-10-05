import { TestBed, ComponentFixture } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { ImageToAscii } from "./image-to-ascii";
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("ImageToAscii 元件", () => {
  let fixture: ComponentFixture<ImageToAscii>;
  let component: ImageToAscii;
  let element: HTMLElement;

  beforeEach(async () => {
    // 設置 CanvasRenderingContext2D mock，因為 jsdom 可能不完全支援 Canvas
    const mockContext = {
      scale: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({
        data: new Uint8ClampedArray(400) // 10x10 rgba
      })
    };

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockContext);

    await TestBed.configureTestingModule({
      imports: [ImageToAscii],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ImageToAscii);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  it("應正確建立元件", () => {
    expect(component).toBeTruthy();
  });

  it("預覽沿用取樣字格比例，無字元動畫也能啟用 CRT 閃爍", async () => {
    const raf = vi
      .spyOn(globalThis, "requestAnimationFrame")
      .mockReturnValue(23);
    const cancel = vi
      .spyOn(globalThis, "cancelAnimationFrame")
      .mockImplementation(() => {});
    try {
      component["uploadedImage"].set("data:image/png;base64,fixture");
      await fixture.whenStable();
      component["asciiResult"].set({
        width: 2,
        height: 1,
        chars: ["👾", "田"],
        charAspectRatio: 0.5,
      });
      await fixture.whenStable();
      const canvas = element.querySelector("canvas")!;
      expect(canvas.style.width).toBe("12px");
      expect(canvas.style.height).toBe("12px");
      const context = canvas.getContext("2d")!;
      expect(context.fillText).toHaveBeenCalledWith("👾", 0, 0, 6);
      expect(context.fillText).toHaveBeenCalledWith("田", 6, 0, 6);
      // Angular 自身也會排 RAF；只檢查 ASCII draw callback。
      expect(
        raf.mock.calls.some(([callback]) => callback.name === "draw"),
      ).toBe(false);

      component["flicker"].set(true);
      await fixture.whenStable();
      expect(
        raf.mock.calls.some(([callback]) => callback.name === "draw"),
      ).toBe(true);
      fixture.destroy();
      expect(cancel).toHaveBeenCalledWith(23);
    } finally {
      raf.mockRestore();
      cancel.mockRestore();
    }
  });

  it("初始狀態下不應顯示編輯區，而應顯示圖片拖放上傳區", () => {
    const dropZone = element.querySelector("input[type='file']");
    expect(dropZone).toBeTruthy();

    // 不應有清除按鈕或 Canvas 預覽
    const clearBtn = element.querySelector("button.dt-button--warning");
    expect(clearBtn).toBeNull();
  });

  describe("上傳與清空狀態控制", () => {
    it("清除圖片應重設上傳狀態", () => {
      // 模擬手動將圖片載入
      component["uploadedImage"].set("data:image/png;base64,iVBORw0KGgoAAA");
      fixture.detectChanges();

      // 此時應該有清除按鈕
      let clearBtn = element.querySelector("button.dt-button--warning") as HTMLButtonElement;
      expect(clearBtn).toBeTruthy();

      // 點選清除
      clearBtn.click();
      fixture.detectChanges();

      // 回到初始拖放區
      expect(component["uploadedImage"]()).toBeNull();
      const dropZone = element.querySelector("input[type='file']");
      expect(dropZone).toBeTruthy();
    });
  });

  describe("參數微調連動", () => {
    it("修改亮度與對比度應更新 Signal", () => {
      component["uploadedImage"].set("data:image/png;base64,iVBORw0KGgoAAA");
      fixture.detectChanges();

      // 預設
      expect(component["contrast"]()).toBe(0);
      expect(component["brightness"]()).toBe(0);

      // 修改
      component["contrast"].set(15);
      component["brightness"].set(-10);
      fixture.detectChanges();

      expect(component["contrast"]()).toBe(15);
      expect(component["brightness"]()).toBe(-10);
    });
  });
});
