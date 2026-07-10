# Implementation Plan: 文字轉 Markdown/HTML 工具

**Branch**: `002-text-markdown-html` | **Date**: 2026-07-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-text-markdown-html/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

新增一個「文字轉 Markdown/HTML」工具頁：使用者在 textarea 貼上/輸入純文字後，即時、同步產生兩種輸出——保留段落與換行結構的 Markdown 片段（換行以內嵌 `<br>` 表示）與 HTML 內容片段（`<p>`/`<br>`，含必要字元跳脫），各自附「複製」按鈕；大量文字（>50,000 字元）轉換時輸出區顯示「處理中」狀態。核心轉換邏輯為一個純函式（無副作用、無外部相依），與既有 `word-count` 工具相同的「純函式 + Signal 元件」架構模式一致，並重用既有 `shared/ui` 元件與 DESIGN.md 視覺系統。

## Technical Context

**Language/Version**: TypeScript 5.x（Angular 22 專案既有設定，`strict` 系列選項含 `noPropertyAccessFromIndexSignature` 等）
**Primary Dependencies**: Angular 22（standalone components、signals）、`@master/css`（atomic 樣式，已於 `src/main.ts` 以 `init()` 啟動）；重用既有 `src/app/shared/ui/*`（`tool-panel`、`tool-header`、`tool-breadcrumb`、`tool-alert`、`terminal-output`、`stat-row`、`key-chip`）
**Storage**: N/A（純前端、記憶體內 `signal`，不持久化任何輸入或輸出內容）
**Testing**: Vitest，透過 `@angular/build:unit-test`（jsdom 環境），`pnpm exec ng test --watch=false`；規格檔（`*.spec.ts`）與被測檔同層
**Target Platform**: 瀏覽器 SPA（GitHub Pages 靜態託管，`base-href: /daily-tools/`）
**Project Type**: 既有單一 Angular SPA 專案內新增一個工具頁（無新專案、無後端）
**Performance Goals**: 一般長度文字於 0.5 秒內完成轉換並反映到畫面（SC-001）；50,000 字元內的大量文字於 1 秒內完成轉換且不凍結 UI（SC-001、FR-014）
**Constraints**: 純前端、無網路請求；HTML 輸出僅內容片段（不含 `<html>`/`<head>`/`<body>`，Clarify Q1）；Markdown 換行以內嵌 HTML `<br>` 表示（Clarify Q2）；輸出跳脫需防止腳本注入風險（OWASP 輸出編碼原則）；所有文案 zh-Hant；WCAG 2.2 AA
**Scale/Scope**: 單一工具頁（1 個元件 + 1 個純轉換函式模組 + 對應測試），無資料庫、無多頁面流程

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 檢核 | 結果 |
|------|------|------|
| I. SOLID & Simplicity-First | 轉換邏輯（段落切分、跳脫、換行）抽成獨立純函式模組 `text-markdown-html-converter.ts`，元件僅負責 orchestration 與呈現；不引入不必要的抽象層或 Web Worker（YAGNI，見 research.md D5） | PASS |
| II. Standalone-Component Architecture | 新元件為 standalone（不加 `standalone: true`、不建 NgModule）；於 `app.routes.ts` 以 `loadComponent` 加子路由；於 `layout.ts` 的 `toolGroups` 註冊；狀態全部用 `signal`/`computed` | PASS |
| III. Test-First Discipline | 純函式 `convertTextToMarkdownAndHtml` 附 `*.spec.ts`，涵蓋 contracts 驗收範例；元件層測試比照 `word-count.spec.ts` 模式（`await fixture.whenStable()`） | PASS |
| IV. Design-System Fidelity | 版面重用 `ToolPanel`/`ToolHeader`/`ToolBreadcrumb`/`ToolAlert`/`TerminalOutput`；樣式全用 Master CSS atomic classes，不新增自訂圓角/陰影/漸層 | PASS |
| V. Accessibility & Localization | textarea 有 `<label>`；輸出區塊更新與複製成功提示以 `aria-live="polite"` 呈現；全部按鈕為原生 `<button>`；文案 zh-Hant | PASS |

無違反項目，**Complexity Tracking 表格不需填寫**。

## Project Structure

### Documentation (this feature)

```text
specs/002-text-markdown-html/
├── plan.md                                  # This file (/speckit.plan command output)
├── research.md                              # Phase 0 output (/speckit.plan command)
├── data-model.md                            # Phase 1 output (/speckit.plan command)
├── quickstart.md                            # Phase 1 output (/speckit.plan command)
├── contracts/
│   └── text-markdown-html-converter.md      # Phase 1 output (/speckit.plan command)
├── checklists/
│   └── requirements.md                      # /speckit.specify output
└── tasks.md                                  # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

既有 Angular SPA（`daily-tools`），本功能只新增/修改下列既有結構內的檔案，不引入新專案、新頂層目錄：

```text
src/app/
├── app.routes.ts                                        # 新增子路由（loadComponent 懶載入新工具）
├── layout/
│   └── layout.ts                                        # toolGroups「文字工具」群組新增此工具項目
├── shared/ui/                                           # 重用既有共用元件，不新增
│   ├── tool-panel/ tool-header/ tool-breadcrumb/
│   ├── tool-alert/ terminal-output/ stat-row/ key-chip/
└── tools/
    └── text-markdown-html/                              # 新增：本功能的工具目錄
        ├── text-markdown-html.ts                        # Standalone 元件（signal 狀態、orchestration）
        ├── text-markdown-html.html                      # 樣板（Master CSS atomic classes）
        ├── text-markdown-html.css                       # 僅供 Master CSS 無法表達的選擇器（預期近乎空白）
        ├── text-markdown-html.spec.ts                    # 元件層測試（輸入→雙輸出、清除、複製回饋）
        ├── text-markdown-html-converter.ts               # 純函式：convertTextToMarkdownAndHtml(text)
        └── text-markdown-html-converter.spec.ts          # 純函式單元測試（依 contracts 驗收範例）
```

**Structure Decision**: 沿用 `src/app/tools/word-count/` 已驗證的「元件 + 同層純函式模組 + 各自 `*.spec.ts`」佈局，僅新增 `src/app/tools/text-markdown-html/` 一個工具目錄；路由與工具清單註冊點（`app.routes.ts`、`layout.ts`）為既有結構的最小必要修改，未新增任何頂層目錄或後端專案。

## Complexity Tracking

> Constitution Check 無違反項目，本表格不適用。
