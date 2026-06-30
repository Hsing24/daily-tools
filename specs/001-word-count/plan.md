# Implementation Plan: 字數統計工具

**Branch**: `001-word-count` | **Date**: 2026-06-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-word-count/spec.md`

## Summary

新增一個純前端的「字數統計」工具：使用者在 textarea 輸入或按「貼上」按鈕帶入剪貼簿文字，下方即時顯示四項統計（字元數、不含空白字元數、字數、行數），並提供「清除」按鈕一鍵清空。核心計算為一個無副作用的純函式（`computeTextStats`），與 Angular standalone 元件分離，便於單元測試。字數採混合規則：CJK 字元每字算 1 個，非 CJK 內容以空白分詞，兩者相加。

## Technical Context

**Language/Version**: TypeScript 5.x（Angular 22, strict 模式）
**Primary Dependencies**: Angular 22（standalone components, signals）、`@master/css`（atomic styling）；無新增第三方套件
**Storage**: N/A（不持久化；內容僅存於元件記憶體中的 signal）
**Testing**: Vitest（`@angular/build:unit-test`, jsdom），specs 與實作同層
**Target Platform**: 現代瀏覽器 SPA（GitHub Pages, base-href `/daily-tools/`）
**Project Type**: 單一前端專案（Angular SPA）
**Performance Goals**: 一般長度內容（數千字）統計於 0.1 秒內反映（SC-001）；輸入時不可凍結 UI
**Constraints**: 無後端、離線可用、純客戶端計算；剪貼簿讀取需處理未授權/不支援的退路（FR-003）
**Scale/Scope**: 單一工具頁面 + 一個純計算函式；4 項統計指標

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 評估 | 結果 |
|------|------|------|
| I. SOLID & Simplicity-First | 計算邏輯抽成單一職責純函式 `computeTextStats`；元件僅負責 UI 編排；無投機抽象 | PASS |
| II. Standalone-Component Architecture | `app-word-count` standalone 元件、signal 狀態、lazy route、登錄工具目錄、`@if`/`@for` 控制流 | PASS |
| III. Test-First Discipline | 純函式先寫 spec（含 CJK、emoji、空白、行數邊界）；元件 spec 驗證貼上/清除/即時更新 | PASS |
| IV. Design-System Fidelity | 取用 DESIGN.md token：`tool-panel`、`button-primary`/`button-warning`、`text-input`/`textarea-code`；無圓角/陰影/漸層 | PASS |
| V. Accessibility & Localization | zh-Hant 文案；`<label>` 關聯 textarea；統計區 `aria-live="polite"`；按鈕語意化、焦點可見；剪貼簿失敗以提示告知 | PASS |

**Initial Constitution Check: PASS** — 無違規，無需 Complexity Tracking。

**Post-Design Constitution Check: PASS** — Phase 1 設計維持單一純函式 + 單一元件，未引入額外抽象或依賴。

## Project Structure

### Documentation (this feature)

```text
specs/001-word-count/
├── plan.md              # 本檔
├── research.md          # Phase 0 輸出
├── data-model.md        # Phase 1 輸出
├── quickstart.md        # Phase 1 輸出
├── contracts/
│   └── word-count-stats.md   # 純計算函式契約
└── checklists/
    └── requirements.md  # 規格品質檢查（已存在）
```

### Source Code (repository root)

```text
src/app/
├── app.routes.ts                       # 新增 lazy route: word-count
├── layout/
│   └── layout.ts                       # toolGroups 新增「文字工具」分組 + 啟用項目
└── tools/
    └── word-count/
        ├── word-count.ts               # app-word-count standalone 元件
        ├── word-count.html             # 模板（textarea + 按鈕 + 統計區）
        ├── word-count.css              # 最小化 scoped CSS（fallback）
        ├── word-count.spec.ts          # 元件測試（貼上/清除/即時更新/a11y）
        ├── word-count-stats.ts         # 純函式 computeTextStats（核心邏輯）
        └── word-count-stats.spec.ts    # 純函式單元測試
```

**Structure Decision**: 單一前端專案。新工具放在新的 `src/app/tools/<tool-name>/` 目錄下，沿用 AGENTS.md 建議的 lazy-route 慣例。核心計算與 UI 分離為兩個檔案，符合原則 I（單一職責、可獨立測試）。工具目錄項目新增於 `layout.ts` 的 `toolGroups`（現有三組偏格式/網路/樣式，字數統計屬文字處理，故新增「文字工具」分組），並把 `available` 設為 `true` 且帶 `route`，`layout.html` 既有 `@if (tool.available && tool.route)` 即會渲染為連結。

## Complexity Tracking

> 無違規，無需填寫。
