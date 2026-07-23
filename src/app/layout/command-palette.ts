import {
  Component,
  ElementRef,
  EventEmitter,
  Output,
  viewChild,
  viewChildren,
  signal,
  computed,
  inject,
  AfterViewInit,
  input,
} from "@angular/core";
import { Router } from "@angular/router";

interface ToolItem {
  readonly label: string;
  readonly route?: string;
  readonly available: boolean;
  readonly keywords?: readonly string[];
}

interface ToolGroup {
  readonly name: string;
  readonly tools: readonly ToolItem[];
}

interface MatchedTool extends ToolItem {
  readonly category: string;
}

@Component({
  selector: "app-command-palette",
  template: `
    <div class="cmd-k-overlay" (click)="close.emit()" (keydown.escape)="onEscape($event)">
      <div class="cmd-k-modal" (click)="$event.stopPropagation()">
        <!-- 頂部資訊區 -->
        <div class="d:flex justify-content:space-between align-items:center mb:16">
          <span class="f:20 font-family:var(--font-pixel) color:var(--primary)">搜尋工具</span>
          <span class="f:12 color:var(--ink-muted)">[ESC] 關閉</span>
        </div>

        <!-- 輸入欄位 -->
        <div class="cmd-k-input-container">
          <span class="cmd-k-input-glyph">&gt;</span>
          <input
            #searchInput
            type="text"
            [value]="query()"
            (input)="onInputChange($event)"
            (compositionstart)="onCompositionStart()"
            (compositionend)="onCompositionEnd()"
            class="cmd-k-input"
            placeholder="輸入工具名稱、英文字或分類進行搜尋..."
            (keydown.escape)="onEscape($event)"
            (keydown.enter)="onInputEnter($event)"
            (keydown.arrowdown)="onInputArrowDown($event)"
            (keydown.tab)="onInputTab($event)"
          />
        </div>

        <!-- 搜尋結果區：空值時顯示全部工具 -->
        <div class="cmd-k-list">
          @for (item of filteredTools(); track item.route; let i = $index) {
            <button
              #resultButton
              type="button"
              class="cmd-k-list-item"
              [class.cmd-k-list-item-selected]="focusedIndex() === i"
              (click)="navigateTo(item)"
              (keydown.escape)="onEscape($event)"
              (keydown.arrowdown)="onResultArrowDown($event, i)"
              (keydown.arrowup)="onResultArrowUp($event, i)"
              (keydown.tab)="onResultTab($event, i)"
              (focus)="focusedIndex.set(i)"
            >
              <span>{{ item.label }}</span>
              <span class="f:12 color:var(--ink-muted)">{{ item.category }}</span>
            </button>
          } @empty {
            <div class="cmd-k-no-results">
              查無符合的工具或分類
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    .cmd-k-overlay {
      position: fixed;
      inset: 0;
      z-index: 200;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      background: var(--surface-overlay);
    }
    .cmd-k-modal {
      width: 640px;
      max-width: 90vw;
      margin-top: 15vh;
      background: var(--canvas-elevated);
      border: 4px solid var(--primary);
      padding: 24px;
      color: var(--ink-bright);
      font-family: var(--font-mono);
    }
    .cmd-k-input-container {
      display: flex;
      align-items: center;
      border-bottom: 2px solid var(--primary);
      padding: 8px 0;
      margin-bottom: 16px;
    }
    .cmd-k-input-glyph {
      color: var(--primary);
      margin-right: 8px;
      font-size: 16px;
      font-weight: bold;
    }
    .cmd-k-input {
      background: transparent;
      border: none;
      outline: none;
      width: 100%;
      color: var(--ink-bright);
      font-family: var(--font-mono);
      font-size: 16px;
      caret-color: var(--primary-bright);
    }
    .cmd-k-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 300px;
      overflow-y: auto;
      border: 1px solid var(--border-muted);
      padding: 4px;
    }
    .cmd-k-list-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: transparent;
      border: none;
      outline: none;
      width: 100%;
      padding: 10px 12px;
      color: var(--ink);
      font-family: var(--font-mono);
      font-size: 14px;
      cursor: pointer;
      text-align: left;
    }
    .cmd-k-list-item:hover,
    .cmd-k-list-item-selected {
      background: var(--primary-dim);
      color: var(--on-primary);
      font-weight: 600;
      border-left: 4px solid var(--primary);
      padding-left: 8px; /* compensate border-left width */
    }
    .cmd-k-no-results {
      padding: 12px;
      color: var(--ink-muted);
      text-align: center;
      font-family: var(--font-mono);
    }
  `,
})
export class CommandPalette implements AfterViewInit {
  readonly toolGroups = input.required<readonly ToolGroup[]>();

  @Output() readonly close = new EventEmitter<void>();

  private readonly router = inject(Router);

  protected readonly query = signal<string>("");
  protected readonly focusedIndex = signal<number>(-1);
  private isComposing = false;

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>("searchInput");
  private readonly resultButtons = viewChildren<ElementRef<HTMLButtonElement>>("resultButton");

  protected readonly filteredTools = computed(() => {
    const q = this.query().toLowerCase().trim();
    const results: MatchedTool[] = [];
    for (const group of this.toolGroups()) {
      const categoryMatch = group.name.toLowerCase().includes(q);
      for (const tool of group.tools) {
        if (!tool.available || !tool.route) {
          continue;
        }
        // 四種情況會被搜尋到：a. 空值顯示全部 b. 工具名稱相符 c. 分類名稱相符 d. 英文代碼/關鍵字相符
        const labelMatch = tool.label.toLowerCase().includes(q);
        const routeMatch = tool.route.toLowerCase().includes(q);
        const keywordsMatch = tool.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false;

        if (!q || labelMatch || categoryMatch || routeMatch || keywordsMatch) {
          results.push({ ...tool, category: group.name });
        }
      }
    }
    return results;
  });

  ngAfterViewInit(): void {
    // 當元件載入時，焦點移至搜尋框的 input
    this.searchInput()?.nativeElement.focus();
  }

  protected onInputChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.query.set(val);
    this.focusedIndex.set(-1);
  }

  protected onCompositionStart(): void {
    this.isComposing = true;
  }

  protected onCompositionEnd(): void {
    // IME 選字結束時，延遲將 isComposing 設為 false
    // 避免部分瀏覽器在 compositionend 後緊接着觸發由選字 Enter 所引發的 keydown 事件
    setTimeout(() => {
      this.isComposing = false;
    }, 50);
  }

  protected navigateTo(tool: ToolItem): void {
    if (tool.route) {
      this.router.navigate([tool.route]);
      this.close.emit();
    }
  }

  protected onEscape(event: Event): void {
    event.preventDefault();
    this.close.emit();
  }

  // === 輸入欄位的鍵盤事件 ===

  protected onInputEnter(event: Event): void {
    const kbEvent = event as KeyboardEvent;
    if (kbEvent.isComposing || this.isComposing || kbEvent.keyCode === 229) {
      return;
    }

    const results = this.filteredTools();
    if (results.length > 0) {
      kbEvent.preventDefault();
      this.navigateTo(results[0]);
    }
  }

  protected onInputArrowDown(event: Event): void {
    const kbEvent = event as KeyboardEvent;
    const results = this.filteredTools();
    if (results.length > 0) {
      kbEvent.preventDefault();
      this.focusedIndex.set(0);
      this.focusButton(0);
    }
  }

  protected onInputTab(event: Event): void {
    const kbEvent = event as KeyboardEvent;
    // 如果有按下 Tab 且無 Shift
    if (!kbEvent.shiftKey) {
      const results = this.filteredTools();
      if (results.length > 0) {
        kbEvent.preventDefault();
        this.focusedIndex.set(0);
        this.focusButton(0);
      }
    }
  }

  // === 搜尋結果的鍵盤事件 ===

  protected onResultArrowDown(event: Event, index: number): void {
    const kbEvent = event as KeyboardEvent;
    kbEvent.preventDefault();
    const results = this.filteredTools();
    const nextIndex = (index + 1) % results.length;
    this.focusedIndex.set(nextIndex);
    this.focusButton(nextIndex);
  }

  protected onResultArrowUp(event: Event, index: number): void {
    const kbEvent = event as KeyboardEvent;
    kbEvent.preventDefault();
    if (index === 0) {
      // 如果在第一筆按下 ArrowUp，回到輸入框
      this.focusedIndex.set(-1);
      this.searchInput()?.nativeElement.focus();
    } else {
      const nextIndex = index - 1;
      this.focusedIndex.set(nextIndex);
      this.focusButton(nextIndex);
    }
  }

  protected onResultTab(event: Event, index: number): void {
    const kbEvent = event as KeyboardEvent;
    kbEvent.preventDefault();
    const results = this.filteredTools();
    if (kbEvent.shiftKey) {
      // Shift + Tab: 往上
      if (index === 0) {
        // 第一筆 Shift + Tab 回到輸入框
        this.focusedIndex.set(-1);
        this.searchInput()?.nativeElement.focus();
      } else {
        const nextIndex = index - 1;
        this.focusedIndex.set(nextIndex);
        this.focusButton(nextIndex);
      }
    } else {
      // Tab: 往下
      const nextIndex = (index + 1) % results.length;
      this.focusedIndex.set(nextIndex);
      this.focusButton(nextIndex);
    }
  }

  private focusButton(index: number): void {
    // 延遲到下一個 microtask，確保 DOM 已更新且對應的 button 可被聚焦
    queueMicrotask(() => {
      const buttons = this.resultButtons();
      if (buttons && buttons[index]) {
        buttons[index].nativeElement.focus();
      }
    });
  }
}
