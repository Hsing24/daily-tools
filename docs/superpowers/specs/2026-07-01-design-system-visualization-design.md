---
name: design-system-visualization
description: Spec for visualizing the design guidelines in public/design.html conforming to DESIGN.md.
---

# 設計規格書：DevTool Terminal 設計系統頁面 (design.html) 視覺化與 UX 修復

## 1. 目的與背景
本專案旨在遵循 `DESIGN.md` 中規定的 CRT 像素終端風格，重構與修復 `public/design.html`。
我們將修正現有的視覺缺陷（字型未載入、麵包屑箭頭重疊錯誤），並補全缺失的設計標記（Tokens）展示，同時加入豐富的互動體驗（真實 Cmd+K 彈窗、主題切換、側欄滾動高亮），使其成為符合 daily-tools 品牌精神的高品質設計規範展示頁。

## 2. 核心視覺規範對齊
* **字型系統**：
  * 自 Google Fonts 載入 `VT323`（像素展示字）、`Press Start 2P`（微型標題字）及 `IBM Plex Mono`（UI 操作與代碼字）。
  * 移除所有 proportional sans-serif，確保全頁面包括段落文字皆為單寬（Monospace）對齊。
* **無圓角、無柔和陰影**：
  * 全域 `border-radius: 0px`。
  * `box-shadow` 設為 `none`。深度與層級純粹依賴表面階層（canvas -> elevated -> nested）與粗邊框（2px/4px）來呈現。
* **色彩與邊框**：
  * 互動元素使用唯一的主操作色 `primary` (Mint #3FE0C5)。
  * 邊框使用硬邊 chunky border，預設為 2px，焦點或彈窗為 4px。
* **CRT 掃描線與閃爍特效**：
  * 掃描線重複漸層覆蓋於最上層。
  * 新增微量亮度振盪動畫（CRT Flicker），並限制在 `prefers-reduced-motion: no-preference` 下執行以維護無障礙體驗。

## 3. UX 互動實作
* **Zsh Chevron 堆疊修復**：
  * 為 `.breadcrumb a` 與 `.breadcrumb span` 設定 `position: relative` 與遞減的 `z-index`。
  * 確保第一個 segment 的尖角疊在第二個之上，第二個疊在第三個之上，形成正確的 Powerline 指向效果。
* **真實 Cmd+K 命令面板 Modal**：
  * 建立全螢幕遮罩 `.cmd-k-overlay`（背景為 `surface-overlay`）及中央彈窗 `.cmd-k-modal`（4px 邊框、無圓角）。
  * 點擊右上角 `⌘K` 鍵帽或在鍵盤按下 `Cmd+K` / `Ctrl+K` 時開啟彈窗，點擊遮罩或按 `Esc` 關閉。
  * 彈窗內部的輸入框前方顯示 `>` 符號，並帶有閃爍的光標（Caret）。
  * 支援鍵盤上下鍵在選項（`cmd-k-list-item`）間導覽，並透過套用 `selected` 樣式（4px 左邊框、primary-dim 背景）高亮，按 `Enter` 可觸發對應行為或關閉。
* **主題切換器 (Monokai <-> Solarized Dark)**：
  * 點擊 Prompt Bar 中的主題標籤或 Mini theme 鈕時，動態將頁面中展示的代碼塊樣式與全域代碼配置切換於 Monokai 與 Solarized Dark 配色之間，直觀展示兩種語意色彩。
* **側欄目錄滾動高亮 (Scrollspy)**：
  * 使用 JavaScript 的 `IntersectionObserver` 監聽各個主要 Section。
  * 當頁面滾動到特定 Section 時，側邊欄目錄對應的 `<a>` 會自動套用 active 樣式（`sidebar-nav-item-active`：elevated 背景、mint 文字、4px 左邊框）。

## 4. 完善 Guideline 內容展示
* **完整色票矩陣**：
  * 展示 `DESIGN.md` 中定義的全部 26 種色彩 Tokens，包含 Bright/Dim、Surfaces、Text、Borders，以及 2 組代碼配色主題的色票。
* **完整字型階層表**：
  * 列出全部 14 種 Typography Tokens 的詳細規格，並提供實際渲染預覽。
* **新增間距與 Space 展示**：
  * 將 `spacing` 尺規（xxs - viewport）視覺化為實心 Mint 色條。
  * 說明語意 Space Slots 的用途。
* **完整元件矩陣**：
  * 擴充按鈕展示：包括 Primary (Normal / Hover / Disabled), Secondary, Warning, Ghost (Normal / Focus) 的實際外觀。
  * 擴充輸入框展示：包括 Text Input (Default / Focus / Error) 與 Segmented Control。
  * 擴充 Toasts 提示框：展示 Success, Warning, Error 三款硬邊提示框。
* **響應式規則對齊**：
  * 確保手機版（≤ 639px）、平板版（640-1023px）及桌面版（≥ 1024px）皆能依據 `DESIGN.md` 優雅降級。

## 5. 驗證條件與測試
* 使用 `playwright-cli` 截圖驗證：
  1. 檢視字型是否正確渲染為像素與單寬風格。
  2. 檢視麵包屑 chevron 尖角是否覆蓋正確。
  3. 觸發 `Cmd+K` 鍵盤操作，檢視 Modal 彈窗是否出現、位置是否居中，以及選項的聚焦狀態。
  4. 點擊切換主題，確認代碼塊顏色正確更新。
  5. 縮小瀏覽器寬度，確認排版在斷點處有正確回退或折疊。
