import { Component, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ToolBreadcrumb } from "../../shared/ui/tool-breadcrumb/tool-breadcrumb";
import { ToolPanel } from "../../shared/ui/tool-panel/tool-panel";
import { ToolHeader } from "../../shared/ui/tool-header/tool-header";
import { ToolAlert } from "../../shared/ui/tool-alert/tool-alert";
import { TerminalOutput } from "../../shared/ui/terminal-output/terminal-output";
import { diffLines, findDiffBlocks, AlignedLine } from "./diff-checker-engine";

@Component({
  selector: "app-diff-checker",
  imports: [
    CommonModule,
    FormsModule,
    ToolBreadcrumb,
    ToolPanel,
    ToolHeader,
    ToolAlert,
    TerminalOutput,
  ],
  templateUrl: "./diff-checker.html",
  styleUrl: "./diff-checker.css",
  host: {
    class: "d:block font-family:var(--font-mono) color:var(--ink)",
  },
})
export class DiffChecker {
  protected readonly textA = signal("");
  protected readonly textB = signal("");
  protected readonly isComparing = signal(false);
  protected readonly hasResult = signal(false);
  protected readonly alertMessage = signal("");

  // 比對結果資料
  protected readonly alignedLines = signal<AlignedLine[]>([]);
  protected readonly diffBlocks = computed(() => findDiffBlocks(this.alignedLines()));
  protected readonly currentBlockIndex = signal(-1);

  protected onInputA(val: string): void {
    this.textA.set(val);
    this.hasResult.set(false);
  }

  protected onInputB(val: string): void {
    this.textB.set(val);
    this.hasResult.set(false);
  }

  protected getLineNumbers(text: string): number[] {
    const linesCount = text ? text.split(/\r?\n/).length : 1;
    return Array.from({ length: linesCount }, (_, i) => i + 1);
  }

  protected async pasteText(target: "A" | "B"): Promise<void> {
    this.alertMessage.set("");
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.readText !== "function") {
        throw new Error("Clipboard API not supported");
      }
      const val = await navigator.clipboard.readText();
      if (target === "A") {
        this.textA.set(val);
      } else {
        this.textB.set(val);
      }
      this.hasResult.set(false);
    } catch (err) {
      this.alertMessage.set(
        "無法讀取剪貼簿，請使用 Ctrl+V / ⌘+V 鍵貼入內容，或手動開啟瀏覽器剪貼簿權限。"
      );
    }
  }

  protected clearText(target: "A" | "B"): void {
    if (target === "A") {
      this.textA.set("");
    } else {
      this.textB.set("");
    }
    this.hasResult.set(false);
    this.alertMessage.set("");
  }

  // 內部文字格式化輔助函數：移除首尾空白，且過濾移除空白行
  private getFormattedText(raw: string): string {
    if (!raw) return "";
    return raw
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line !== "")
      .join("\n");
  }

  protected startCompare(): void {
    this.isComparing.set(true);
    this.alertMessage.set("");

    // 1. 比對前先自動排版並回寫輸入框 (只 trim 首尾空白，不移除空行)
    const formattedA = this.getFormattedText(this.textA());
    const formattedB = this.getFormattedText(this.textB());
    this.textA.set(formattedA);
    this.textB.set(formattedB);

    // 2. 模擬比對動畫 1.2 秒以展示 CRT 雷射掃描效果
    setTimeout(() => {
      try {
        const linesA = formattedA.split(/\r?\n/);
        const linesB = formattedB.split(/\r?\n/);
        const result = diffLines(linesA, linesB);

        this.alignedLines.set(result);
        this.currentBlockIndex.set(-1);
        this.isComparing.set(false);
        this.hasResult.set(true);
      } catch (err) {
        this.isComparing.set(false);
        this.alertMessage.set("比對過程中發生錯誤。");
      }
    }, 1200);
  }

  protected getBlockIdForLine(lineIdx: number): string | null {
    const blocks = this.diffBlocks();
    const block = blocks.find(b => lineIdx >= b.startIndex && lineIdx <= b.endIndex);
    return block ? block.id : null;
  }

  protected scrollToBlock(dir: "prev" | "next"): void {
    const blocks = this.diffBlocks();
    if (blocks.length === 0) return;

    let idx = this.currentBlockIndex();
    if (dir === "next") {
      idx = Math.min(idx + 1, blocks.length - 1);
    } else {
      idx = Math.max(idx - 1, 0);
    }

    if (this.currentBlockIndex() === -1) {
      idx = 0;
    }

    this.currentBlockIndex.set(idx);
    const targetBlock = blocks[idx];
    const element = document.getElementById(targetBlock.id);

    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("diff-block-highlight");
      setTimeout(() => {
        element.classList.remove("diff-block-highlight");
      }, 1000);
    }
  }
}
