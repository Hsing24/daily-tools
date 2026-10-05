import { Component, computed, OnDestroy, signal } from "@angular/core";
import { ToolBreadcrumb } from "../../shared/ui/tool-breadcrumb/tool-breadcrumb";
import { ToolPanel } from "../../shared/ui/tool-panel/tool-panel";
import { ToolHeader } from "../../shared/ui/tool-header/tool-header";
import { ToolAlert } from "../../shared/ui/tool-alert/tool-alert";
import { TerminalOutput } from "../../shared/ui/terminal-output/terminal-output";
import {
  AlignedLine,
  diffLines,
  DiffBudgetExceededError,
  findDiffBlocks,
  MAX_DIFF_CHARACTERS,
  MAX_DIFF_LINES,
  splitTextIntoLines,
} from "./diff-checker-engine";

@Component({
  selector: "app-diff-checker",
  imports: [ToolBreadcrumb, ToolPanel, ToolHeader, ToolAlert, TerminalOutput],
  templateUrl: "./diff-checker.html",
  styleUrl: "./diff-checker.css",
  host: {
    class: "d:block font-family:var(--font-mono) color:var(--ink)",
  },
})
export class DiffChecker implements OnDestroy {
  protected readonly textA = signal("");
  protected readonly textB = signal("");
  protected readonly isComparing = signal(false);
  protected readonly hasResult = signal(false);
  protected readonly alertMessage = signal("");
  protected readonly alignedLines = signal<AlignedLine[]>([]);
  protected readonly diffBlocks = computed(() =>
    findDiffBlocks(this.alignedLines()),
  );
  private readonly blockIds = computed(
    () =>
      new Map(this.diffBlocks().map((block) => [block.startIndex, block.id])),
  );
  protected readonly currentBlockIndex = signal(-1);
  protected readonly leftLineNumbers = computed(() =>
    this.getLineNumbers(this.textA()),
  );
  protected readonly rightLineNumbers = computed(() =>
    this.getLineNumbers(this.textB()),
  );

  private compareTimer: ReturnType<typeof setTimeout> | undefined;
  private highlightTimer: ReturnType<typeof setTimeout> | undefined;
  private highlightedElement: HTMLElement | null = null;
  private compareGeneration = 0;
  private inputGeneration = 0;

  ngOnDestroy(): void {
    this.inputGeneration += 1;
    this.compareGeneration += 1;
    this.cancelCompareTimer();
    this.clearHighlight();
  }

  protected onInputA(value: string): void {
    this.inputGeneration += 1;
    this.textA.set(value);
    this.invalidateResult();
  }

  protected onInputB(value: string): void {
    this.inputGeneration += 1;
    this.textB.set(value);
    this.invalidateResult();
  }

  private invalidateResult(): void {
    this.compareGeneration += 1;
    this.cancelCompareTimer();
    this.clearHighlight();
    this.isComparing.set(false);
    this.hasResult.set(false);
    this.alignedLines.set([]);
    this.currentBlockIndex.set(-1);
  }

  private getLineNumbers(text: string): number[] {
    return Array.from(
      { length: splitTextIntoLines(text).length },
      (_, index) => index + 1,
    );
  }

  protected async pasteText(target: "A" | "B"): Promise<void> {
    this.alertMessage.set("");
    const generation = ++this.inputGeneration;
    try {
      if (
        !navigator.clipboard ||
        typeof navigator.clipboard.readText !== "function"
      ) {
        throw new Error("Clipboard API not supported");
      }
      const value = await navigator.clipboard.readText();
      if (generation !== this.inputGeneration) return;
      if (target === "A") this.textA.set(value);
      else this.textB.set(value);
      this.invalidateResult();
    } catch {
      if (generation === this.inputGeneration) {
        this.alertMessage.set(
          "無法讀取剪貼簿，請使用 Ctrl+V / ⌘+V 鍵貼入內容，或手動開啟瀏覽器剪貼簿權限。",
        );
      }
    }
  }

  protected clearText(target: "A" | "B"): void {
    this.inputGeneration += 1;
    if (target === "A") this.textA.set("");
    else this.textB.set("");
    this.invalidateResult();
    this.alertMessage.set("");
  }

  protected startCompare(): void {
    if (this.isComparing()) return;

    const leftText = this.textA();
    const rightText = this.textB();
    const leftLines = splitTextIntoLines(leftText);
    const rightLines = splitTextIntoLines(rightText);
    if (
      leftText.length + rightText.length > MAX_DIFF_CHARACTERS ||
      leftLines.length + rightLines.length > MAX_DIFF_LINES
    ) {
      this.hasResult.set(false);
      this.alertMessage.set(
        "文字內容過大，請縮小至 200,000 字元與 10,000 行內再比較。",
      );
      return;
    }

    const generation = ++this.compareGeneration;
    this.cancelCompareTimer();
    this.alertMessage.set("");
    this.isComparing.set(true);
    this.hasResult.set(false);
    this.alignedLines.set([]);
    this.currentBlockIndex.set(-1);

    this.compareTimer = setTimeout(() => {
      this.compareTimer = undefined;
      if (generation !== this.compareGeneration) return;

      try {
        const result = diffLines(leftLines, rightLines);
        if (generation !== this.compareGeneration) return;
        this.alignedLines.set(result);
        this.currentBlockIndex.set(-1);
        this.isComparing.set(false);
        this.hasResult.set(true);
      } catch (error) {
        if (generation !== this.compareGeneration) return;
        this.isComparing.set(false);
        this.alertMessage.set(
          error instanceof DiffBudgetExceededError
            ? "差異過於複雜，請縮小文字範圍後再比較。"
            : "比對過程中發生錯誤。",
        );
      }
    }, 0);
  }

  protected getBlockIdForLine(lineIndex: number): string | null {
    return this.blockIds().get(lineIndex) ?? null;
  }

  protected scrollToBlock(direction: "prev" | "next"): void {
    const blocks = this.diffBlocks();
    if (blocks.length === 0) return;

    let index = this.currentBlockIndex();
    if (direction === "next") index = Math.min(index + 1, blocks.length - 1);
    else index = Math.max(index - 1, 0);
    if (this.currentBlockIndex() === -1) index = 0;

    this.currentBlockIndex.set(index);
    const element = document.getElementById(blocks[index].id);
    if (!element) return;

    this.clearHighlight();
    element.scrollIntoView?.({ behavior: "smooth", block: "center" });
    element.classList.add("diff-block-highlight");
    this.highlightedElement = element;
    this.highlightTimer = setTimeout(() => {
      element.classList.remove("diff-block-highlight");
      this.highlightedElement = null;
      this.highlightTimer = undefined;
    }, 1000);
  }

  private cancelCompareTimer(): void {
    if (this.compareTimer !== undefined) {
      clearTimeout(this.compareTimer);
      this.compareTimer = undefined;
    }
  }

  private clearHighlight(): void {
    if (this.highlightTimer !== undefined) clearTimeout(this.highlightTimer);
    this.highlightTimer = undefined;
    this.highlightedElement?.classList.remove("diff-block-highlight");
    this.highlightedElement = null;
  }
}
