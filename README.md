# daily-tools

網站開發常用線上工具集合，採 CRT 終端機像素風格介面，所有處理皆在瀏覽器本機完成。

## Demo

線上版本：<https://hsing24.github.io/daily-tools/>

<!-- TODO(readme): 需要補上首頁與工具頁的實際截圖，路徑請使用相對路徑如 ./docs/screenshot.png -->

## Features

- 文字工具：字數統計、文字轉 Markdown/HTML、文字差異比對。
- 圖片工具：圖片轉檔（PNG / JPEG / WebP / AVIF）、SVG 描圖、圖片轉 ASCII、圖片轉深度圖。
- 資料工具：可自訂長度與字元集的密碼產生器。
- SVG 描圖與深度圖估算在 Web Worker 中執行，不阻塞介面。
- 圖片轉深度圖首次使用時會從 Hugging Face CDN 下載模型權重，優先使用 WebGPU，失敗時回退 WASM。
- `/design` 路由提供設計系統頁，可預覽全站色彩、字體與元件規範。

## Tech Stack

Angular 22（standalone 元件 + Signals）、TypeScript 6、Master CSS 1.37 原子化樣式、Vitest 4 搭配 jsdom。

## Getting Started

### Prerequisites

- Node.js `^22.22.3 || ^24.15.0 || >=26.0.0`（取自 `@angular/cli` 22 的 `engines`）
- pnpm 11.10.0（見 `package.json` 的 `packageManager`；請勿使用 `npm install`，會產生與 `pnpm-lock.yaml` 衝突的 lockfile）

### Setup

```bash
# 取得原始碼
git clone https://github.com/Hsing24/daily-tools.git

cd daily-tools

# 安裝相依套件
pnpm install

# 啟動開發伺服器，瀏覽 http://localhost:8888
pnpm start
```

## Environment Variables

本專案不讀取任何環境變數，無須建立 `.env` 檔案。

## Scripts

| 指令               | 說明                                                                        |
| ------------------ | --------------------------------------------------------------------------- |
| `pnpm start`       | 啟動開發伺服器於 http://localhost:8888                                      |
| `pnpm run build`   | 建置正式版，輸出至 `dist/daily-tools/browser`                               |
| `pnpm run watch`   | 以 development 設定持續重建                                                 |
| `pnpm test`        | 執行 Vitest 單元測試；單次執行請用 `pnpm exec ng test --watch=false`        |
| `pnpm run lint`    | 一次執行下列兩項稽核                                                        |
| `pnpm run audit-styles` | 稽核元件樣式是否符合 Master CSS 規範                                    |
| `pnpm run audit-tools`  | 比對路由、側欄目錄、首頁樹狀圖與 TODO.md 是否同步                       |

`pnpm install` 會設定 `core.hooksPath` 指向 `.githooks/`，`git push` 前會自動執行上述稽核與單元測試；
臨時跳過測試可用 `SKIP_TESTS=1 git push`，完全跳過檢查可用 `git push --no-verify`。

## Project Structure

```text
src/app/
├── tools/     # 每個工具一個資料夾：元件、純邏輯模組與對應測試
├── shared/ui/ # 共用介面元件：面板、麵包屑、統計列、終端輸出等
├── layout/    # 外框、⌘K 指令面板，工具目錄 toolGroups 定義於此
└── home/      # 首頁工具總覽
```

設計 token 與全域 `.dt-button` 樣式集中於 `src/styles.css`；視覺規範以 [DESIGN.md](DESIGN.md) 為準，開發慣例見 [AGENTS.md](AGENTS.md)。

## Deployment

推送到 `main` 會觸發 `.github/workflows/deploy-pages.yml`，以 `--base-href "/daily-tools/"` 建置後部署至 GitHub Pages，並將 `index.html` 複製為 `404.html` 作為 SPA fallback。

## Roadmap

待辦項目維護於 [TODO.md](TODO.md)，目前尚未完成的工具：

- 萬用字元與表情符號集（Emoji & Symbols）
- JSON formatter
- JWT decoder
- SVG Optimizer
- favicon generator

## License

MIT，詳見 [LICENSE](LICENSE)。
