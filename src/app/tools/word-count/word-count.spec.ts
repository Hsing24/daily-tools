import { TestBed, ComponentFixture } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { WordCount } from "./word-count";
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

describe("WordCount 元件", () => {
  let fixture: ComponentFixture<WordCount>;
  let component: WordCount;
  let element: HTMLElement;
  let mockClipboardReadText: Mock;

  beforeEach(async () => {
    // 設置 clipboard mock
    mockClipboardReadText = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      value: {
        readText: mockClipboardReadText,
      },
      configurable: true,
      writable: true,
    });

    await TestBed.configureTestingModule({
      imports: [WordCount],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(WordCount);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  it("應正確建立元件", () => {
    expect(component).toBeTruthy();
  });

  describe("初始與輸入即時統計 (T006)", () => {
    it("初始狀態下四項指標應顯示為 0，且輸入框為空", () => {
      const textarea = element.querySelector("textarea") as HTMLTextAreaElement;
      expect(textarea.value).toBe("");

      // 檢查統計數據顯示
      const charWithSpaces = element.querySelector(
        '[data-testid="stat-chars-with-spaces"]',
      ) as HTMLElement;
      const charNoSpaces = element.querySelector(
        '[data-testid="stat-chars-no-spaces"]',
      ) as HTMLElement;
      const words = element.querySelector(
        '[data-testid="stat-words"]',
      ) as HTMLElement;
      const lines = element.querySelector(
        '[data-testid="stat-lines"]',
      ) as HTMLElement;

      expect(charWithSpaces.textContent?.trim()).toBe("0");
      expect(charNoSpaces.textContent?.trim()).toBe("0");
      expect(words.textContent?.trim()).toBe("0");
      expect(lines.textContent?.trim()).toBe("0");
    });

    it("在輸入框中輸入文字後，應能即時統計並顯示正確的結果", async () => {
      const textarea = element.querySelector("textarea") as HTMLTextAreaElement;
      textarea.value = "你好 world";
      textarea.dispatchEvent(new Event("input"));
      fixture.detectChanges();

      await fixture.whenStable();

      const charWithSpaces = element.querySelector(
        '[data-testid="stat-chars-with-spaces"]',
      ) as HTMLElement;
      const charNoSpaces = element.querySelector(
        '[data-testid="stat-chars-no-spaces"]',
      ) as HTMLElement;
      const words = element.querySelector(
        '[data-testid="stat-words"]',
      ) as HTMLElement;
      const lines = element.querySelector(
        '[data-testid="stat-lines"]',
      ) as HTMLElement;

      expect(charWithSpaces.textContent?.trim()).toBe("8");
      expect(charNoSpaces.textContent?.trim()).toBe("7");
      expect(words.textContent?.trim()).toBe("3");
      expect(lines.textContent?.trim()).toBe("1");
    });
  });

  describe("剪貼簿貼上功能 (T007)", () => {
    it("當剪貼簿讀取成功時，應將其內容貼入輸入框並更新統計數據", async () => {
      mockClipboardReadText.mockResolvedValue("貼上的測試文字 123");

      const pasteButton = element.querySelector(
        '[data-testid="btn-paste"]',
      ) as HTMLButtonElement;
      pasteButton.click();
      fixture.detectChanges();

      // 由於 readText 是 Promise，需要等 Microtask 執行完畢
      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();
      await fixture.whenStable();

      const textarea = element.querySelector("textarea") as HTMLTextAreaElement;
      expect(textarea.value).toBe("貼上的測試文字 123");

      // 統計數據：貼上的測試文字 123
      // 碼點：7 + 1 + 3 = 11 字元
      // words: 中文 7 + 英文單字 1 = 8
      const charWithSpaces = element.querySelector(
        '[data-testid="stat-chars-with-spaces"]',
      ) as HTMLElement;
      const words = element.querySelector(
        '[data-testid="stat-words"]',
      ) as HTMLElement;

      expect(charWithSpaces.textContent?.trim()).toBe("11");
      expect(words.textContent?.trim()).toBe("8");
    });

    it("當剪貼簿讀取失敗或拒絕時，應維持原內容並顯示繁體中文的錯誤提示訊息", async () => {
      mockClipboardReadText.mockRejectedValue(new Error("Permission denied"));

      const textarea = element.querySelector("textarea") as HTMLTextAreaElement;
      textarea.value = "原有的文字";
      textarea.dispatchEvent(new Event("input"));
      fixture.detectChanges();

      const pasteButton = element.querySelector(
        '[data-testid="btn-paste"]',
      ) as HTMLButtonElement;
      pasteButton.click();
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();
      await fixture.whenStable();

      // 輸入框應保持原本文字
      expect(textarea.value).toBe("原有的文字");

      // 檢查是否顯示繁體中文的剪貼簿錯誤提示
      const alertArea = element.querySelector(
        '[data-testid="alert-message"]',
      ) as HTMLElement;
      expect(alertArea).toBeTruthy();
      expect(alertArea.textContent).toContain("無法讀取剪貼簿");
    });
  });

  describe("清除功能 (T012)", () => {
    it("在有內容時按「清除」按鈕，應能清空輸入框、統計數據並重設提示", async () => {
      const textarea = element.querySelector("textarea") as HTMLTextAreaElement;
      textarea.value = "待清除的文字";
      textarea.dispatchEvent(new Event("input"));
      fixture.detectChanges();

      // 確保統計不是 0
      const charWithSpaces = element.querySelector(
        '[data-testid="stat-chars-with-spaces"]',
      ) as HTMLElement;
      expect(charWithSpaces.textContent?.trim()).not.toBe("0");

      // 觸發錯誤提示
      mockClipboardReadText.mockRejectedValue(new Error("Denied"));
      const pasteButton = element.querySelector(
        '[data-testid="btn-paste"]',
      ) as HTMLButtonElement;
      pasteButton.click();
      fixture.detectChanges();
      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();

      const alertAreaBefore = element.querySelector(
        '[data-testid="alert-message"]',
      ) as HTMLElement;
      expect(alertAreaBefore).toBeTruthy();

      // 點選清除按鈕
      const clearButton = element.querySelector(
        '[data-testid="btn-clear"]',
      ) as HTMLButtonElement;
      clearButton.click();
      fixture.detectChanges();
      await fixture.whenStable();

      // 驗證清空
      expect(textarea.value).toBe("");
      expect(element.querySelector('[data-testid="alert-message"]')).toBeNull();
      expect(charWithSpaces.textContent?.trim()).toBe("0");
    });

    it("空狀態下點擊「清除」不應報出錯誤", () => {
      const clearButton = element.querySelector(
        '[data-testid="btn-clear"]',
      ) as HTMLButtonElement;
      expect(() => {
        clearButton.click();
        fixture.detectChanges();
      }).not.toThrow();
    });
  });
});
