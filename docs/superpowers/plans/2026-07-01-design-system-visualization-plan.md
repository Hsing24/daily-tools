# DevTool Terminal 設計系統展示頁面 (design.html) 視覺化與 UX 修復實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修復與優化 `public/design.html` 的視覺細節，遵循 `DESIGN.md` 中規範的字型、CRT 動畫、重疊麵包屑，並實作互動的主題切換器與 Cmd+K 彈窗，補全所有色彩、字型及間距設計標記的展示。

**Architecture:** 我們將在單一 HTML 檔案 `public/design.html` 中，新增 Google Fonts 字型載入、重構 CSS 規則以支援主題配色（以變數來表示 Monokai 與 Solarized Dark 配色）、加入 CRT Flicker 動畫、修正麵包屑堆疊，並加入純 JavaScript 腳本以操控彈窗、滾動監聽（Scrollspy）及主題切換。

**Tech Stack:** HTML5, CSS3 Custom Properties, Vanilla JavaScript.

---

### Task 1: 載入 Google Fonts 與設定字型
在 `public/design.html` 中載入 VT323、Press Start 2P 與 IBM Plex Mono 等字型，並修正 CSS 變數定義，以確保在所有環境中均能渲染出完美的像素與單寬風格。

**Files:**
- Modify: `public/design.html`

- [ ] **Step 1: 在 `<head>` 中載入 Google Fonts 樣式表**
  在 `<head>` 中新增以下 `<link>` 標記：
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet">
  ```

- [ ] **Step 2: 修正 CSS 變數以包含下載字型**
  更新 `:root` 中的字型定義，將 local 改為載入的字型族系名稱：
  ```css
  --font-pixel: "VT323", "Press Start 2P", ui-monospace, monospace;
  --font-mono: "IBM Plex Mono", "JetBrains Mono", Menlo, ui-monospace, monospace;
  ```

- [ ] **Step 3: 驗證字型渲染**
  使用 Playwright 開啟頁面並檢視頁面標題（VT323）與程式碼區（IBM Plex Mono）是否成功套用新字型。
  Run: `npx @playwright/cli -s=mysession open http://localhost:4200/design.html`
  Expected: 文字應變為窄身像素字型（VT323）及清晰的單寬程式字型（IBM Plex Mono）。

---

### Task 2: 修正 Zsh Chevron 麵包屑重疊與 Z-index 堆疊
修復 Zsh Chevron 麵包屑段落，使其 chevron 尖角在重疊時，前一個 segment 覆蓋在後一個之上（z-index 遞減），形成流暢的向右指針軌跡。

**Files:**
- Modify: `public/design.html`

- [ ] **Step 1: 新增麵包屑層級與 z-index 規則**
  修改 `.breadcrumb a, .breadcrumb span` CSS，增加 `position: relative` 並確保重疊深度：
  ```css
  .breadcrumb a,
  .breadcrumb span {
    position: relative;
  }
  .breadcrumb a:nth-child(1) { z-index: 3; }
  .breadcrumb a:nth-child(2) { z-index: 2; }
  .breadcrumb span { z-index: 1; }
  ```

- [ ] **Step 2: 驗證麵包屑重疊效果**
  重新載入瀏覽器或以 Playwright 截圖檢視 hero 區塊內部的 `DevTool > System > Design`Chevron 形狀。
  Run: `npx @playwright/cli -s=mysession screenshot --filename=breadcrumb.png`
  Expected: 第一個 Segment 的黃色背景應正確被其右側尖角覆蓋，呈現完美連續的 chevron 箭頭形狀，而非被下一段的背景色切除。

---

### Task 3: 實作 CRT Flicker 螢幕閃爍動畫
新增微小且精緻的 CRT 螢幕亮度震盪動畫（flicker），並將其限制於 `prefers-reduced-motion: no-preference` 以符合無障礙規範。

**Files:**
- Modify: `public/design.html`

- [ ] **Step 1: 新增 CRT flicker 動畫樣式**
  在 CSS 區塊新增 `@keyframes crt-flicker` 和對應的動畫綁定：
  ```css
  @keyframes crt-flicker {
    0% { opacity: 0.045; }
    50% { opacity: 0.038; }
    100% { opacity: 0.045; }
  }

  @media (prefers-reduced-motion: no-preference) {
    body::before {
      animation: crt-flicker 0.15s infinite;
    }
  }
  ```

- [ ] **Step 2: 驗證動畫**
  確認 `body::before` 的動畫套用正常，且在瀏覽器未啟用減少動效時有輕微的、高質感的 CRT 動態感。

---

### Task 4: 補全完整設計標記色票展示 (Color Swatches)
擴充色彩區塊，展示 `DESIGN.md` 中規定的全部 26 種色彩 Tokens，包含 Bright/Dim, Text Inks, Borders, 以及程式碼語意配色。

**Files:**
- Modify: `public/design.html`

- [ ] **Step 1: 在 CSS 中新增代碼主題與輔助色彩變數**
  確保所有 26 種標記顏色都在 CSS 中有對應的 CSS 變數定義：
  ```css
  --primary-bright: #6bffe0;
  --primary-dim: #2bae96;
  --gold-bright: #ffd166;
  --gold-dim: #b8830a;
  --warning-dim: #8a2018;
  --on-gold: #0a1a2f;
  --border-default: #3fe0c5;
  ```

- [ ] **Step 2: 擴充 HTML 中的 Swatch 展示格**
  在 `#colors` 的 `.swatch-grid` 中，補上 Bright/Dim 變體、Borders、Text 語意色以及 Monokai / Solarized 代碼色的色票展示（總計展示 26 種色票）。

- [ ] **Step 3: 驗證色票**
  以 Playwright 開啟頁面確認所有色票是否都正確顯示顏色、Token 名稱及十六進位值。

---

### Task 5: 擴充完整字型階層展示 (Typography Scale)
將 Typography Section 中的列表擴充為包含所有 14 種 Typography Tokens 規格的完整列表。

**Files:**
- Modify: `public/design.html`

- [ ] **Step 1: 在 CSS 中新增字型 Token 對應的樣式類別**
  定義 `pixel-display`、`pixel-h1`、`pixel-h2`、`pixel-h3`、`pixel-eyebrow`、`mono-h4`、`mono-body-lg`、`mono-body`、`mono-body-strong`、`mono-prompt`、`mono-caption`、`mono-key-chip`、`mono-button`、`mono-code` 各個 Token 的 font-size, line-height 及 letter-spacing。

- [ ] **Step 2: 重構 HTML 中的 Typography 展示清單**
  修改 `#typography` 的 `.type-scale`，將 14 個 Token 以表格或列表的形式逐一展示，並顯示其 `VT323` 或 `IBM Plex Mono` 的範例文字、Token 名稱與規格。

---

### Task 6: 新增間距尺規 (Spacing Scale) 與形狀深度展示
在頁面中新增一個專屬的 Spacing, Shapes 與 Depth 展示區，將 2px - 80px 的間距尺度視覺化為 Mint 色的水平像素條。

**Files:**
- Modify: `public/design.html`

- [ ] **Step 1: 新增 Spacing Section HTML 結構**
  在 `#typography` 區塊下方插入 `#spacing` 區塊，列出 xxs, xs, sm, md, lg, xl, xxl, xxxl, section, section-lg, viewport 各個 token 的寬度、名稱、並用 `<div class="spacing-bar">` 渲染出該間距的實心條。

- [ ] **Step 2: 視覺化 Shapes 與 Depth 規範**
  在間距區塊內，附帶一個區塊展示 Shapes (`border-radius: 0px`) 與 Depth（無 box-shadow，只透過 Flat, Hairline, Chunky, Chunky Thick 等邊框級別來展現深度）。

---

### Task 7: 補多元件樣本展示 (Buttons, Inputs, Toasts)
擴充元件展示區塊，展示所有 Button 狀態、Input 狀態，以及 3 種 semantic toasts 的實際硬邊樣式。

**Files:**
- Modify: `public/design.html`

- [ ] **Step 1: 新增與完善 HTML 結構**
  在 `#components` 的元件網格中：
  - 展示所有 Button 狀態：Primary (Normal / Hover / Disabled), Secondary, Warning, Ghost (Normal / Focus)。
  - 展示所有 Input 狀態：Text Input (Default / Focus / Error)，並渲染 Segmented Control 範例。
  - 展示 Toasts 提示框：Toast Success, Toast Warning, Toast Error。

- [ ] **Step 2: 調整 CSS 確保樣式**
  確保所有按鈕狀態（如 hover 和 focus）的樣式與 `DESIGN.md` 一致（例如：Button-primary hover 時亮色變為 `--primary-bright`，無 shadow，無位移；邊框均為 borderless）。

---

### Task 8: 實作互動式主題切換器 (Monokai <-> Solarized Dark)
撰寫 JavaScript，當使用者點擊 Prompt Bar 中的 MONOKAI / SOLARIZED 主題標籤，或代碼展示區的切換器時，可切換代碼區域的顏色樣式，並正確套用 Monokai / Solarized Dark 主題配色。

**Files:**
- Modify: `public/design.html`

- [ ] **Step 1: 在 CSS 中新增 Monokai 與 Solarized 程式碼配色變數與類別**
  定義兩套程式碼語意高亮的主題變數：
  ```css
  .theme-monokai {
    --syntax-bg: #272822;
    --syntax-fg: #f8f8f2;
    --syntax-keyword: #f92672;
    --syntax-string: #e6db74;
    --syntax-number: #ae81ff;
    --syntax-function: #a6e22e;
    --syntax-property: #66d9ef;
  }
  .theme-solarized {
    --syntax-bg: #002b36;
    --syntax-fg: #839496;
    --syntax-keyword: #859900;
    --syntax-string: #2aa198;
    --syntax-number: #d33682;
    --syntax-function: #268bd2;
    --syntax-property: #b58900;
  }
  ```
  套用到 `textarea-code` 與展示用的程式碼標籤上。

- [ ] **Step 2: 撰寫 JavaScript 切換邏輯**
  在 HTML 底部新增 `<script>`：
  - 監聽主題按鈕點擊，循環切換 `.theme-monokai` 與 `.theme-solarized` 類別。
  - 更新 Prompt Bar 右側顯示的主題名稱。

- [ ] **Step 3: 驗證切換效果**
  使用 Playwright 點擊切換，確認程式碼區域的主題底色與語意文字配色是否變更。
  Run: `npx @playwright/cli -s=mysession click e15`

---

### Task 9: 實作側邊欄目錄滾動高亮 (Scrollspy)
使用 `IntersectionObserver` 監聽頁面的所有 Section，當滾動至特定 Section 時，動態套用 `active` 樣式到側邊欄目錄。

**Files:**
- Modify: `public/design.html`

- [ ] **Step 1: 調整側欄 Nav 樣式**
  確保 `active` 狀態 `.side-nav a.active` 具有 elevated 背景、mint 字型與 4px 左邊框：
  ```css
  .side-nav a.active {
    background: var(--canvas-elevated);
    color: var(--primary);
    border-left: 4px solid var(--primary);
    font-weight: 600;
  }
  ```

- [ ] **Step 2: 撰寫 Intersection Observer 腳本**
  在底部 `<script>` 中加入：
  ```js
  const sections = document.querySelectorAll('section.section, section.hero');
  const navLinks = document.querySelectorAll('.side-nav a');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id') || 'main-content';
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id === 'main-content' ? 'colors' : id}`);
        });
      }
    });
  }, { threshold: 0.3, rootMargin: '-40px 0px -60% 0px' });

  sections.forEach(section => observer.observe(section));
  ```

---

### Task 10: 實作鍵盤優先的 Cmd+K 互動命令面板 (Modal Overlay)
實作一個全功能的 Cmd+K Modal，支援 `⌘K` / `Ctrl+K` 與 `Esc` 鍵，且可利用鍵盤上下鍵在選項間導覽、聚焦，並按 Enter 觸發滾動導引。

**Files:**
- Modify: `public/design.html`

- [ ] **Step 1: 新增 Cmd+K Modal Overlay HTML 結構**
  在 `<body>` 結尾處新增：
  ```html
  <div class="cmd-k-overlay" id="cmd-k-overlay" aria-hidden="true" style="display: none;">
    <div class="cmd-k-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="cmd-k-prompt-input">
        <span class="prompt-arrow">&gt;</span>
        <input type="text" id="cmd-k-input" placeholder="搜尋規範區塊..." autocomplete="off" />
      </div>
      <ul class="cmd-k-list" id="cmd-k-list">
        <li class="cmd-k-list-item selected" data-target="#colors">
          <span>01 色彩與表面 (Colors & Surfaces)</span><span class="key-chip">⏎</span>
        </li>
        <li class="cmd-k-list-item" data-target="#typography">
          <span>02 字體級距 (Typography Scale)</span><span class="key-chip">⌘2</span>
        </li>
        <li class="cmd-k-list-item" data-target="#spacing">
          <span>03 間距與深度 (Spacing & Depth)</span><span class="key-chip">⌘3</span>
        </li>
        <li class="cmd-k-list-item" data-target="#components">
          <span>04 元件樣本 (Component Showcase)</span><span class="key-chip">⌘4</span>
        </li>
        <li class="cmd-k-list-item" data-target="#layout">
          <span>05 工具配置 (Layout Chassis)</span><span class="key-chip">⌘5</span>
        </li>
        <li class="cmd-k-list-item" data-target="#tiles">
          <span>06 工具磁磚 (Tool Tiles)</span><span class="key-chip">⌘6</span>
        </li>
        <li class="cmd-k-list-item" data-target="#command">
          <span>07 命令面板說明 (Cmd+K)</span><span class="key-chip">⌘7</span>
        </li>
        <li class="cmd-k-list-item" data-target="#forms">
          <span>08 表單 (Forms)</span><span class="key-chip">⌘8</span>
        </li>
        <li class="cmd-k-list-item" data-target="#responsive">
          <span>09 響應式規則 (Responsive)</span><span class="key-chip">⌘9</span>
        </li>
      </ul>
    </div>
  </div>
  ```

- [ ] **Step 2: 實作 Cmd+K 的 CSS 樣式**
  CSS 中需定義 `.cmd-k-overlay` 滿版、背景為 `surface-overlay`、`.cmd-k-modal` 具有 4px 邊框、無圓角，以及選取列的 `selected` 樣式：
  ```css
  .cmd-k-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: var(--surface-overlay);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .cmd-k-modal {
    width: 640px;
    max-width: 90vw;
    background: var(--canvas-elevated);
    border: 4px solid var(--primary);
    padding: 24px;
    color: var(--ink-bright);
  }
  .cmd-k-prompt-input {
    display: flex;
    align-items: center;
    border-bottom: 2px solid var(--primary);
    padding-bottom: 8px;
    margin-bottom: 16px;
  }
  .cmd-k-prompt-input input {
    background: transparent;
    border: none;
    color: var(--ink-bright);
    font-size: 16px;
    outline: none;
    width: 100%;
  }
  .cmd-k-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .cmd-k-list-item {
    display: flex;
    justify-content: space-between;
    padding: 10px 12px;
    color: var(--ink);
    cursor: pointer;
  }
  .cmd-k-list-item.selected {
    background: var(--primary-dim);
    color: var(--on-primary);
    border-left: 4px solid var(--primary);
    font-weight: 600;
  }
  ```

- [ ] **Step 3: 撰寫 JavaScript 事件處理**
  實作鍵盤監聽、切換與選取功能：
  ```js
  const overlay = document.getElementById('cmd-k-overlay');
  const modalInput = document.getElementById('cmd-k-input');
  const items = document.querySelectorAll('.cmd-k-list-item');
  let selectedIndex = 0;

  function toggleModal(show) {
    overlay.style.display = show ? 'flex' : 'none';
    overlay.setAttribute('aria-hidden', !show);
    if (show) {
      modalInput.value = '';
      modalInput.focus();
      updateSelection();
    }
  }

  function updateSelection() {
    items.forEach((item, idx) => {
      item.classList.toggle('selected', idx === selectedIndex);
    });
  }

  // 快捷鍵觸發
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      toggleModal(overlay.style.display === 'none');
    }
    if (e.key === 'Escape' && overlay.style.display === 'flex') {
      toggleModal(false);
    }
    if (overlay.style.display === 'flex') {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % items.length;
        updateSelection();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        updateSelection();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const target = items[selectedIndex].getAttribute('data-target');
        toggleModal(false);
        document.querySelector(target).scrollIntoView({ behavior: 'smooth' });
      }
    }
  });

  // 點擊事件
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) toggleModal(false);
  });
  items.forEach((item, idx) => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      toggleModal(false);
      document.querySelector(target).scrollIntoView({ behavior: 'smooth' });
    });
  });

  // 點擊 Prompt Bar 中的 ⌘K 觸發器
  document.querySelector('.key-button').addEventListener('click', () => toggleModal(true));
  ```

- [ ] **Step 4: 驗證 Cmd+K 互動**
  在 Playwright 中模擬按下 `Ctrl+K`，確認彈窗是否出現、按下 `ArrowDown` 焦點是否移動、按下 `Enter` 是否關閉彈窗並滾動到對應區域。
