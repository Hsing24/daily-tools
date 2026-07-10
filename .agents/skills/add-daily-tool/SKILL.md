---
name: add-daily-tool
description: "封裝在 daily-tools（Angular 22 SPA）新增一個工具頁面的標準流程：建立 standalone component、加 lazy route、更新 layout.ts 的 toolGroups、重用 shared/ui、補齊 spec。Use when 使用者要「新增工具」、「新工具頁」、「add a new tool」、「scaffold 新工具」、或在 src/app/tools/ 下新建目錄時。"
---

# Add Daily Tool

在 `daily-tools` 這個 Angular 22 SPA 中新增一個新的工具頁面（例如 JSON Formatter、Base64 編碼器、Regex Tester），並確保不遺漏路由註冊、側欄清單、共用元件重用與測試。

## 前置閱讀

- [AGENTS.md](../../../AGENTS.md)：架構、Styling（Master CSS）、TypeScript 嚴格模式、測試慣例
- 既有範例：[src/app/tools/word-count/](../../../src/app/tools/word-count/)

## 步驟

### 1. 建立工具資料夾

在 `src/app/tools/<tool-name>/` 建立：

- `<tool-name>.ts`／`.html`／`.css`／`.spec.ts`
- 若有非 UI 的邏輯（parsing、計算等），抽成獨立檔案 `<tool-name>-<logic>.ts` + 對應 `.spec.ts`（仿照 `word-count-stats.ts`），保持元件檔精簡、邏輯可單獨測試。

Component 規範：

- Angular 22 standalone-first：**不要**加 `standalone: true`，**不要**建立 `NgModule`。
- selector 為 `app-<tool-name>`（`angular.json` 的 prefix 是 `app`）。
- 狀態管理用 signal-based API：`signal()`、`computed()`、`input()`；DOM 查詢用 `viewChild()`/`viewChildren()`，不要用裝飾器查詢。
- Template 用內建 `@if`/`@for`/`@switch`，不要 `*ngIf`/`*ngFor`。
- 動態物件欄位用 bracket notation（`obj['foo']`），因為 `noPropertyAccessFromIndexSignature` 已啟用。

### 2. 優先重用 `shared/ui`

新增前先檢查 [src/app/shared/ui/](../../../src/app/shared/ui/) 是否已有可用元件，**不要重造** header/breadcrumb/panel 等 chrome：

- `tool-breadcrumb`：頁面上方麵包屑（`category` + `current`）
- `tool-panel`：工具主容器
- `tool-header`：`eyebrow` + `title` + `description`
- `tool-alert`：狀態訊息（成功/錯誤），本身處理 live region
- `stat-row`、`terminal-output`、`key-chip`：資料展示用元件

範本結構（參考 word-count.html）：

```html
<div>
  <app-tool-breadcrumb category="分類名稱" current="工具名稱" />
  <app-tool-panel>
    <app-tool-header eyebrow="..." title="..." description="..." />
    @if (alertMessage()) {
    <app-tool-alert [message]="alertMessage()" />
    }
    <!-- 工具內容 -->
  </app-tool-panel>
</div>
```

### 3. 加 lazy route（容易漏掉）

編輯 [src/app/app.routes.ts](../../../src/app/app.routes.ts)，在 `Layout` 的 `children` 陣列加一筆：

```ts
{
  path: "<tool-name>",
  loadComponent: () =>
    import("./tools/<tool-name>/<tool-name>").then((m) => m.<ToolClassName>),
},
```

### 4. 更新 `toolGroups`（容易漏掉）

編輯 [src/app/layout/layout.ts](../../../src/app/layout/layout.ts) 的 `toolGroups`：

- 把新工具加進既有分類（例如「文字工具」），沒有合適分類時先跟使用者確認是否要新增分類。
- 設定 `{ label: "顯示名稱", route: "<tool-name>", available: true }`。
- `label` 使用繁體中文（zh-Hant），語氣簡潔、可帶一點玩味，符合既有工具命名風格。

### 5. 樣式：Master CSS，不是 Tailwind

- Template class 用 Master CSS 語法（`bg:`、`color:`、`p:`/`px:`/`py:`、`f:14`、`d:flex`/`d:grid`、`border:2px|solid|#hex` 等），`p-4` 這類 Tailwind 寫法不會生效。
- `.css` 檔盡量留空，只在 Master CSS 無法表達的選擇器（如 `clip-path`）才寫 scoped CSS。
- 遵守 DESIGN.md：無圓角、無陰影、無漸層（唯一既有例外是 light theme `data-theme="solarized"`）。

### 6. 無障礙（WCAG 2.2 AA）

- 所有互動元素鍵盤可操作、有可見 focus indicator。
- `<label>`/`aria-label` 對應每個輸入欄位；動態狀態訊息用 `app-tool-alert` 或 `aria-live`，不要只靠顏色傳達狀態。
- 圖示按鈕需 `aria-label`。

### 7. 補齊 spec

- 元件 spec 用 Vitest globals（`describe`/`it`/`expect`，`tsconfig.spec.json` 已設定），搭配 `TestBed.configureTestingModule` + `provideRouter([])`。
- 涉及瀏覽器 API（clipboard、matchMedia、ResizeObserver…）要 mock，參考 word-count.spec.ts 的 clipboard mock 寫法。
- 抽出的邏輯檔（如 `-stats.ts`）要有獨立 spec，覆蓋邊界案例（空字串、極端輸入等）。
- 涉及非同步 DOM 更新時，先 `await fixture.whenStable()` 再讀 `nativeElement`。

### 8. 驗證

```bash
source ~/.nvm/nvm.sh && nvm use 26
pnpm exec ng test --watch=false
pnpm run build
```

## 完成檢查清單

- [ ] `app.routes.ts` 已加入新工具的 lazy route
- [ ] `layout.ts` 的 `toolGroups` 已加入該工具，且 `available: true`
- [ ] 已重用 `shared/ui` 的 breadcrumb/panel/header/alert 等元件，沒有重造 chrome
- [ ] 元件與抽出的邏輯檔都有對應 `.spec.ts`
- [ ] 樣式使用 Master CSS class，符合 DESIGN.md（無圓角/陰影/漸層）
- [ ] 鍵盤操作、label、live region 等無障礙要求已檢查
- [ ] `pnpm exec ng test --watch=false` 與 `pnpm run build` 皆通過
