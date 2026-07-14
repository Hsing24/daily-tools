import { Component, signal, computed } from "@angular/core";
import { computeTextStats } from "./word-count-stats";
import { StatRow } from "../../shared/ui/stat-row/stat-row";
import { TerminalOutput } from "../../shared/ui/terminal-output/terminal-output";
import { ToolAlert } from "../../shared/ui/tool-alert/tool-alert";
import { ToolBreadcrumb } from "../../shared/ui/tool-breadcrumb/tool-breadcrumb";
import { ToolHeader } from "../../shared/ui/tool-header/tool-header";
import { ToolPanel } from "../../shared/ui/tool-panel/tool-panel";

@Component({
  selector: "app-word-count",
  imports: [
    StatRow,
    TerminalOutput,
    ToolAlert,
    ToolBreadcrumb,
    ToolHeader,
    ToolPanel,
  ],
  templateUrl: "./word-count.html",
  styleUrl: "./word-count.css",
  host: {
    class: "d:block font-family:var(--font-mono) color:var(--ink)",
  },
})
export class WordCount {
  protected readonly text = signal("");
  protected readonly alertMessage = signal("");

  protected readonly stats = computed(() => computeTextStats(this.text()));

  protected onInput(value: string): void {
    this.text.set(value);
  }

  protected async paste(): Promise<void> {
    this.alertMessage.set("");
    try {
      if (
        !navigator.clipboard ||
        typeof navigator.clipboard.readText !== "function"
      ) {
        throw new Error("Clipboard API not supported");
      }
      const clipboardText = await navigator.clipboard.readText();
      this.text.set(clipboardText);
    } catch (err) {
      this.alertMessage.set(
        "無法讀取剪貼簿，請使用 Ctrl+V / ⌘+V 鍵貼入內容，或手動開啟瀏覽器剪貼簿權限。",
      );
    }
  }

  protected clear(): void {
    this.text.set("");
    this.alertMessage.set("");
  }
}
