# Tasks: 文字轉 Markdown/HTML 工具

**Input**: Design documents from `/specs/002-text-markdown-html/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/text-markdown-html-converter.md](./contracts/text-markdown-html-converter.md), [quickstart.md](./quickstart.md)

**Tests**: 本專案 Constitution 原則 III（Test-First Discipline）要求純轉換邏輯 MUST 有對應單元測試，因此本 tasks.md 包含測試任務（非選用）。

**Organization**: 任務依使用者故事分組，對應 spec.md 的 P1/P2/P3 優先度，可獨立實作與測試。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行執行（不同檔案、無相依關係）
- **[Story]**: 對應的使用者故事（US1/US2/US3）
- 描述中包含明確檔案路徑

## Path Conventions

單一 Angular SPA 專案（既有 `daily-tools` 儲存庫），本功能僅新增 `src/app/tools/text-markdown-html/` 一個工具目錄，並修改 `src/app/app.routes.ts`、`src/app/layout/layout.ts` 兩個既有註冊點（見 [plan.md](./plan.md) Project Structure）。

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 建立工具目錄骨架並完成路由/工具清單註冊，讓頁面可被導覽（尚無實際轉換邏輯）

- [ ] T001 建立 `src/app/tools/text-markdown-html/` 目錄與元件骨架檔案：`text-markdown-html.ts`（standalone component，selector `app-text-markdown-html`）、`text-markdown-html.html`、`text-markdown-html.css`，佈局比照 `src/app/tools/word-count/`
- [ ] T002 在 `src/app/app.routes.ts` 新增子路由 `{ path: 'text-markdown-html', loadComponent: () => import('./tools/text-markdown-html/text-markdown-html').then(m => m.TextMarkdownHtml) }`
- [ ] T003 [P] 在 `src/app/layout/layout.ts` 的 `toolGroups`「文字工具」群組新增工具項目 `{ label: '文字轉 Markdown/HTML', route: 'text-markdown-html', available: true }`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 建立所有使用者故事共用的核心轉換邏輯與元件狀態骨架

**⚠️ CRITICAL**: 本階段完成前不可開始任何使用者故事的實作

- [ ] T004 [P] 依 [contracts/text-markdown-html-converter.md](./contracts/text-markdown-html-converter.md) 的驗收範例，在 `src/app/tools/text-markdown-html/text-markdown-html-converter.spec.ts` 撰寫 `convertTextToMarkdownAndHtml` 的單元測試（空字串、僅空白/換行、單段落、多段落、段落內換行、Markdown 特殊字元跳脫、HTML 特殊字元跳脫、前後多餘空行、連續多個空行）——先確認測試在實作前會失敗
- [ ] T005 在 `src/app/tools/text-markdown-html/text-markdown-html-converter.ts` 實作 `TextConversionResult` 介面與 `convertTextToMarkdownAndHtml(text)` 純函式，依 contracts 的 8 步規則（正規化換行、trim、段落切分、換行以內嵌 `<br>` 表示、Markdown 跳脫字元集、HTML 實體跳脫），使 T004 測試通過
- [ ] T006 在 `src/app/tools/text-markdown-html/text-markdown-html.ts` 建立元件狀態骨架：`sourceText = signal('')`、`isProcessing = signal(false)`、`conversionResult = computed(() => convertTextToMarkdownAndHtml(this.sourceText()))`，並依 [research.md](./research.md) D5 實作大量文字（>20,000 字元）延後計算與 `isProcessing` 切換邏輯（`setTimeout(0)`）

**Checkpoint**: 核心轉換邏輯與狀態骨架就緒，可開始各使用者故事的 UI 實作

---

## Phase 3: User Story 1 - 貼上純文字並立即取得 Markdown 與 HTML 轉換結果 (Priority: P1) 🎯 MVP

**Goal**: 使用者貼上/輸入純文字後，立即在下方看到對應的 Markdown 輸出與 HTML 輸出，保留段落與換行結構

**Independent Test**: 在輸入區貼入一段含多個段落與換行的已知文字，確認下方同時出現正確對應的 Markdown 輸出與 HTML 輸出

### Tests for User Story 1 ⚠️

> 先撰寫並確認測試失敗，再進行實作

- [ ] T007 [P] [US1] 在 `src/app/tools/text-markdown-html/text-markdown-html.spec.ts` 撰寫測試：初始狀態兩個輸出區塊為空；輸入/貼上文字後兩個輸出同步即時更新（對應 spec US1 AC1-3）
- [ ] T008 [P] [US1] 在同一 spec 檔新增測試：「貼上」按鈕於剪貼簿讀取成功時取代輸入區內容並觸發轉換；讀取失敗或不支援時顯示提示訊息（對應 spec US1 AC4、FR-002）

### Implementation for User Story 1

- [ ] T009 [US1] 在 `src/app/tools/text-markdown-html/text-markdown-html.html` 建立頁面骨架：`app-tool-breadcrumb`（category="文字工具"、current="文字轉 Markdown/HTML"）+ `app-tool-panel` + `app-tool-header`（zh-Hant 文案），以及綁定 `sourceText` 的具 `<label>` 的 textarea（`(input)` 更新 signal）（FR-001, FR-012）
- [ ] T010 [US1] 在 `text-markdown-html.ts` 實作 `paste()` 方法（比照 `word-count.ts` 的 `paste()` 模式：能力檢測 + try/catch + 失敗時設定 `clipboardAlert` signal），並在 `text-markdown-html.html` 加入「貼上」按鈕與 `app-tool-alert` 顯示 `clipboardAlert()`（FR-002）
- [ ] T011 [US1] 在 `text-markdown-html.html` 使用兩個獨立的 `app-terminal-output` 區塊分別呈現 `conversionResult().markdown` 與 `conversionResult().html`，空輸入時兩者皆不顯示內容（FR-005, FR-007 顯示部分, FR-010）
- [ ] T012 [US1] 在 `text-markdown-html.html` 依 `isProcessing()` signal 呈現「處理中」狀態（覆蓋/暫緩顯示前一次結果，不逐步顯示部分結果），對應 [data-model.md](./data-model.md) ProcessingState 與 research.md D5（FR-014）
- [ ] T013 [US1] 為兩個輸出區塊與 `clipboardAlert` 提示加上 `aria-live="polite"` 區域，確保內容更新可被輔助技術感知而不過度干擾（FR-013）

**Checkpoint**: User Story 1 應可完整獨立運作與測試（貼上文字 → 看到雙輸出）

---

## Phase 4: User Story 2 - 複製其中一種輸出格式 (Priority: P2)

**Goal**: 使用者可將 Markdown 或 HTML 輸出個別複製到剪貼簿

**Independent Test**: 在任一輸出區塊按下「複製」按鈕，確認該區塊內容被寫入剪貼簿並顯示成功提示；剪貼簿不可用時顯示替代提示

### Tests for User Story 2 ⚠️

- [ ] T014 [P] [US2] 在 `text-markdown-html.spec.ts` 撰寫測試：Markdown/HTML 各自的「複製」按鈕於剪貼簿寫入成功時顯示「已複製」回饋（對應 spec US2 AC1）
- [ ] T015 [P] [US2] 在同一 spec 檔新增測試：剪貼簿寫入失敗或不支援時顯示替代提示，且不拋出例外（對應 spec US2 AC2、FR-008）

### Implementation for User Story 2

- [ ] T016 [P] [US2] 在 `text-markdown-html.ts` 新增 `copyStatus` 相關 signals（`copyMarkdownStatus`、`copyHtmlStatus`，見 [data-model.md](./data-model.md) FeedbackMessage）與 `copyMarkdown()`/`copyHtml()` 方法，使用 `navigator.clipboard.writeText()` 並依 [research.md](./research.md) D6 做能力檢測與失敗回退
- [ ] T017 [US2] 在 `text-markdown-html.html` 為兩個輸出區塊各自加上「複製」按鈕，綁定 `copyMarkdown()`/`copyHtml()`，並以 `aria-live="polite"` 元素顯示對應的回饋文字（FR-007, FR-008, FR-013）

**Checkpoint**: User Story 1 與 2 應可同時獨立運作

---

## Phase 5: User Story 3 - 一鍵清除內容 (Priority: P3)

**Goal**: 使用者可一鍵清空輸入區與兩個輸出區塊

**Independent Test**: 輸入區與兩個輸出區塊皆有內容時按下「清除」，確認三者同步清空；輸入區已空時按「清除」不產生錯誤

### Tests for User Story 3 ⚠️

- [ ] T018 [P] [US3] 在 `text-markdown-html.spec.ts` 撰寫測試：內容存在時呼叫 `clear()`，`sourceText`、`isProcessing`、`clipboardAlert`、`copyMarkdownStatus`、`copyHtmlStatus` 皆重設為預設值（對應 spec US3 AC1）
- [ ] T019 [P] [US3] 在同一 spec 檔新增測試：輸入已為空時呼叫 `clear()`，狀態維持為空且不拋出例外（對應 spec US3 AC2）

### Implementation for User Story 3

- [ ] T020 [US3] 在 `text-markdown-html.ts` 實作 `clear()` 方法，重設 `sourceText`、`isProcessing`、`clipboardAlert`、`copyMarkdownStatus`、`copyHtmlStatus` 為預設值（FR-009）
- [ ] T021 [US3] 在 `text-markdown-html.html` 加入「清除」按鈕，綁定 `clear()`（比照 `word-count.ts` 的清除按鈕樣式與位置）（FR-009）

**Checkpoint**: 三個使用者故事應皆可獨立運作

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 影響全部使用者故事的收尾工作

- [ ] T022 [P] 檢視 `text-markdown-html.html` 全部樣式皆使用 Master CSS atomic classes（依 DESIGN.md tokens），無自訂圓角/陰影/漸層；`text-markdown-html.css` 僅保留 Master CSS 無法表達的必要選擇器
- [ ] T023 [P] 無障礙複查：textarea 具 `<label>`、所有按鈕為原生 `<button>`、可見焦點指示、鍵盤可操作性，符合 WCAG 2.2 AA（FR-013）
- [ ] T024 執行 `pnpm exec ng test --watch=false`，確認 T004、T007、T008、T014、T015、T018、T019 等新測試全數通過
- [ ] T025 執行 `pnpm run build`，確認新路由的懶載入 chunk 正常產出且不影響 `--base-href "/daily-tools/"` 設定
- [ ] T026 依 [quickstart.md](./quickstart.md) 逐步執行手動驗證（含大量文字「處理中」狀態情境）
- [ ] T027 [P] 在 `text-markdown-html-converter.spec.ts` 新增效能驗收測試（對應 SC-001）：以 50,000 字元的合成輸入（多段落＋換行）呼叫 `convertTextToMarkdownAndHtml`，以 `performance.now()` 量測執行時間並斷言 < 1 秒；門檻設定需在 CI 環境有合理容錯，避免偶發性 flaky failure

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無相依，可立即開始
- **Foundational (Phase 2)**: 依賴 Setup 完成——會阻擋所有使用者故事
- **User Stories (Phase 3+)**: 皆依賴 Foundational 完成
  - 可依優先順序循序進行（P1 → P2 → P3），或有多位開發者時平行進行
- **Polish (Phase 6)**: 依賴所欲交付的使用者故事皆已完成

### User Story Dependencies

- **User Story 1 (P1)**: Foundational 完成後即可開始，不依賴其他故事
- **User Story 2 (P2)**: Foundational 完成後即可開始；UI 上疊加於 US1 的輸出區塊，但獨立可測試（複製功能本身）
- **User Story 3 (P3)**: Foundational 完成後即可開始；操作 US1/US2 建立的狀態，但清除行為本身獨立可測試

### Within Each User Story

- 測試先寫、先確認失敗，再進行實作
- 元件狀態/邏輯先於樣板（template）綁定
- 每個故事完成後才進入下一優先度的故事

### Parallel Opportunities

- T003 可與 T001、T002 平行（不同檔案）
- T004（測試）可先於 T005（實作）撰寫並平行於 T006 進行
- 同一故事內標示 [P] 的測試任務可平行撰寫（不同 `it`/獨立情境，惟同屬一個 spec 檔案時建議依序提交以避免合併衝突）
- T016（US2 狀態/方法）與 T009-T013（US1 樣板）分屬不同開發階段，但若 Foundational 已完成，多位開發者可分別平行處理 US1/US2/US3

---

## Parallel Example: User Story 1

```bash
# US1 測試任務可先一併撰寫：
Task: "撰寫初始空狀態與即時更新測試 in text-markdown-html.spec.ts"
Task: "撰寫貼上按鈕成功/失敗測試 in text-markdown-html.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. 完成 Phase 1：Setup
2. 完成 Phase 2：Foundational（核心轉換邏輯，關鍵阻擋項）
3. 完成 Phase 3：User Story 1
4. **停下並獨立驗證**：依 quickstart.md 手動測試貼上文字 → 雙輸出
5. 視需要部署/展示（MVP 已可用）

### Incremental Delivery

1. Setup + Foundational 完成 → 基礎就緒
2. 加入 User Story 1 → 獨立測試 → 部署/展示（MVP！）
3. 加入 User Story 2（複製）→ 獨立測試 → 部署/展示
4. 加入 User Story 3（清除）→ 獨立測試 → 部署/展示
5. Phase 6 收尾（樣式/無障礙/建置驗證）

---

## Notes

- [P] 任務 = 不同檔案、無相依關係
- [Story] 標籤將任務對應到特定使用者故事以利追溯
- 每個使用者故事應可獨立完成與測試
- 實作前務必先確認測試失敗
- 建議每完成一個任務或一組邏輯相關任務即提交一次
- 可於任一 Checkpoint 停下獨立驗證該故事
