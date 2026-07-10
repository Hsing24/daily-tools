import { Component, signal, computed } from "@angular/core";
import { TerminalOutput } from "../../shared/ui/terminal-output/terminal-output";
import { ToolAlert } from "../../shared/ui/tool-alert/tool-alert";
import { ToolBreadcrumb } from "../../shared/ui/tool-breadcrumb/tool-breadcrumb";
import { ToolHeader } from "../../shared/ui/tool-header/tool-header";
import { ToolPanel } from "../../shared/ui/tool-panel/tool-panel";
import {
  convertTextToMarkdownAndHtml,
  convertHtmlToMarkdown,
  TextConversionResult,
} from "./text-markdown-html-converter";

@Component({
  selector: "app-text-markdown-html",
  imports: [
    TerminalOutput,
    ToolAlert,
    ToolBreadcrumb,
    ToolHeader,
    ToolPanel,
  ],
  templateUrl: "./text-markdown-html.html",
  styleUrl: "./text-markdown-html.css",
})
export class TextMarkdownHtml {
  protected readonly sourceText = signal("");
  protected readonly isProcessing = signal(false);
  protected readonly clipboardAlert = signal("");
  protected readonly copyMarkdownStatus = signal("");
  protected readonly copyHtmlStatus = signal("");
  protected readonly outputFormat = signal<"markdown" | "html">("markdown");

  private readonly conversionResultSignal = signal<TextConversionResult>({
    markdown: "",
    html: "",
  });

  protected readonly conversionResult = computed(() =>
    this.conversionResultSignal()
  );

  private pendingTimeoutId: any = null;

  protected onInput(value: string): void {
    this.sourceText.set(value);
    this.updateResult(value);
  }

  protected onPaste(event: ClipboardEvent): void {
    const clipboardData = event.clipboardData;
    if (clipboardData && clipboardData.types.includes("text/html")) {
      event.preventDefault();
      const htmlText = clipboardData.getData("text/html");
      const markdown = convertHtmlToMarkdown(htmlText);
      this.sourceText.set(markdown);
      this.updateResult(markdown);
    }
  }

  protected onFormatChange(format: "markdown" | "html"): void {
    this.outputFormat.set(format);
  }

  protected updateResult(value: string): void {
    if (this.pendingTimeoutId !== null) {
      clearTimeout(this.pendingTimeoutId);
      this.pendingTimeoutId = null;
    }

    if (value.length > 20000) {
      this.isProcessing.set(true);
      this.pendingTimeoutId = setTimeout(() => {
        const result = convertTextToMarkdownAndHtml(value);
        this.conversionResultSignal.set(result);
        this.isProcessing.set(false);
        this.pendingTimeoutId = null;
      }, 0);
    } else {
      const result = convertTextToMarkdownAndHtml(value);
      this.conversionResultSignal.set(result);
      this.isProcessing.set(false);
    }
  }

  protected async paste(): Promise<void> {
    this.clipboardAlert.set("");
    try {
      // 嘗試讀取富文本 HTML
      if (
        navigator.clipboard &&
        typeof navigator.clipboard.read === "function"
      ) {
        const clipboardItems = await navigator.clipboard.read();
        let pasted = false;
        for (const item of clipboardItems) {
          if (item.types.includes("text/html")) {
            const blob = await item.getType("text/html");
            const htmlText = await blob.text();
            const markdown = convertHtmlToMarkdown(htmlText);
            this.sourceText.set(markdown);
            this.updateResult(markdown);
            pasted = true;
            break;
          }
        }
        if (pasted) return;
      }

      // 如果不支援或沒有 HTML 格式， fallback 至 readText 讀取純文字
      if (
        !navigator.clipboard ||
        typeof navigator.clipboard.readText !== "function"
      ) {
        throw new Error("Clipboard API not supported");
      }
      const clipboardText = await navigator.clipboard.readText();
      this.sourceText.set(clipboardText);
      this.updateResult(clipboardText);
    } catch (err) {
      this.clipboardAlert.set(
        "無法讀取剪貼簿，請使用 Ctrl+V / ⌘+V 鍵貼入內容，或手動開啟瀏覽器剪貼簿權限。"
      );
    }
  }

  protected clear(): void {
    this.sourceText.set("");
    this.clipboardAlert.set("");
    this.copyMarkdownStatus.set("");
    this.copyHtmlStatus.set("");
    this.outputFormat.set("markdown");
    this.isProcessing.set(false);
    if (this.pendingTimeoutId !== null) {
      clearTimeout(this.pendingTimeoutId);
      this.pendingTimeoutId = null;
    }
    this.conversionResultSignal.set({ markdown: "", html: "" });
  }

  protected async copyMarkdown(): Promise<void> {
    this.copyMarkdownStatus.set("");
    try {
      if (
        !navigator.clipboard ||
        typeof navigator.clipboard.writeText !== "function"
      ) {
        throw new Error("Clipboard API not supported");
      }
      await navigator.clipboard.writeText(this.conversionResult().markdown);
      this.copyMarkdownStatus.set("已複製！");
      setTimeout(() => {
        this.copyMarkdownStatus.set("");
      }, 2000);
    } catch (err) {
      this.copyMarkdownStatus.set("複製失敗");
    }
  }

  protected async copyHtml(): Promise<void> {
    this.copyHtmlStatus.set("");
    try {
      if (
        !navigator.clipboard ||
        typeof navigator.clipboard.writeText !== "function"
      ) {
        throw new Error("Clipboard API not supported");
      }
      await navigator.clipboard.writeText(this.conversionResult().html);
      this.copyHtmlStatus.set("已複製！");
      setTimeout(() => {
        this.copyHtmlStatus.set("");
      }, 2000);
    } catch (err) {
      this.copyHtmlStatus.set("複製失敗");
    }
  }
}
