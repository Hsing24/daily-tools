import { TestBed, ComponentFixture } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { ImageConverter } from "./image-converter";
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
      type?: string
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
});
