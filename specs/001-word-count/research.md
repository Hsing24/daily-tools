# Phase 0 Research: 字數統計工具

研究目標：解決規格與技術脈絡中的不確定點，確立計算規則、剪貼簿策略、即時計算與測試方式。所有 NEEDS CLARIFICATION 已在 `/speckit.clarify` 解決，本檔記錄最終技術決策與理由。

## R1. CJK 字數的計算演算法

- **Decision**: 以 Unicode property escape 正規表示式辨識 CJK 與 emoji 字元，各自計數後替換為空白，剩餘內容以空白分詞；`words = CJK 字元數 + emoji 數 + 其餘詞段數`。CJK 範圍涵蓋 Han、Hiragana、Katakana、Hangul； emoji 以 `\p{Extended_Pictographic}` 辨識：
  ```ts
  const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;
  const EMOJI = /\p{Extended_Pictographic}/gu;
  const cjk = (text.match(CJK) ?? []).length;
  const emoji = (text.match(EMOJI) ?? []).length;
  const other = text.replace(CJK, ' ').replace(EMOJI, ' ').split(/\s+/).filter(Boolean).length;
  const words = cjk + emoji + other;
  ```
- **Rationale**: 對 zh-Hant 使用者，「字數」直覺上即每個漢字一個字；emoji 同樣被使用者視為一個「字」，故逐個計入（分析階段補定）；對中英混排同時保留英文的詞計算，三者相加最符合預期（Clarify Q1=A）。`\p{Emoji}` 會詤包含 ASCII 數字 0-9，故採不含數字的 `\p{Extended_Pictographic}`。Unicode property escape 比手寫碼點範圍更正確且可讀，避免遺漏擴展區。
- **Alternatives considered**:
  - 純空白分詞：中文整段算 1 個字，明顯不符 zh-Hant 預期 → 拒絕。
  - 字數 = 字元數：失去英文「詞」的語意，且與「字元數」欄位重複 → 拒絕。
  - 以 `\p{Emoji}` 辨識 emoji：會把 ASCII 數字算成字 → 拒絕，改用 `\p{Extended_Pictographic}`。
  - 手寫 `\u4E00-\u9FFF` 等碼點範圍：易遺漏 Ext A/B、可讀性差 → 拒絕。

## R2. 字元數與 emoji / 代理對（surrogate pair）

- **Decision**: 以碼點（code point）計數，而非 UTF-16 單位。`charactersWithSpaces = [...text].length`；`charactersNoSpaces = [...text].filter(c => !/\s/u.test(c)).length`。
- **Rationale**: `"😀".length === 2`（UTF-16），但使用者視為 1 個字元。用展開運算子/`Array.from` 依碼點計數，emoji 與多數 BMP 外字元得到符合直覺的結果。
- **Alternatives considered**: 直接用 `string.length`（UTF-16 單位）→ emoji 被算成 2，違反 SC-002 的「符合預期規則」→ 拒絕。`Intl.Segmenter`（grapheme 叢集）能處理組合字/旗幟 emoji，但為單一工具引入額外複雜度，YAGNI → 本版採碼點計數，於契約中載明此限制。

## R3. 行數的計算

- **Decision**: 空字串 → 0；否則以 `/\r\n|\r|\n/` 分割後的段數。`lines = text === '' ? 0 : text.split(/\r\n|\r|\n/).length`。
- **Rationale**: 一行未換行的文字為 1 行；每個換行新增一行（含末尾換行造成的尾端空行），符合一般編輯器的行號直覺。統一處理 `\r\n`/`\r`/`\n` 以跨平台一致。
- **Alternatives considered**: 計算 `\n` 數量 +1（不處理 `\r`）→ 舊式 Mac/Windows 行尾不一致 → 拒絕。

## R4. 剪貼簿讀取與失敗退路

- **Decision**: 「貼上」按鈕呼叫 `navigator.clipboard.readText()`（async）。成功 → 取代 textarea 全部內容並觸發統計。失敗或不支援（未授權、非安全環境、`navigator.clipboard` 不存在）→ 顯示 zh-Hant 提示訊息（例如「無法讀取剪貼簿，請改用鍵盤 Ctrl/⌘+V 貼上」），不阻斷工具；使用者仍可在 textarea 內以鍵盤貼上。
- **Rationale**: 滿足 FR-002/FR-003 與 SC-005；Clipboard API 在無安全環境或未授權時會 reject，必須以 try/catch 包覆並提供可操作的替代路徑。
- **Alternatives considered**: 使用已棄用的 `document.execCommand('paste')` → 不可靠且多數瀏覽器停用 → 拒絕。完全不放貼上按鈕 → 不符使用者明確需求 → 拒絕。

## R5. 即時計算的狀態管理

- **Decision**: textarea 內容存於 `signal<string>('')`，統計以 `computed(() => computeTextStats(text()))` 衍生；模板用 `(input)` 事件（或 `[(ngModel)]` 替代 — 採無依賴的 `(input)` + signal set）更新 text signal。
- **Rationale**: 符合原則 II（signal-first）。`computed` 只在 text 變更時重算且具記憶化，滿足 SC-001 即時更新且不需手動「計算」鍵（FR-004）。一般長度內容的計算為 O(n) 字串掃描，數千字遠低於 0.1 秒。
- **Alternatives considered**: `BehaviorSubject` + async pipe → 違反 signal-first 慣例 → 拒絕。每次按鍵重建整個物件無記憶化 → 對極大量文字略增成本，但 `computed` 已記憶化故無需額外節流；若日後出現效能問題再評估 debounce（YAGNI，現版不加）。

## R6. 樣式與版面（DESIGN.md token 對應）

- **Decision**: 以 Master CSS atomic class 套用 DESIGN.md token：
  - 外層工具面板 → `tool-panel`（`bg:#122339`、`border:2|solid|#3FE0C5`、`p:24`、無圓角）。
  - 輸入區 → `textarea-code`/`text-input` 取向（`bg:#081424` 或 `#272822`、`border:2px`、monospace）。
  - 「貼上」→ `button-primary`（mint）、「清除」→ `button-warning`（紅）。
  - 統計數字 → `pixel-h3`/`mono-h4`，標籤 → `mono-caption`/`pixel-eyebrow`。
- **Rationale**: 原則 IV 要求所有視覺取自 DESIGN.md；零圓角/陰影/漸層。按鈕語意對應：主要動作（貼上）用 primary，破壞性動作（清除）用 warning。
- **Alternatives considered**: 自訂顏色或 Tailwind 類別 → 違反原則 IV 與專案 Master CSS 設定 → 拒絕。

## R7. 無障礙（WCAG 2.2 AA）

- **Decision**:
  - textarea 以 `<label for>` 關聯可見標籤（FR-011）。
  - 統計區包成 `role="status"` 或 `aria-live="polite"` 區域，內容變更時被輔助技術朗讀（4.1.3）。
  - 「貼上」「清除」為原生 `<button type="button">`，具可見 focus（DESIGN 焦點樣式，不可移除 outline）。
  - 剪貼簿失敗提示以 `role="alert"` 或 `aria-live` 告知。
- **Rationale**: 原則 V 與 a11y instructions（A8 live region、F1 label、K5 focus visible）。
- **Alternatives considered**: 以 `<div>` 當按鈕 → 違反語意 HTML（S8/K1）→ 拒絕。

## R8. 工具目錄登錄與路由

- **Decision**: 在 `app.routes.ts` 的 `Layout` children 新增 `{ path: 'word-count', loadComponent: () => import('./tools/word-count/word-count').then(m => m.WordCount) }`。在 `layout.ts` `toolGroups` 新增分組「文字工具」，項目 `{ label: '字數統計', route: 'word-count', available: true }`。
- **Rationale**: 沿用 AGENTS.md 與 `layout.html` 既有 `@if (tool.available && tool.route)` 渲染邏輯；base-href `/daily-tools/` 由相對 routerLink 自動處理。
- **Alternatives considered**: 放進現有「格式化與轉換」分組 → 語意不符（字數統計非格式化）→ 採新分組。
