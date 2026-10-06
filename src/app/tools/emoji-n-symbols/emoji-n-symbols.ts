import {
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from "@angular/core";
import {
  ALL_SYMBOLS,
  SYMBOL_CATEGORIES,
  filterSymbols,
  toCodePoint,
  toHtmlEntity,
  type SymbolItem,
} from "./emoji-n-symbols-core";
import { ToolPanel } from "../../shared/ui/tool-panel/tool-panel";
import { ToolHeader } from "../../shared/ui/tool-header/tool-header";
import { ToolBreadcrumb } from "../../shared/ui/tool-breadcrumb/tool-breadcrumb";
import { ToolAlert } from "../../shared/ui/tool-alert/tool-alert";
import { ToastService } from "../../shared/services/toast.service";

export interface SymbolGroup {
  readonly category: string;
  readonly items: SymbolItem[];
}

@Component({
  selector: "app-emoji-n-symbols",
  imports: [
    ToolPanel,
    ToolHeader,
    ToolBreadcrumb,
    ToolAlert,
  ],
  templateUrl: "./emoji-n-symbols.html",
  styleUrl: "./emoji-n-symbols.css",
  host: {
    class: "d:block font-family:var(--font-mono) color:var(--ink)",
  },
})
export class EmojiNSymbols {
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);
  private alertTimer: ReturnType<typeof setTimeout> | undefined;
  private highlightTimer: ReturnType<typeof setTimeout> | undefined;

  // 搜尋字串與分類清單
  protected readonly searchQuery = signal("");
  protected readonly categories = SYMBOL_CATEGORIES;

  // 目前外框亮起的分類名稱
  protected readonly highlightedCategory = signal<string | null>(null);

  // 選中檢視項目
  protected readonly selectedSymbol = signal<SymbolItem | null>(ALL_SYMBOLS[0] ?? null);

  // 狀態通知訊息
  protected readonly alertMessage = signal("");
  protected readonly alertVariant = signal<"success" | "error">("success");

  // 依分類分組並過濾的符號清單
  protected readonly symbolGroups = computed<SymbolGroup[]>(() => {
    const query = this.searchQuery();
    return SYMBOL_CATEGORIES.map((category) => {
      return {
        category,
        items: filterSymbols(query, category),
      };
    }).filter((group) => group.items.length > 0);
  });

  // 目前符合條件的符號總數
  protected readonly totalFilteredCount = computed(() => {
    return this.symbolGroups().reduce((acc, g) => acc + g.items.length, 0);
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.clearAlertTimer();
      this.clearHighlightTimer();
    });
  }

  protected onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  /**
   * 點擊分類錨點，滑動至對應區塊並觸發外框亮起動畫
   */
  protected scrollToCategory(category: string): void {
    const targetId = `category-section-${category}`;
    const el = document.getElementById(targetId);

    if (!el && this.searchQuery()) {
      // 若因當前搜尋過濾導致該區塊不在 DOM 中，先清空搜尋框再滾動
      this.searchQuery.set("");
      setTimeout(() => {
        const target = document.getElementById(targetId);
        if (target) {
          this.executeScrollAndHighlight(target, category);
        }
      }, 0);
      return;
    }

    if (el) {
      this.executeScrollAndHighlight(el, category);
    }
  }

  /**
   * 平滑滑動回頂部
   */
  protected scrollToTop(): void {
    const topAnchor = document.getElementById("symbol-top-anchor");
    if (topAnchor) {
      topAnchor.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  protected selectSymbol(item: SymbolItem): void {
    this.selectedSymbol.set(item);
  }

  /**
   * 點擊符號快速複製
   */
  protected async copyChar(item: SymbolItem): Promise<void> {
    this.selectSymbol(item);
    await this.performCopy(
      item.char,
      `已複製「${item.char}」至剪貼簿！`,
      "字元複製失敗，請手動複製。"
    );
  }

  /**
   * 複製 Unicode 碼位 (如 U+2192)
   */
  protected async copyCodePoint(item: SymbolItem): Promise<void> {
    const cp = toCodePoint(item.char);
    await this.performCopy(
      cp,
      `已複製 Unicode 碼位「${cp}」至剪貼簿！`,
      "碼位複製失敗，請手動複製。"
    );
  }

  /**
   * 複製 HTML Entity (如 &#x2192;)
   */
  protected async copyHtmlEntity(item: SymbolItem): Promise<void> {
    const entity = toHtmlEntity(item.char);
    await this.performCopy(
      entity,
      `已複製 HTML Entity「${entity}」至剪貼簿！`,
      "Entity 複製失敗，請手動複製。"
    );
  }

  protected getCodePointText(char: string): string {
    return toCodePoint(char);
  }

  protected getHtmlEntityText(char: string): string {
    return toHtmlEntity(char);
  }

  private executeScrollAndHighlight(el: HTMLElement, category: string): void {
    el.scrollIntoView({ behavior: "smooth", block: "start" });

    this.highlightedCategory.set(null);
    setTimeout(() => {
      this.highlightedCategory.set(category);
    }, 10);

    if (this.highlightTimer !== undefined) {
      clearTimeout(this.highlightTimer);
    }
    this.highlightTimer = setTimeout(() => {
      if (this.highlightedCategory() === category) {
        this.highlightedCategory.set(null);
      }
      this.highlightTimer = undefined;
    }, 2000);
  }

  private async performCopy(
    text: string,
    successMsg: string,
    errorMsg: string
  ): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      if (this.destroyRef.destroyed) return;
      this.showAlert(successMsg, "success");
    } catch {
      if (this.destroyRef.destroyed) return;
      this.showAlert(errorMsg, "error");
    }
  }

  private showAlert(message: string, variant: "success" | "error"): void {
    this.clearAlertTimer();
    this.alertMessage.set(message);
    this.alertVariant.set(variant);
    this.toastService.show(message, variant, 3000);

    this.alertTimer = setTimeout(() => {
      this.alertMessage.set("");
      this.alertTimer = undefined;
    }, 3000);
  }

  private clearAlertTimer(): void {
    if (this.alertTimer !== undefined) {
      clearTimeout(this.alertTimer);
      this.alertTimer = undefined;
    }
  }

  private clearHighlightTimer(): void {
    if (this.highlightTimer !== undefined) {
      clearTimeout(this.highlightTimer);
      this.highlightTimer = undefined;
    }
  }
}
