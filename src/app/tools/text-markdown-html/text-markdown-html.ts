import { Component, DestroyRef, computed, inject, signal } from "@angular/core";
import { TerminalOutput } from "../../shared/ui/terminal-output/terminal-output";
import { ToolAlert } from "../../shared/ui/tool-alert/tool-alert";
import { ToolBreadcrumb } from "../../shared/ui/tool-breadcrumb/tool-breadcrumb";
import { ToolHeader } from "../../shared/ui/tool-header/tool-header";
import { ToolPanel } from "../../shared/ui/tool-panel/tool-panel";
import { ToolRadioGroup } from "../../shared/ui/tool-radio-group/tool-radio-group";
import {
  convertTextToMarkdownAndHtml,
  convertHtmlToMarkdown,
  type TextConversionResult,
} from "./text-markdown-html-converter";

@Component({
  selector: "app-text-markdown-html",
  imports: [
    TerminalOutput,
    ToolAlert,
    ToolBreadcrumb,
    ToolHeader,
    ToolPanel,
    ToolRadioGroup,
  ],
  templateUrl: "./text-markdown-html.html",
  styleUrl: "./text-markdown-html.css",
  host: {
    class: "d:block font-family:var(--font-mono) color:var(--ink)",
  },
})
export class TextMarkdownHtml {
  private readonly destroyRef = inject(DestroyRef);
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
    this.conversionResultSignal(),
  );

  private pendingTimeoutId: ReturnType<typeof setTimeout> | undefined;
  private revision = 0;
  private pasteRequest = 0;
  private markdownCopyTimer: ReturnType<typeof setTimeout> | undefined;
  private htmlCopyTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.cancelPendingConversion();
      this.clearCopyTimer("markdown");
      this.clearCopyTimer("html");
    });
  }

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

  protected updateResult(value: string): void {
    const currentRevision = ++this.revision;
    this.cancelPendingConversion();
    this.clearCopyTimer("markdown");
    this.clearCopyTimer("html");
    this.copyMarkdownStatus.set("");
    this.copyHtmlStatus.set("");
    this.conversionResultSignal.set({ markdown: "", html: "" });

    if (value.length > 20000) {
      this.isProcessing.set(true);
      this.pendingTimeoutId = setTimeout(() => {
        this.pendingTimeoutId = undefined;
        if (currentRevision !== this.revision) return;
        const result = convertTextToMarkdownAndHtml(value);
        if (currentRevision !== this.revision) return;
        this.conversionResultSignal.set(result);
        this.isProcessing.set(false);
      }, 0);
    } else {
      const result = convertTextToMarkdownAndHtml(value);
      this.conversionResultSignal.set(result);
      this.isProcessing.set(false);
    }
  }

  protected async paste(): Promise<void> {
    this.clipboardAlert.set("");
    const revision = this.revision;
    const request = ++this.pasteRequest;
    const isCurrent = () =>
      revision === this.revision &&
      request === this.pasteRequest &&
      !this.destroyRef.destroyed;
    try {
      // 嘗試讀取富文本 HTML
      if (
        navigator.clipboard &&
        typeof navigator.clipboard.read === "function"
      ) {
        try {
          const clipboardItems = await navigator.clipboard.read();
          if (!isCurrent()) return;
          for (const item of clipboardItems) {
            if (item.types.includes("text/html")) {
              const blob = await item.getType("text/html");
              const htmlText = await blob.text();
              if (!isCurrent()) return;
              const markdown = convertHtmlToMarkdown(htmlText);
              this.sourceText.set(markdown);
              this.updateResult(markdown);
              return;
            }
          }
        } catch {
          // Permission denied: try plain text clipboard below.
        }
      }

      if (!isCurrent()) return;

      // 如果不支援或沒有 HTML 格式， fallback 至 readText 讀取純文字
      if (
        !navigator.clipboard ||
        typeof navigator.clipboard.readText !== "function"
      ) {
        throw new Error("Clipboard API not supported");
      }
      const clipboardText = await navigator.clipboard.readText();
      if (!isCurrent()) return;
      this.sourceText.set(clipboardText);
      this.updateResult(clipboardText);
    } catch (err) {
      if (!isCurrent()) return;
      this.clipboardAlert.set(
        "無法讀取剪貼簿，請使用 Ctrl+V / ⌘+V 鍵貼入內容，或手動開啟瀏覽器剪貼簿權限。",
      );
    }
  }

  protected clear(): void {
    this.revision += 1;
    this.cancelPendingConversion();
    this.sourceText.set("");
    this.clipboardAlert.set("");
    this.copyMarkdownStatus.set("");
    this.copyHtmlStatus.set("");
    this.outputFormat.set("markdown");
    this.isProcessing.set(false);
    this.conversionResultSignal.set({ markdown: "", html: "" });
  }

  protected async copyMarkdown(): Promise<void> {
    if (this.isProcessing()) return;
    const revision = this.revision;
    const markdown = this.conversionResult().markdown;
    this.copyMarkdownStatus.set("");
    this.clearCopyTimer("markdown");
    try {
      if (
        !navigator.clipboard ||
        typeof navigator.clipboard.writeText !== "function"
      ) {
        throw new Error("Clipboard API not supported");
      }
      await navigator.clipboard.writeText(markdown);
      if (revision !== this.revision || this.destroyRef.destroyed) return;
      this.copyMarkdownStatus.set("已複製！");
      this.markdownCopyTimer = setTimeout(() => {
        this.copyMarkdownStatus.set("");
        this.markdownCopyTimer = undefined;
      }, 2000);
    } catch (err) {
      if (revision !== this.revision || this.destroyRef.destroyed) return;
      this.copyMarkdownStatus.set("複製失敗");
    }
  }

  protected async copyHtml(): Promise<void> {
    if (this.isProcessing()) return;
    const revision = this.revision;
    const html = this.conversionResult().html;
    this.copyHtmlStatus.set("");
    this.clearCopyTimer("html");
    try {
      if (
        !navigator.clipboard ||
        typeof navigator.clipboard.writeText !== "function"
      ) {
        throw new Error("Clipboard API not supported");
      }
      await navigator.clipboard.writeText(html);
      if (revision !== this.revision || this.destroyRef.destroyed) return;
      this.copyHtmlStatus.set("已複製！");
      this.htmlCopyTimer = setTimeout(() => {
        this.copyHtmlStatus.set("");
        this.htmlCopyTimer = undefined;
      }, 2000);
    } catch (err) {
      if (revision !== this.revision || this.destroyRef.destroyed) return;
      this.copyHtmlStatus.set("複製失敗");
    }
  }

  private cancelPendingConversion(): void {
    if (this.pendingTimeoutId !== undefined) {
      clearTimeout(this.pendingTimeoutId);
      this.pendingTimeoutId = undefined;
    }
  }

  private clearCopyTimer(format: "markdown" | "html"): void {
    const timer =
      format === "markdown" ? this.markdownCopyTimer : this.htmlCopyTimer;
    if (timer !== undefined) clearTimeout(timer);
    if (format === "markdown") {
      this.markdownCopyTimer = undefined;
    } else {
      this.htmlCopyTimer = undefined;
    }
  }
}
