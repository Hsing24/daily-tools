# Phase 0 Research: 文字轉 Markdown/HTML 工具

規格中的三個模糊點已在 `/speckit.clarify` 階段解決（見 [spec.md](./spec.md) 的 `## Clarifications`）。本文件記錄 Phase 0 剩餘的實作層級技術決策——這些屬於「如何做」而非「做什麼」，因此不需要使用者澄清，採業界慣例與本專案既有模式決定。

## D1: 元件與模組佈局

- **Decision**: 沿用 `src/app/tools/word-count/` 的既有模式——一個 standalone 元件（signal 狀態 + orchestration）＋ 一個同層純函式模組（`*-converter.ts`，無副作用）＋ 各自的 `*.spec.ts`。
- **Rationale**: 這是本專案唯一已驗證過的工具佈局（[data-model.md](../001-word-count/data-model.md)、[contracts/word-count-stats.md](../001-word-count/contracts/word-count-stats.md)），符合 Constitution 原則 I（純轉換邏輯獨立、可單元測試）與原則 II（standalone、signal-based）。沿用既有模式可降低認知成本，不需要引入新的檔案佈局慣例。
- **Alternatives considered**: 將轉換邏輯內嵌於元件方法中——拒絕，違反原則 I 與 III（無法獨立單元測試、元件職責混雜）。

## D2: 段落與換行解析演算法

- **Decision**:
  1. 正規化換行字元：`\r\n|\r` → `\n`。
  2. 對整體輸入 `trim()`，移除開頭/結尾多餘空白與空白行（對應 Edge Case：開頭/結尾多餘空白行不應產生多餘空段落）。
  3. 以 `/\n{2,}/`（一個或多個連續空白行）切分為段落陣列；空輸入回傳 `{ markdown: '', html: '' }`。
  4. 每個段落內，以單一 `\n` 切分為行陣列，個別跳脫後以內嵌 `<br>` 標籤重新連接（Clarify Q2）。
- **Rationale**: 直接對應 spec FR-004 與 Edge Cases 的文字敘述，且是可決定性、可單元測試的規則，不依賴任何 Markdown/HTML 解析套件。
- **Alternatives considered**: 使用完整 Markdown 解析器（如 `marked`）反向產生排版——拒絕，過度工程化（YAGNI）；本工具的輸入被視為純文字而非既有 Markdown（見 spec Assumptions），不需要解析既有語法。

## D3: Markdown 特殊字元跳脫集合

- **Decision**: 先跳脫反斜線本身（`\` → `\\`），再跳脫以下 ASCII 符號（各自前綴 `\`）：`` ` * _ { } [ ] ( ) # + - . ! | > ~ ``。此規則不套用於 D2 為換行而刻意插入的內嵌 `<br>` 標籤本身（見 spec FR-006）。
- **Rationale**: 此字元集合對應常見「純文字轉 Markdown」工具（如 `markdown-escape` 系列套件）的實務作法，涵蓋清單（`-`/`+`/`*`）、標題（`#`）、粗體/斜體（`*`/`_`）、程式碼（`` ` ``）、引用（`>`）、連結/圖片（`[` `]` `(` `)`）等常見誤判來源，同時避免對句子中大量出現的一般標點（如逗號、句號以外情境下的引號、冒號）過度跳脫而讓輸出充滿雜訊。
- **Alternatives considered**: 依 CommonMark 定義跳脫「全部 ASCII 標點符號」——拒絕，會讓一般段落中的句號、逗號、冒號等常見標點被大量跳脫，可讀性差且非典型工具行為。

## D4: HTML 特殊字元跳脫集合

- **Decision**: 依序跳脫 `&` → `&amp;`（必須最先處理，避免重複跳脫）、`<` → `&lt;`、`>` → `&gt;`、`"` → `&quot;`、`'` → `&#39;`。
- **Rationale**: spec FR-005 明確要求跳脫 `<`、`>`、`&`、`"`；額外加入單引號跳脫是 OWASP 建議的 HTML 內容編碼作法（防禦深度），對合法輸出無副作用。
- **Alternatives considered**: 僅跳脫 spec 列出的四個字元——可行但保留單引號跳脫作為額外安全邊際，成本為零（不影響任何驗收案例）。

## D5: 大量文字「處理中」狀態呈現方式

- **Decision**: 元件內以 `signal<boolean>` 記錄 `isProcessing`。輸入文字長度低於門檻（例如 20,000 字元）時同步呼叫純函式並立即顯示結果；超過門檻時，先將 `isProcessing` 設為 `true`（讓輸出區塊顯示「處理中」），以 `setTimeout(0)`（讓出一次瀏覽器繪製機會）之後才呼叫同一個同步純函式並顯示完整結果，避免長字串處理造成單一 macrotask 卡住繪製。
- **Rationale**: 純函式本身是同步字串運算（正規表達式切分＋跳脫），效能足以在 1 秒門檻內完成（SC-001），不需要 Web Worker 或串流式增量演算法。以 `setTimeout(0)` 讓出一次事件迴圈，就能讓瀏覽器先繪製「處理中」狀態，符合原則 I 的簡單優先（YAGNI）。
- **Alternatives considered**: 使用 Web Worker 執行轉換——拒絕，對此規模（≤50,000 字元的字串運算）過度工程化，且會增加建置與訊息傳遞複雜度，不符合 Constitution 原則 I。

## D6: 複製到剪貼簿的回饋模式

- **Decision**: 沿用 `word-count` 現有的剪貼簿互動模式：以 `navigator.clipboard.writeText()` 寫入；成功時透過 `app-tool-alert`（或等效的 `aria-live="polite"` 訊息區）顯示「已複製」；若 API 不存在或呼叫失敗（權限拒絕、非安全環境），顯示提示訊息並不阻擋使用者手動選取文字複製。
- **Rationale**: 與既有 `word-count.ts` 的 `paste()` 失敗處理手法一致（try/catch + 能力檢測 + 使用者可感知提示），維持全站互動模式一致性，符合 FR-008 與 SC-005。
- **Alternatives considered**: 使用第三方複製套件（如 `clipboard.js`）——拒絕，`navigator.clipboard` 已足夠且專案其他工具已採用原生 API，無需新增相依套件。
