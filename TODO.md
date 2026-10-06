# TODO List

> 已上線的項目請補上路由 slug（例如 `(word-count)`）並打勾。`pnpm run audit-tools` 會依此比對
> `app.routes.ts`、`layout.ts`、`home.html` 與 `home.spec.ts`，不同步就會擋下 push。

## 文字與文件
- [x] 字數統計 (word-count)：貼上文字後，統計字數。
- [x] Text to Markdown/HTML (text-markdown-html)：將文字轉換為 Markdown 或 HTML 格式。
- [x] Diff checker (diff-checker)：比較兩段文字的差異。
- [x] 萬用字元與表情符號集 (emoji-n-symbols)：常用表情符號與特殊字元表。

## 資料與解析
- [ ] JSON formatter：將 JSON 格式化為易讀格式。
- [ ] JWT decoder：解碼 JWT 令牌。
- [x] 密碼產生器 (password-generator)：可以自訂強度。

## 圖片與視覺
- [x] image converter (image-converter)：將圖片轉換為不同格式。
- [x] SVG draw (svg-draw)：將上傳的點陣圖繪製呈 SVG 圖形。
- [x] image-to-ascii (image-to-ascii)：將圖片轉換為 ASCII 藝術圖形與動態播放器。
- [x] 圖片轉深度圖 (depth-estimator)：純前端 AI 將 2D 圖片轉換為 3D 深度圖與視差效果。
- [ ] SVG Optimizer：SVG 最佳化。
- [ ] favicon generator：生成網站圖標。
