# Quickstart: 字數統計工具

開發者導向的快速指南：如何在本機建置、測試並驗證「字數統計」功能。

## 先決條件

- Node ≥ v22.22.3 / v24.15 / v26（本機 nvm 預設過舊，先切換）：
  ```bash
  source ~/.nvm/nvm.sh && nvm use 26
  ```
- 套件管理器：**pnpm**（勿在本機跑 `npm install`）。

## 安裝與啟動

```bash
pnpm install
pnpm start            # ng serve（dev）
```

開啟瀏覽器 → 從左側「文字工具 › 字數統計」進入，或直接造訪 `/word-count`。

## 手動驗收（對應規格）

1. **即時統計（US1 / FR-004）**：在輸入區輸入或貼上 `你好 world`，下方應立即顯示 字元數 8、不含空白 7、字數 3、行數 1。
2. **貼上按鈕（FR-002）**：複製一段文字 → 按「貼上」→ 內容取代輸入區並更新統計。
3. **剪貼簿失敗退路（FR-003 / SC-005）**：在未授權/非安全環境下按「貼上」→ 顯示 zh-Hant 提示，且仍可用鍵盤 Ctrl/⌘+V 貼上。
4. **一鍵清除（US2 / FR-007）**：輸入區有內容時按「清除」→ 內容清空、四項統計歸 0。
5. **空狀態（FR-006）**：初始載入時四項統計皆顯示 0。
6. **無障礙（FR-011）**：以 Tab 走訪輸入區/貼上/清除，焦點可見；統計更新時 screen reader 以 `aria-live` 朗讀。

## 自動化測試

```bash
pnpm test
```

- `word-count-stats.spec.ts`：以 contracts/word-count-stats.md 的驗收範例表驅動 `computeTextStats`（空字串、CJK、中英混排、emoji、行數邊界、全形標點）。
- `word-count.spec.ts`：
  - 元件建立成功。
  - 輸入觸發統計更新（設定 text → `await fixture.whenStable()` → 讀取統計 DOM）。
  - 「清除」按鈕清空輸入與統計。
  - 「貼上」按鈕在 `navigator.clipboard.readText` 被 stub 時帶入內容；reject 時顯示提示（jsdom 需 stub clipboard）。

## 完成定義（Definition of Done）

- `pnpm test` 全綠、`pnpm run build` 成功。
- 工具已登錄於 `layout.ts` 工具目錄且 `available: true`。
- 視覺取自 DESIGN.md token，零圓角/陰影/漸層。
