# daily-tools (每日開發小工具)

以 Angular 22 建立的網站開發線上工具集合介面。本專案採用像素藝術與 CRT 終端機風格設計，為開發者提供實用的日常小工具。

## 🛠️ 現有工具列表

*   **字數統計 (Word Count)**：統計文字字數、字元數、行數等資訊。
*   **文字轉 Markdown/HTML**：快速在純文字、Markdown 與 HTML 格式之間進行轉換與實時預覽。
*   **圖片轉檔 (Image Converter)**：支援多種圖片格式（PNG, JPEG, WebP, AVIF）的批次轉換，並可自訂輸出品質與尺寸調整。
*   **SVG 描圖 (SVG Draw)**：使用 Web Worker 在背景執行點陣圖向量化描摹 (Tracing)，提供多種描摹預設與 SVG 下載。
*   **設計系統 (Design System)**：預覽本專案採用的 UI 元件與 CRT 終端風格設計規範。

## ✨ 專案特點

*   **復古 CRT 終端視覺**：全站採用像素藝術與 CRT 終端機風格 (CRT terminal aesthetic) 設計，帶來沉浸式復古開發體驗。
*   **Master CSS 原子化樣式**：基於 Master CSS 原子化樣式開發，全站無 ad-hoc 樣式，並有自動化腳本稽核 CSS 規範。
*   **現代 Angular 22 技術棧**：使用 Standalone 元件架構，配合 Signals 進行細粒度響應式狀態管理。
*   **快速測試驗證**：整合 Vitest 與 jsdom，提供毫秒級的單元測試執行速度。

## ⚙️ 本地開發

專案使用 **pnpm** 作為套件管理工具（請避免使用 `npm install` 產生 `package-lock.json`）。

### 1. 安裝依賴
```bash
pnpm install
```

### 2. 啟動開發伺服器
```bash
pnpm start
```
啟動後可在瀏覽器開啟 `http://localhost:4200/`。

### 3. 執行單元測試
```bash
pnpm test
# 或單次執行
pnpm exec ng test --watch=false
```

### 4. 樣式稽核與代碼檢查
```bash
pnpm run lint
```

### 5. 專案打包 (Build)
```bash
pnpm run build
```
打包後的產物會輸出於 `dist/daily-tools/browser` 目錄下。
