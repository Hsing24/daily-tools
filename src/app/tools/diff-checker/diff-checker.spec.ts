import { TestBed, ComponentFixture } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { DiffChecker } from "./diff-checker";
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

describe("DiffChecker 元件", () => {
  let fixture: ComponentFixture<DiffChecker>;
  let component: DiffChecker;
  let element: HTMLElement;
  let mockClipboardReadText: Mock;

  beforeEach(async () => {
    vi.useFakeTimers();

    mockClipboardReadText = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      value: {
        readText: mockClipboardReadText,
      },
      configurable: true,
      writable: true,
    });

    await TestBed.configureTestingModule({
      imports: [DiffChecker],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(DiffChecker);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("應正確建立元件", () => {
    expect(component).toBeTruthy();
  });

  it("初始狀態下輸入框為空，且不顯示比對結果區", () => {
    const textareas = element.querySelectorAll("textarea");
    expect(textareas.length).toBe(2);
    expect(textareas[0].value).toBe("");
    expect(textareas[1].value).toBe("");

    const terminalOutput = element.querySelector("app-terminal-output");
    expect(terminalOutput).toBeFalsy();
  });

  it("當使用者點擊比對時，應自動排版、鎖住輸入並顯示掃描動畫，1.2秒後呈現結果", async () => {
    const textareas = element.querySelectorAll("textarea");
    
    // 輸入含前後空白與空白行的文字
    textareas[0].value = "  hello world  \n\n  test  ";
    textareas[0].dispatchEvent(new Event("input"));
    
    textareas[1].value = "  hello brave world  \n  test  ";
    textareas[1].dispatchEvent(new Event("input"));

    fixture.detectChanges();

    // 取得「開始比對」按鈕並點擊
    const compareBtn = element.querySelector(
      '[data-testid="btn-compare"]'
    ) as HTMLButtonElement;
    expect(compareBtn).toBeTruthy();
    compareBtn.click();
    fixture.detectChanges();

    // 1. 確認已自動套用排版：去除首尾空白且移除空行
    // textA -> "hello world\ntest"
    // textB -> "hello brave world\ntest"
    expect(component["textA"]()).toBe("hello world\ntest");
    expect(component["textB"]()).toBe("hello brave world\ntest");

    // 2. 確認進入比對中狀態，且出現掃描 mask
    expect(component["isComparing"]()).toBe(true);
    let masks = element.querySelectorAll(".scan-laser");
    expect(masks.length).toBe(2);

    // 3. 模擬前進 1.2 秒
    vi.advanceTimersByTime(1200);
    fixture.detectChanges();
    await fixture.whenStable();

    // 4. 比對完成，確認 mask 移除，結果區出現
    expect(component["isComparing"]()).toBe(false);
    expect(component["hasResult"]()).toBe(true);
    
    masks = element.querySelectorAll(".scan-laser");
    expect(masks.length).toBe(0);

    const terminalOutput = element.querySelector("app-terminal-output");
    expect(terminalOutput).toBeTruthy();
  });

  it("在顯示結果後，若任一欄位有新輸入或空白鍵，應立刻隱藏結果區", async () => {
    // 進行比對
    const textareas = element.querySelectorAll("textarea");
    textareas[0].value = "hello";
    textareas[0].dispatchEvent(new Event("input"));
    textareas[1].value = "world";
    textareas[1].dispatchEvent(new Event("input"));
    fixture.detectChanges();

    const compareBtn = element.querySelector(
      '[data-testid="btn-compare"]'
    ) as HTMLButtonElement;
    compareBtn.click();
    
    vi.advanceTimersByTime(1200);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component["hasResult"]()).toBe(true);
    expect(element.querySelector("app-terminal-output")).toBeTruthy();

    // 輸入空白鍵
    textareas[0].value = "hello ";
    textareas[0].dispatchEvent(new Event("input"));
    fixture.detectChanges();

    // 確認結果隱藏
    expect(component["hasResult"]()).toBe(false);
    expect(element.querySelector("app-terminal-output")).toBeFalsy();
  });

  it("貼上功能應能讀取剪貼簿並填入對應的輸入欄位", async () => {
    mockClipboardReadText.mockResolvedValue("clipboard content");

    const pasteBtns = element.querySelectorAll("button.dt-button--primary");
    // 左欄貼上按鈕
    (pasteBtns[0] as HTMLButtonElement).click();
    fixture.detectChanges();
    await vi.runAllTimersAsync();

    expect(component["textA"]()).toBe("clipboard content");
  });

  it("清除按鈕應清空對應的輸入欄位", () => {
    component["textA"].set("some text");
    fixture.detectChanges();

    const clearBtns = element.querySelectorAll("button.dt-button--warning");
    (clearBtns[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component["textA"]()).toBe("");
  });
});
