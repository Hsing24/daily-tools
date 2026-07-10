import { TestBed, ComponentFixture } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { TextMarkdownHtml } from "./text-markdown-html";
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

describe("TextMarkdownHtml 元件", () => {
  let fixture: ComponentFixture<TextMarkdownHtml>;
  let component: TextMarkdownHtml;
  let element: HTMLElement;
  let mockClipboardReadText: Mock;
  let mockClipboardWriteText: Mock;

  beforeEach(async () => {
    // 設置 clipboard mock
    mockClipboardReadText = vi.fn();
    mockClipboardWriteText = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      value: {
        readText: mockClipboardReadText,
        writeText: mockClipboardWriteText,
      },
      configurable: true,
      writable: true,
    });

    await TestBed.configureTestingModule({
      imports: [TextMarkdownHtml],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TextMarkdownHtml);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  it("應正確建立元件", () => {
    expect(component).toBeTruthy();
  });

  describe("初始狀態與即時更新 (T007)", () => {
    it("初始狀態下兩個輸出區塊應為空或不可見，且輸入框為空", () => {
      const textarea = element.querySelector("textarea") as HTMLTextAreaElement;
      expect(textarea.value).toBe("");

      // 檢查 outputs 是否不可見或為空
      const markdownOutput = element.querySelector(
        '[data-testid="markdown-output"]'
      );
      const htmlOutput = element.querySelector(
        '[data-testid="html-output"]'
      );

      expect(markdownOutput).toBeNull();
      expect(htmlOutput).toBeNull();
    });

    it("在輸入框中輸入文字後，Markdown 與 HTML 輸出應同步即時更新", async () => {
      const textarea = element.querySelector("textarea") as HTMLTextAreaElement;
      textarea.value = "第一段\n\n第二段";
      textarea.dispatchEvent(new Event("input"));
      fixture.detectChanges();

      await fixture.whenStable();
      fixture.detectChanges();

      const markdownOutput = element.querySelector(
        '[data-testid="markdown-output"]'
      ) as HTMLElement;
      const htmlOutput = element.querySelector(
        '[data-testid="html-output"]'
      ) as HTMLElement;

      expect(markdownOutput).toBeTruthy();
      expect(htmlOutput).toBeTruthy();

      expect(markdownOutput.textContent?.trim()).toContain("第一段");
      expect(markdownOutput.textContent?.trim()).toContain("第二段");
      expect(htmlOutput.textContent?.trim()).toContain("<p>第一段</p>");
      expect(htmlOutput.textContent?.trim()).toContain("<p>第二段</p>");
    });
  });

  describe("剪貼簿貼上功能 (T008)", () => {
    it("當剪貼簿讀取成功時，應取代輸入區內容並觸發轉換", async () => {
      mockClipboardReadText.mockResolvedValue("貼上的測試內容\n\n第二行測試");

      const pasteButton = element.querySelector(
        '[data-testid="btn-paste"]'
      ) as HTMLButtonElement;
      pasteButton.click();
      fixture.detectChanges();

      // 由於 readText 是 Promise，需要等 Microtask 執行完畢
      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const textarea = element.querySelector("textarea") as HTMLTextAreaElement;
      expect(textarea.value).toBe("貼上的測試內容\n\n第二行測試");

      const markdownOutput = element.querySelector(
        '[data-testid="markdown-output"]'
      ) as HTMLElement;
      expect(markdownOutput).toBeTruthy();
      expect(markdownOutput.textContent?.trim()).toContain("貼上的測試內容");
    });

    it("當剪貼簿讀取失敗或不支援時，應顯示提示訊息且輸入框內容不變", async () => {
      mockClipboardReadText.mockRejectedValue(new Error("Permission denied"));

      const textarea = element.querySelector("textarea") as HTMLTextAreaElement;
      textarea.value = "原本內容";
      textarea.dispatchEvent(new Event("input"));
      fixture.detectChanges();

      const pasteButton = element.querySelector(
        '[data-testid="btn-paste"]'
      ) as HTMLButtonElement;
      pasteButton.click();
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(textarea.value).toBe("原本內容");

      const alertArea = element.querySelector(
        '[data-testid="alert-message"]'
      ) as HTMLElement;
      expect(alertArea).toBeTruthy();
      expect(alertArea.textContent).toContain("無法讀取剪貼簿");
    });
  });

  describe("複製功能 (T014 & T015)", () => {
    beforeEach(async () => {
      // 確保輸入框有內容，以顯示輸出區塊
      const textarea = element.querySelector("textarea") as HTMLTextAreaElement;
      textarea.value = "待複製文字";
      textarea.dispatchEvent(new Event("input"));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    });

    it("當 Markdown 複製成功時，應寫入剪貼簿並顯示「已複製」提示", async () => {
      mockClipboardWriteText.mockResolvedValue(undefined);

      const copyBtn = element.querySelector(
        '[data-testid="btn-copy-markdown"]'
      ) as HTMLButtonElement;
      expect(copyBtn).toBeTruthy();
      copyBtn.click();
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();

      expect(mockClipboardWriteText).toHaveBeenCalledWith("待複製文字");
      
      const copyStatus = element.querySelector(
        '[data-testid="copy-markdown-status"]'
      ) as HTMLElement;
      expect(copyStatus).toBeTruthy();
      expect(copyStatus.textContent?.trim()).toContain("已複製");
    });

    it("當 HTML 複製成功時，應寫入剪貼簿並顯示「已複製」提示", async () => {
      mockClipboardWriteText.mockResolvedValue(undefined);

      const copyBtn = element.querySelector(
        '[data-testid="btn-copy-html"]'
      ) as HTMLButtonElement;
      expect(copyBtn).toBeTruthy();
      copyBtn.click();
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();

      expect(mockClipboardWriteText).toHaveBeenCalledWith("<p>待複製文字</p>");

      const copyStatus = element.querySelector(
        '[data-testid="copy-html-status"]'
      ) as HTMLElement;
      expect(copyStatus).toBeTruthy();
      expect(copyStatus.textContent?.trim()).toContain("已複製");
    });

    it("當寫入剪貼簿失敗時，應顯示失敗提示且不拋出異常", async () => {
      mockClipboardWriteText.mockRejectedValue(new Error("Write error"));

      const copyBtn = element.querySelector(
        '[data-testid="btn-copy-markdown"]'
      ) as HTMLButtonElement;
      copyBtn.click();
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();

      const copyStatus = element.querySelector(
        '[data-testid="copy-markdown-status"]'
      ) as HTMLElement;
      expect(copyStatus).toBeTruthy();
      expect(copyStatus.textContent?.trim()).toContain("複製失敗");
    });
  });

  describe("清除功能 (T018 & T019)", () => {
    it("在有內容時按「清除」按鈕，應能清空輸入框與所有狀態提示", async () => {
      // 1. 設定初始內容
      const textarea = element.querySelector("textarea") as HTMLTextAreaElement;
      textarea.value = "待清除文字";
      textarea.dispatchEvent(new Event("input"));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      // 模擬設定一些 status message
      component["clipboardAlert"].set("測試提示");
      component["copyMarkdownStatus"].set("已複製");
      component["copyHtmlStatus"].set("已複製");
      fixture.detectChanges();

      expect(textarea.value).toBe("待清除文字");

      // 2. 點擊清除按鈕
      const clearBtn = element.querySelector(
        '[data-testid="btn-clear"]'
      ) as HTMLButtonElement;
      expect(clearBtn).toBeTruthy();
      clearBtn.click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      // 3. 驗證全部重設
      expect(textarea.value).toBe("");
      expect(component["sourceText"]()).toBe("");
      expect(component["clipboardAlert"]()).toBe("");
      expect(component["copyMarkdownStatus"]()).toBe("");
      expect(component["copyHtmlStatus"]()).toBe("");
      expect(component["isProcessing"]()).toBe(false);

      // 輸出區塊此時應該不存在於 DOM 中
      const markdownOutput = element.querySelector(
        '[data-testid="markdown-output"]'
      );
      expect(markdownOutput).toBeNull();
    });

    it("空狀態下點擊「清除」不應報出錯誤", () => {
      const clearBtn = element.querySelector(
        '[data-testid="btn-clear"]'
      ) as HTMLButtonElement;
      expect(() => {
        clearBtn.click();
        fixture.detectChanges();
      }).not.toThrow();
    });
  });

  describe("格式切換與 Radio 控制 (新功能)", () => {
    beforeEach(async () => {
      // 確保輸入框有內容，以顯示輸出區塊
      const textarea = element.querySelector("textarea") as HTMLTextAreaElement;
      textarea.value = "測試格式切換文字";
      textarea.dispatchEvent(new Event("input"));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    });

    it("預設輸出格式應為 Markdown，且顯示 Markdown 區塊，隱藏 HTML 區塊", () => {
      const markdownOutput = element.querySelector(
        '[data-testid="markdown-output"]'
      ) as HTMLElement;
      const htmlOutput = element.querySelector(
        '[data-testid="html-output"]'
      ) as HTMLElement;

      expect(markdownOutput).toBeTruthy();
      expect(htmlOutput).toBeTruthy();

      expect(markdownOutput.style.display).toBe("block");
      expect(htmlOutput.style.display).toBe("none");
    });

    it("切換 Radio 到 HTML 時，應隱藏 Markdown 區塊，顯示 HTML 區塊", async () => {
      const radioHtml = element.querySelector(
        'input[value="html"]'
      ) as HTMLInputElement;
      expect(radioHtml).toBeTruthy();

      // 點擊切換
      radioHtml.click();
      radioHtml.dispatchEvent(new Event("change"));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const markdownOutput = element.querySelector(
        '[data-testid="markdown-output"]'
      ) as HTMLElement;
      const htmlOutput = element.querySelector(
        '[data-testid="html-output"]'
      ) as HTMLElement;

      expect(markdownOutput.style.display).toBe("none");
      expect(htmlOutput.style.display).toBe("block");
    });
  });
});
