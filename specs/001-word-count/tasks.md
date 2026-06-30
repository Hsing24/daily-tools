---
description: "Task list for 字數統計工具 implementation"
---

# Tasks: 字數統計工具

**Input**: Design documents from `/specs/001-word-count/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/word-count-stats.md](contracts/word-count-stats.md)

**Tests**: 包含。本專案 Constitution 原則 III（Test-First Discipline）強制要求純轉換邏輯有單元測試，故測試任務為必要、非選配。

**Organization**: 任務依使用者故事分組，每組可獨立實作與驗證。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行執行（不同檔案、無未完成相依）
- **[Story]**: 所屬使用者故事（US1, US2）
- 每個任務含明確檔案路徑

## Path Conventions

單一前端專案（Angular SPA）。工具程式碼位於 `src/app/tools/word-count/`，路由於 `src/app/app.routes.ts`，工具目錄於 `src/app/layout/layout.ts`。Spec 與實作同層（`*.spec.ts`）。

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 建立工具目錄、元件骨架、路由與目錄登錄

- [ ] T001 在 `src/app/tools/word-count/` 建立 standalone 元件骨架：`word-count.ts`（`selector: 'app-word-count'`、`templateUrl`、`styleUrl`，class `WordCount`）、`word-count.html`（暫置最小標記）、`word-count.css`（空）
- [ ] T002 [P] 在 `src/app/app.routes.ts` 的 `Layout` children 新增 lazy route：`{ path: 'word-count', loadComponent: () => import('./tools/word-count/word-count').then((m) => m.WordCount) }`
- [ ] T003 [P] 在 `src/app/layout/layout.ts` 的 `toolGroups` 新增分組「文字工具」，項目 `{ label: '字數統計', route: 'word-count', available: true }`

**Checkpoint**: 路由可導覽至空白的 `app-word-count` 頁面，側欄出現可點擊的「字數統計」

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 實作兩個故事共用的核心計算函式 `computeTextStats`

**⚠️ CRITICAL**: US1 與 US2 皆依賴此計算函式，必須先完成

- [ ] T004 [P] 依 [contracts/word-count-stats.md](contracts/word-count-stats.md) 的驗收範例表，在 `src/app/tools/word-count/word-count-stats.spec.ts` 撰寫 `computeTextStats` 單元測試（涵蓋空字串、`hello world`、`你好世界`、`你好 world`、純空白、多行、尾端換行、emoji（每個算 1 字）、全形標點），確認測試先 FAIL
- [ ] T005 在 `src/app/tools/word-count/word-count-stats.ts` 實作 `TextStats` 介面與純函式 `computeTextStats(text: string): TextStats`：碼點計字元數、`\s` 判空白、CJK（`/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu`）與 emoji（`/\p{Extended_Pictographic}/gu`）各計數後替換為空白，剩餘以 `/\s+/` 分詞，三者相加、行數空字串為 0 否則 `split(/\r\n|\r|\n/).length`，使 T004 測試全綠

**Checkpoint**: 核心計算函式通過所有契約範例測試，可被元件取用

---

## Phase 3: User Story 1 - 貼上文字並即時看到字數統計 (Priority: P1) 🎯 MVP

**Goal**: 使用者輸入或按「貼上」帶入文字後，下方四項統計即時更新

**Independent Test**: 在輸入區輸入/貼上已知字數文字，確認字元數、不含空白字元數、字數、行數即時且正確顯示

### Tests for User Story 1 ⚠️（先寫並確認 FAIL）

- [ ] T006 [US1] 在 `src/app/tools/word-count/word-count.spec.ts` 撰寫測試：設定 textarea 值並觸發 `input` 後，`await fixture.whenStable()`，統計 DOM 顯示對應數字；初始（空）狀態四項顯示 0
- [ ] T007 [US1] 在 `src/app/tools/word-count/word-count.spec.ts` 撰寫「貼上」測試：stub `navigator.clipboard.readText` 回傳文字 → 按貼上後內容取代輸入區並更新統計；stub reject → 顯示提示訊息（jsdom 需 stub clipboard）

### Implementation for User Story 1

- [ ] T008 [US1] 在 `src/app/tools/word-count/word-count.ts` 加入 `text = signal('')` 與 `stats = computed(() => computeTextStats(this.text()))`，並提供 `onInput(value: string)` 更新 text signal
- [ ] T009 [US1] 在 `src/app/tools/word-count/word-count.html` 加入 `<label for>` 關聯的 `<textarea>`（`(input)` 綁定）與下方統計區（四項：字元數、不含空白字元數、字數、行數），統計區加 `role="status" aria-live="polite"`，空狀態顯示 0
- [ ] T010 [US1] 在 `word-count.ts` 加入 `paste()` 方法：以 try/catch 呼叫 `navigator.clipboard.readText()`，成功則 `text.set(...)`；失敗/不支援則設定 zh-Hant 提示訊息 signal；在 `word-count.html` 加入「貼上」`<button type="button">` 與提示訊息顯示區（`aria-live`）
- [ ] T011 [US1] 在 `word-count.html`/`word-count.css` 套用 DESIGN.md token：面板 `tool-panel`、輸入區 `text-input`/`textarea-code` 取向、「貼上」`button-primary`、統計數字 `pixel-h3`/`mono-h4`、標籤 `mono-caption`；零圓角/陰影/漸層，焦點 outline 保留

**Checkpoint**: US1 可獨立運作——輸入/貼上即時更新四項統計，MVP 可展示

---

## Phase 4: User Story 2 - 一鍵清除內容 (Priority: P2)

**Goal**: 按「清除」一鍵清空輸入區且統計歸零

**Independent Test**: 輸入區有內容時按「清除」，確認內容清空且四項統計歸 0

### Tests for User Story 2 ⚠️（先寫並確認 FAIL）

- [ ] T012 [US2] 在 `src/app/tools/word-count/word-count.spec.ts` 撰寫測試：設定內容後按「清除」按鈕，確認 textarea 值為空且四項統計顯示 0；空狀態下再次按「清除」不報錯

### Implementation for User Story 2

- [ ] T013 [US2] 在 `src/app/tools/word-count/word-count.ts` 加入 `clear()` 方法將 `text.set('')`（並清空任何提示訊息）
- [ ] T014 [US2] 在 `src/app/tools/word-count/word-count.html` 加入「清除」`<button type="button">`（DESIGN.md `button-warning`）綁定 `clear()`

**Checkpoint**: US1 與 US2 皆可獨立運作

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: 跨故事的收尾與驗證

- [ ] T015 [P] 無障礙複查：Tab 走訪 textarea/貼上/清除焦點可見、`<label>` 關聯、統計與提示為 live region（對照 spec FR-011）
- [ ] T016 執行 [quickstart.md](quickstart.md) 手動驗收 6 項情境
- [ ] T017 執行 `source ~/.nvm/nvm.sh && nvm use 26 && pnpm test && pnpm run build`，確認測試全綠且建置成功；必要時以 Prettier 預設格式化新檔

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無相依，可立即開始
- **Foundational (Phase 2)**: 依賴 Phase 1（元件目錄存在）；阻擋所有使用者故事
- **User Stories (Phase 3+)**: 皆依賴 Phase 2（`computeTextStats` 完成）
- **Polish (Phase 5)**: 依賴所有故事完成

### User Story Dependencies

- **US1 (P1)**: Phase 2 完成後即可開始；不依賴其他故事
- **US2 (P2)**: Phase 2 完成後即可開始；與 US1 共用同一元件檔，建議於 US1 之後進行以避免同檔衝突，但邏輯上可獨立測試

### Within Each User Story

- 測試先寫且 FAIL，再實作（原則 III）
- 純函式（Phase 2）先於元件邏輯（US1/US2）
- 元件邏輯（`.ts`）與模板（`.html`）後接樣式（`.css`）

### Parallel Opportunities

- T002、T003 可平行（不同檔案）
- T004 可與 T002/T003 平行（不同檔案）
- US1 的測試 T006、T007 與 US2 的 T012 皆寫入同一 `word-count.spec.ts`，須循序進行（非平行）
- 跨檔的 polish 任務 T015 可與 T016 平行

---

## Parallel Example: Setup + Foundational

```bash
# 完成 T001（元件骨架）後，可平行：
Task: "T002 在 app.routes.ts 新增 word-count lazy route"
Task: "T003 在 layout.ts 新增『文字工具』分組與字數統計項目"
Task: "T004 撰寫 word-count-stats.spec.ts 契約測試"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. 完成 Phase 1：Setup（元件骨架、路由、目錄登錄）
2. 完成 Phase 2：Foundational（`computeTextStats` + 測試）
3. 完成 Phase 3：US1（textarea + 貼上 + 即時統計）
4. **STOP and VALIDATE**：獨立驗證 US1（輸入/貼上即時更新統計）
5. 可展示/部署

### Incremental Delivery

- US1 即為可交付的 MVP；US2（一鍵清除）為其上的便利性增量。
- 每完成一個故事即跑 `pnpm test` 確保不回歸。
