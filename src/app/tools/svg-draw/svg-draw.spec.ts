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
  });

  it("應該成功建立元件", () => {
    expect(component).toBeTruthy();
  });

  it("初始狀態為 idle，並且應該渲染上傳區而非主面板", () => {
    expect(component["status"]()).toBe("idle");
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector(".drop-zone")).toBeTruthy();
    expect(compiled.querySelector(".svg-draw__panels")).toBeFalsy();
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
    expect(compiled.querySelector(".drop-zone")).toBeFalsy();
    expect(compiled.querySelector(".svg-draw__panels")).toBeTruthy();

    const estimateVal = compiled.querySelector(".svg-draw__estimate-value");
    expect(estimateVal?.textContent).toContain("約 1 秒");
  });

  it("當預估時間大於等於 120 秒時，預估時間區域應套用警告樣式並顯示警告字樣", async () => {
    // 4000x3000 = 12,000,000 pixels. Rate for pixel_perfect is 50,000 px/sec.
    // 12M / 50K = 240s >= 120s
    component["sourceFile"].set(new File(["dummy"], "big.png", { type: "image/png" }));
    component["sourcePreviewUrl"].set("blob:mock-url");
    component["sourceWidth"].set(4000);
    component["sourceHeight"].set(3000);
    component["status"].set("ready");

    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const estimateBox = compiled.querySelector(".svg-draw__estimate");
    expect(estimateBox?.classList.contains("svg-draw__estimate--warning")).toBe(true);

    const warningText = compiled.querySelector(".svg-draw__estimate-warning");
    expect(warningText).toBeTruthy();
    expect(warningText?.textContent).toContain("圖片較複雜");
  });

  it("重設按鈕點擊後應該回到 idle 狀態並清理相關訊號", async () => {
    component["sourceFile"].set(new File(["dummy"], "test.png", { type: "image/png" }));
    component["sourcePreviewUrl"].set("blob:mock-url");
    component["status"].set("ready");

    component["reset"]();
    fixture.detectChanges();

    expect(component["status"]()).toBe("idle");
    expect(component["sourceFile"]()).toBeNull();
    expect(component["sourcePreviewUrl"]()).toBe("");
  });
});
