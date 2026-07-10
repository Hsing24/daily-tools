# Quickstart: 文字轉 Markdown/HTML 工具

## 開發環境

```bash
# Node 版本需求（若 ng test/build 出現 engine 版本錯誤）
source ~/.nvm/nvm.sh && nvm use 26

pnpm install
pnpm start   # ng serve，於 http://localhost:4200/ 開啟後導覽至新工具路由
```

## 驗證核心轉換邏輯（純函式，先於 UI 完成）

```bash
pnpm exec ng test --watch=false
```

聚焦驗證 `src/app/tools/text-markdown-html/text-markdown-html-converter.spec.ts` 是否涵蓋
[contracts/text-markdown-html-converter.md](./contracts/text-markdown-html-converter.md) 的全部驗收範例。

## 手動驗證步驟（對應 spec.md 三個使用者故事）

1. 開啟工具頁，於輸入區貼上一段含多個段落與換行的純文字。
2. 確認下方同時出現 Markdown 與 HTML 兩個輸出區塊，且：
   - 段落以空白行（Markdown）／`<p>`（HTML）呈現。
   - 段落內換行以內嵌 `<br>` 呈現（兩種格式皆同）。
3. 貼入包含 `*`、`#`、`<`、`&`、`"` 等特殊字元的文字，確認：
   - Markdown 輸出對應字元前綴 `\` 跳脫。
   - HTML 輸出對應字元轉為實體（`&lt;`、`&amp;`…）。
4. 分別按下 Markdown／HTML 輸出區塊的「複製」按鈕，確認出現「已複製」提示；於不支援剪貼簿寫入的環境（或以瀏覽器權限封鎖模擬）確認出現替代提示。
5. 按下「清除」按鈕，確認輸入區與兩個輸出區塊同步清空。
6. 貼上超過 50,000 字元的長文字，確認輸出區短暫顯示「處理中」狀態後才一次顯示完整結果，期間介面不凍結。

## 建置驗證

```bash
pnpm run build
```

需確認新工具路由與其懶載入 chunk 正常產出，且不影響既有 `--base-href "/daily-tools/"` 設定。
