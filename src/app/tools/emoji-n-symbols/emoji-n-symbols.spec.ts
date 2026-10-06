import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { EmojiNSymbols } from "./emoji-n-symbols";

describe("EmojiNSymbols", () => {
  let clipboardText = "";
  let clipboardShouldFail = false;

  beforeEach(async () => {
    clipboardText = "";
    clipboardShouldFail = false;

    // Stub navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(async (text: string) => {
          if (clipboardShouldFail) {
            throw new Error("Clipboard error");
          }
          clipboardText = text;
        }),
      },
    });

    // Stub Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();

    await TestBed.configureTestingModule({
      imports: [EmojiNSymbols],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("應成功建立元件並渲染標題、搜尋輸入框與分類錨點導覽", async () => {
    const fixture = TestBed.createComponent(EmojiNSymbols);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector("h1")?.textContent).toContain("符號百寶箱");
    expect(compiled.querySelector("#symbol-search-input")).toBeTruthy();

    // 檢查分類錨點按鈕存在
    const anchorBtn = compiled.querySelector("[data-testid='cat-anchor-數學符號']");
    expect(anchorBtn).toBeTruthy();
    expect(anchorBtn?.textContent).toContain("數學符號");
  });

  it("預設應渲染全部符號清單，依分類區塊組織且總數大於 200", async () => {
    const fixture = TestBed.createComponent(EmojiNSymbols);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = compiled.querySelectorAll("[data-testid^='symbol-btn-']");
    expect(buttons.length).toBeGreaterThanOrEqual(200);

    // 檢查各分類區塊有對應 id
    const mathSection = compiled.querySelector("#category-section-數學符號");
    expect(mathSection).toBeTruthy();
  });

  it("搜尋關鍵字與 Unicode 碼位時應即時過濾各分類區塊", async () => {
    const fixture = TestBed.createComponent(EmojiNSymbols);
    fixture.detectChanges();
    await fixture.whenStable();

    const input = fixture.nativeElement.querySelector("#symbol-search-input") as HTMLInputElement;
    input.value = "2192";
    input.dispatchEvent(new Event("input"));
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const rightArrowBtn = compiled.querySelector("[data-testid='symbol-btn-向右箭頭']");
    expect(rightArrowBtn).toBeTruthy();

    // 搜尋不存在的關鍵字
    input.value = "nonexistentkeyword999";
    input.dispatchEvent(new Event("input"));
    fixture.detectChanges();
    await fixture.whenStable();

    const emptyState = compiled.querySelector("[data-testid='empty-state']");
    expect(emptyState).toBeTruthy();
    expect(emptyState?.textContent).toContain("找不到符合條件的符號");
  });

  it("點擊分類錨點應平滑滾動至對應區塊並觸發亮起效果", async () => {
    const fixture = TestBed.createComponent(EmojiNSymbols);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const mathAnchor = compiled.querySelector("[data-testid='cat-anchor-數學符號']") as HTMLButtonElement;
    expect(mathAnchor).toBeTruthy();

    const mathSection = compiled.querySelector("#category-section-數學符號") as HTMLElement;
    expect(mathSection).toBeTruthy();
    const scrollSpy = vi.spyOn(mathSection, "scrollIntoView");

    mathAnchor.click();
    fixture.detectChanges();

    // 驗證 scrollIntoView 有被呼叫
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });

    // 稍待微秒讓亮起 signal 更新
    await new Promise((resolve) => setTimeout(resolve, 20));
    fixture.detectChanges();

    expect(mathSection.classList.contains("category-highlight")).toBe(true);
  });

  it("點擊符號按鈕應複製字元並顯示成功提示", async () => {
    const fixture = TestBed.createComponent(EmojiNSymbols);
    fixture.detectChanges();
    await fixture.whenStable();

    const arrowBtn = fixture.nativeElement.querySelector("[data-testid='symbol-btn-向右箭頭']") as HTMLButtonElement;
    arrowBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("→");
    expect(clipboardText).toBe("→");

    const alert = fixture.nativeElement.querySelector("[data-testid='alert-message']");
    expect(alert?.textContent).toContain("已複製「→」至剪貼簿！");
  });

  it("剪貼簿複製失敗時應顯示錯誤提示", async () => {
    clipboardShouldFail = true;
    const fixture = TestBed.createComponent(EmojiNSymbols);
    fixture.detectChanges();
    await fixture.whenStable();

    const arrowBtn = fixture.nativeElement.querySelector("[data-testid='symbol-btn-向右箭頭']") as HTMLButtonElement;
    arrowBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    await fixture.whenStable();

    const alert = fixture.nativeElement.querySelector("[data-testid='alert-message']");
    expect(alert?.textContent).toContain("字元複製失敗");
  });

  it("詳細資訊面板可複製碼位與 HTML Entity", async () => {
    const fixture = TestBed.createComponent(EmojiNSymbols);
    fixture.detectChanges();
    await fixture.whenStable();

    const copyCodePointBtn = fixture.nativeElement.querySelector("[data-testid='btn-copy-codepoint']") as HTMLButtonElement;
    copyCodePointBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("U+1F600");

    const copyEntityBtn = fixture.nativeElement.querySelector("[data-testid='btn-copy-entity']") as HTMLButtonElement;
    copyEntityBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("&#x1F600;");
  });

  it("navigator.clipboard 不存在時應顯示錯誤提示", async () => {
    Object.assign(navigator, { clipboard: undefined });
    const fixture = TestBed.createComponent(EmojiNSymbols);
    fixture.detectChanges();
    await fixture.whenStable();

    const arrowBtn = fixture.nativeElement.querySelector("[data-testid='symbol-btn-向右箭頭']") as HTMLButtonElement;
    arrowBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    await fixture.whenStable();

    const alert = fixture.nativeElement.querySelector("[data-testid='alert-message']");
    expect(alert?.textContent).toContain("字元複製失敗");
  });
});
