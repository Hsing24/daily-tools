# daily-tools (每日開發小工具)

以 Angular 22 建立的網站開發線上工具集合介面。本專案採用像素藝術與 CRT 終端機風格設計，為開發者提供實用的日常小工具。

## 🛠️ 現有工具列表

*   **字數統計 (Word Count)**：統計文字字數、字元數、行數等資訊。
*   **文字轉 Markdown/HTML**：快速在純文字、Markdown 與 HTML 格式之間進行轉換與預覽。
*   **Design System**：預覽專案所使用的 UI 組件與 CRT 終端風格設計規範。

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
```

### 4. 專案打包 (Build)
```bash
pnpm run build
```
打包後的產物會輸出於 `dist/daily-tools/browser` 目錄下。

---

## 🚀 GitHub Pages 部署排錯指引

### 🚨 為什麼我的網址點進去顯示的是 README.md，而不是網站畫面？

這是因為 GitHub 儲存庫的 Pages 設定中，預設的部署來源是從分支（Branch）讀取根目錄。由於專案根目錄沒有 `index.html`（專案是經由 Angular 打包後才產生），GitHub Pages 在找不到 `index.html` 的情況下，會預設將根目錄的 `README.md` 渲染成網頁呈現。

### 🛠️ 排錯與解決步驟

請依照以下步驟將 GitHub Pages 的部署來源切換為專案中已設定好的 **GitHub Actions**：

1. 開啟您的 GitHub 專案頁面（例如：`https://github.com/hsing24/daily-tools`）。
2. 點選上方的 **Settings**（設定）頁籤。
3. 在左側選單中找到 **Code and automation** 區塊，點選 **Pages**。
4. 找到 **Build and deployment**（建置與部署）區塊底下的 **Source**（來源）下拉選單。
5. 將預設的 **Deploy from a branch** 切換改為 **GitHub Actions**。
6. 設定完成後，GitHub Actions 工作流（`.github/workflows/deploy-pages.yml`）在下次觸發（或手動執行）時，就會正確將編譯打包後的 `index.html` 與靜態資源部署至 GitHub Pages。

