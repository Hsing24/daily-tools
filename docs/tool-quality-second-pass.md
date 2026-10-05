# 工具產出品質第二輪審查

日期：2026-10-05。基線為首輪完成的 `8954848`；範圍仍是全部 8 個工具。這輪以小型反例檢查輸出語意、圖片像素與幾何，再以 regression test 或實際 browser 產物驗證修正。維持 browser 本機處理、免費開源與品質／效能平衡；未增加 dependency，也沒有下載大型模型權重。

第二輪由 GPT-6-Astra（xhigh）及同設定的圖片／深度 subagents 實作；root 獨立 review、驗收並 commit。

## 全工具結果

| 工具                                | 第二輪結論   | 可重現的品質證據與修正                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 套件決策                                                                                                                              |
| ----------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 字數統計 `word-count`               | 已修正       | `1️⃣2️⃣3️⃣` 原先只算 1 字，現在依 grapheme 算 3 字；`go1️⃣now2️⃣` 分成 2 個詞與 2 個 emoji，共 4 字。`123` 仍為 1 詞，CJK、ZWJ emoji、組合字與換行測試保留。                                                                                                                                                                                                                                                                                                                         | 保留原生 Intl.Segmenter；缺口是把 word-like segment 直接視為一詞，換 Unicode 套件無法自動修正這項混合計數規則。                       |
| Markdown／HTML `text-markdown-html` | 已修正       | `<b>/<i>` 不再失去樣式；task list 的完成狀態以靜態 `[x]`／`[ ]` 雙向保留（含巢狀及多段落），維持 input 禁用；只保留 code 上的 `language-*` 安全 class，含 `js`、`c++`、`c#`、`f#`；`<pre>`、內嵌 fence、空白程式碼與末端空白行保留；inline code 的多空白、邊界空白、純空白與 backtick 精確往返，含換行時用安全 HTML 與 character references 保留。cell 含 list／pre、caption、欄數不齊、row header 或合併 cell 的 table 改保留 sanitized HTML，避免 GFM literal 化或截斷 cell。 | 保留 marked／DOMPurify／Turndown／GFM tables。使用既有 renderer 與 rule 擴充；目前沒有證據支持為這些缺口更換整套 AST framework。      |
| 圖片轉檔 `image-converter`          | 驗證後無修改 | Chrome 的透明／半透明／原色色塊 fixture：PNG 逐通道一致；WebP alpha 一致、該 fixture 的 RGB 誤差 ±1；JPEG 透明處合成白色、半透明紅色為約 `[255,127,126,255]`。AVIF 的實際 PNG fallback 仍正確拒絕。                                                                                                                                                                                                                                                                             | 保留 Canvas／fflate。jSquash 的等品質體積、冷啟動與記憶體優勢仍待正式 A/B，這次不以單一色塊推論照片 codec 品質。                      |
| SVG 描圖 `svg-draw`                 | 已修正       | 64×64 透明圖中，未落在取樣格點的 4×4 半透明紅色塊原先在全部 3 個 preset 消失。低色數圖片改用完整 RGBA palette，三個 preset 均恢復紅色 path；實際 Worker SVG 重新 rasterize 後中心 alpha 為 128。超出 preset palette 上限立即回到原量化流程。                                                                                                                                                                                                                                    | 保留 ImageTracer，修正取色輸入即可恢復細節；沒有以未量測的 Vectorizer 代換。                                                          |
| 文字差異 `diff-checker`             | 已修正       | 左側兩行 `count`／`active` 同時修改、右側最前面新增 comment 時，原先將 count 對到 comment、active 對到 count。現在用有上限的詞相似度 anchors，新增 comment 獨立顯示，數值與布林修改對齊正確行。500 組 seeded 隨機案例仍保留雙邊原文及行號順序。                                                                                                                                                                                                                                 | 保留 jsdiff；行內 diff 不更換 engine。新對齊最多 4,096 候選 pair、20,000 字元，沿用同一 150 ms deadline；較大的 hunk 保留原配對方式。 |
| 圖片轉 ASCII `image-to-ascii`       | 已修正       | 原採樣 ratio 0.55、render ratio 0.6，使正方形示例呈現 576×528；現在取樣／preview／export 共用字格比例，為 576×576。獨立 flicker 可連續播放。CJK／emoji 原先繪製寬 11／15 px 超出 7.2 px 字格，現在 `fillText(maxWidth)` 約束為 7 px。                                                                                                                                                                                                                                           | 保留現有核心；幾何與 renderer 一致性不需要 pica 或另一個 Worker framework。glyph 密度校準、預設亮暗映射另見限制。                     |
| AI 深度 `depth-estimator`           | 已修正       | GLB 的 quad diagonal 與 OBJ／preview 不同，2×2 非平面 fixture 中心高度原為 0 而另一格式為 0.5；現在使用相同切分。各路徑共用雙線性取樣，平面斜坡不再因最近鄰取樣變階梯，preview 的 XY／UV 均勻。GLB texture 等待期間調 slider，原先將舊 brightness 與新 scale 混用；現在固定點擊當下設定。另補 clipboard 完成及 PNG／GLB 失敗路徑的作業有效性檢查，清空或銷毀後不再回寫舊狀態。                                                                                                                                                                                       | 保留 Transformers.js／Small。修正的是幾何與設定一致性，沒有宣稱 AI 推論精度提升；不同網格解析度仍可能產生不同細節。                   |
| 密碼產生器 `password-generator`     | 驗證後無修改 | 再查完整候選 rejection、modulo rejection、首字規則、unique 與 entropy 計算；現有測試涵蓋最短四類密碼、排列數、亂數邊界。UI 使用生成規則的精確 entropy。首輪已用 280 組有效設定獨立枚舉交叉驗證，本輪未找到新的輸出缺口。                                                                                                                                                                                                                                                        | 保留 Web Crypto；人類自選密碼的字典評分套件不會改善這個隨機生成空間。                                                                 |

## 可衡量的取捨

- SVG 的 256×256 雙色 alpha fixture，Node 26、3 次 warmup、9 次前後交錯取 median：142.0 → 8.17 ms，兩者均為 570 bytes。這只代表低色數 fixture；照片走原 palette 量化，不外推相同比例。
- Diff 的 Node 26 核心測試，5 次 warmup、15 次交錯取 median：1,000 行／100 處孤立修改 6.376 → 6.597 ms；20 行連續修改加 1 行 comment，0.520 → 0.847 ms。小幅增加的計算換取正確的插入行及相關修改對齊。
- ASCII 實際下載的 TypeScript 通過 TypeScript 6 strict compile（整合階段亦獨立複驗）；含 CJK／emoji、原色的 fixture，preview 與 exported renderer 的 RGBA 不同通道數為 0。寬字形會壓縮至字格寬度，以避免重疊；這不代表所有 font 的視覺密度已校準。
- Depth 平面斜坡 fixture 的中間節點應為 0.2，原最近鄰結果為 0.4；三種網格大小的 OBJ／GLB 現在皆符合插值。GLB 設定 race fixture 的預期 Z=0.21，原結果約 0.60，現在固定為 0.21。

## 驗證與限制

root 最終整合驗證：Node 26.10.0，`pnpm exec ng test --watch=false`，24 files／303 tests 通過（首輪為 269 tests）。圖片子範圍為 6 files／85 tests，最終 depth 為 3 files／62 tests，Markdown converter 為 30 tests；`pnpm run build`、`pnpm run lint` 與 `git diff --check` 亦已通過。production browser 的 8 個工具 route 全部正常載入。initial bundle 維持 305.03 kB，estimated transfer 84.15 kB；文字轉換 lazy chunk 為 99.17 kB，estimated transfer 29.41 kB。

獨立 browser 驗收已確認 8 個 inline-code roundtrip fixture 的 `code.textContent` 完全相等（含換行／Markdown literal，沒有多出子元素），且混合不安全 HTML／URL fixture 不含危險節點或屬性；實際下載 sample GLB 經 Khronos glTF Validator 得 0 errors、0 warnings、1 info（384×384 NPOT texture）。root 亦確認實際 SVG 保留原先遺失的半透明紅色區塊，重新 strict compile 下載的 ASCII TypeScript，並執行 `node scripts/benchmark-tool-cores.mjs --baseline 8954848`，固定 ratio 下的 ASCII 字元／顏色與基線一致，新的比例 metadata 另外驗證。已完成的修正提交為第二輪 commit；ASCII 亮暗預設仍待使用者選擇。

目前未宣稱解決的品質題目：

- ASCII 預設仍採原本由暗至亮的字元序列；正片／負片選擇需依使用者確認調整。font 的實際 glyph coverage、原色黑字與背景對比，需要另立視覺 fixture，不能從字元序列推算最佳密度。
- ImageTracer 原本的 `stroke-width=1` 會讓邊界延伸半個像素；直接移除可能造成曲線間 antialias 接縫，本輪未作未驗證變更。
- Task list 的 HTML 產物是靜態狀態文字，不提供互動 checkbox；一般表格只用 GFM 能表達的子集，其餘以 sanitized HTML 保留。
- Depth 的 bilinear interpolation 修正取樣誤差，無法恢復模型沒有推論出的細節，也不是 metric depth。未進行不同模型的真實 inference 精度比較。
- Diff 相似度是有限預算內的顯示啟發式，不宣稱語意理解或對大型 hunk 的最佳配對。

Markdown 的 code 內容與 info string 語意依 [CommonMark fenced code blocks](https://spec.commonmark.org/0.31.2/#fenced-code-blocks) 檢查，renderer 擴充依 [Marked 官方文件](https://marked.js.org/using_pro#renderer)。既有第三方方案的授權、browser 條件、候選比較及採用前需量測項目，延續[首輪套件審查](tool-quality-review.md#第三方方案比較)；本輪新增的證據支持小範圍修正，尚不支持加入重量級替代套件。
