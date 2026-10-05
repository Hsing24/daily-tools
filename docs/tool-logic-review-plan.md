# 工具程式碼邏輯審查與改善方案

審查日期：2026-08-13

後續現行實作與量測請見 [工具產出品質與效能審查](./tool-quality-review.md)。本文保留原始問題與改善方案；多項已實作，不能作為目前仍有缺陷的清單。

## 範圍與結論

本次已審查 `src/app/app.routes.ts` 登錄的 8 個工具，涵蓋元件、純邏輯模組、Worker、輸出產生流程與現有測試。此次不評估視覺設計、版面配置或一般 UX；只有當輸出內容、檔案格式或狀態文字與實際結果不一致時，才列入語意修正。

現況基準：Node 26.4.0 下執行 `pnpm exec ng test --watch=false`，23 個 test files、183 個 tests 全部通過。現有測試多集中於 happy path，未涵蓋數個輸出格式、非同步競態、Unicode 與資源釋放問題。

整體建議先處理 9 項高優先問題：

1. Markdown 轉 HTML 的手寫 parser 可產生不安全或無效的 `href`。
2. 密碼亂數使用 `%` 取餘數，存在 modulo bias；首字規則也可能加入使用者未選取的字元類型。
3. 圖片轉檔未確認實際 Blob MIME，可能把瀏覽器 fallback 產生的 PNG 標示並下載為 WebP/AVIF。
4. 圖片轉檔非同步工作可被設定變更或刪除打斷，舊結果可能套到新狀態。
5. Diff 會在比較前刪除空白行，改變原文；比較期間輸入變更也可能顯示過期結果。
6. ASCII 自訂字元集只有 1 個字元時會除以零，輸出可能混入 `undefined`。
7. Depth Estimator 沒有 request ID；舊推論結果可能覆蓋新圖片、清除後狀態或新模型設定。
8. Depth Estimator 的 3D preview 可能建立超過 65,535 個頂點，卻仍使用 `Uint16Array` index，造成索引截斷與錯誤幾何。
9. Depth Estimator 接受任意 `image/*`，GLB 匯出卻可能把非 PNG/JPEG/WebP 原始 bytes 宣告成 PNG，產生無效貼圖。

## 共通改善原則

- 將輸入解析、轉換、驗證與輸出編碼留在純函式；Angular 元件只負責 state 與 browser I/O。
- 非同步工作加入 generation/request ID。只有最新工作可提交結果；清除、換檔、換模型時舊工作失效。
- 所有 timeout、interval、animation frame、Worker、Object URL 使用 `DestroyRef`、effect cleanup 或明確 teardown 統一釋放。
- `signal<string>` 搭配 `as` 的狀態改成具名 union type；移除 `any`、未使用的 `CommonModule`/`FormsModule` 與不必要的 computed wrapper。
- 輸出檔案不只驗證「有 Blob」；必須驗證 MIME、header、dimensions、檔名、編碼與輸入設定一致。
- 每項修正先補失敗測試，再改實作。保留現有 UI 結構與操作流程；只允許必要的語意 copy 修正。

## 套件決策摘要

套件版本於 2026-08-13 查核；實際動工時仍以 `pnpm` 最新 lockfile resolution、license 與 production bundle 結果為準。

| 工具 | 決策 | 套件 |
| --- | --- | --- |
| 字數統計 | 不安裝 | 優先使用原生 `Intl.Segmenter`；舊瀏覽器需求確立後才考慮 `unicode-segmenter` |
| 文字轉 Markdown/HTML | 建議安裝 | `marked`、`dompurify`、`turndown`；另加 dev-only `@types/turndown` |
| 圖片轉檔 | 建議安裝 | `fflate`，取代自製 ZIP/CRC；圖片 codec 暫用原生 Canvas |
| SVG 描圖 | 暫不新增 | 保留現有 `imagetracerjs`；以 benchmark 評估 `@neplex/vectorizer`，SVGO 只作後續可選優化 |
| 文字差異比對 | 建議安裝 | `diff`（jsdiff）取代自製 LCS/word diff |
| 圖片轉 ASCII | 不安裝 | 核心演算法與 renderer 保留自製；使用原生 `Intl.Segmenter` |
| AI 圖片深度估算 | 建議安裝 | runtime `@gltf-transform/core`（須先過 bundle gate）、dev-only `gltf-validator`；共用 `fflate` 做 PNG zlib |
| 密碼產生器 | 不安裝 | 使用原生 Web Crypto；目前不需要 `@zxcvbn-ts/core` |

第一批新增 dependency 建議為 `marked`、`dompurify`、`turndown`、`diff`、`fflate`。`@gltf-transform/core` 先做獨立 production bundle spike；`gltf-validator` 與 `@types/turndown` 只放 `devDependencies`。套件皆應只由對應 lazy route 或測試載入，避免增加 initial bundle。

查核到的版本：`marked@18.0.9`、`dompurify@3.4.13`、`turndown@7.2.4`、`diff@9.0.0`、`fflate@0.8.3`、`@gltf-transform/core@4.4.2`、`gltf-validator@2.0.0-dev.3.10`、`@types/turndown@5.0.6`。批准動工後先執行：

```bash
pnpm add marked dompurify turndown diff fflate
pnpm add -D @types/turndown gltf-validator
```

`@gltf-transform/core` 不併入第一批，先在暫時 branch/worktree 量測：

```bash
pnpm add @gltf-transform/core
pnpm run build
```

## 逐工具改善方案

### 1. 字數統計 (`word-count`)

#### 發現

- `word-count-stats.ts:23-45` 以 Unicode code point 計數，不是使用者感知的 grapheme。家庭 emoji、膚色、旗幟、variation selector 等會被拆成多個字元。
- emoji 先被替換後，ZWJ 或 variation selector 可能殘留並被算成一般「字」，造成同一個 emoji 被重複計數。
- `temp.split(...)` 會把只有標點的片段算成字；目前測試甚至把全形驚嘆號算成一個字。這不符合一般「字數」語意，也使「精準」描述過度承諾。
- 每次輸入都建立 code point array、兩次全字串 match、兩次 replace 與 split；長文會產生多份中間資料。

#### 套件評估

- **決策：不安裝。** Angular 22 的現代 browser target 可直接使用原生 [`Intl.Segmenter`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter)，同時處理 grapheme 與 word segmentation，沒有 bundle 成本。
- [`unicode-segmenter`](https://github.com/cometkim/unicode-segmenter) 是較好的 fallback 候選：ESM-first、zero dependencies、支援最新 Unicode grapheme rules。但它的 `Intl` adapter/polyfill 目前只涵蓋 grapheme，word segmentation 仍需原生 API 或自訂規則。
- 只有在專案正式 browser matrix 包含缺少 `Intl.Segmenter` 的環境時才安裝 `unicode-segmenter`；目前不為假設中的相容性增加 dependency。

#### 建議實作

- 先定義穩定規則：字元數採 grapheme cluster；CJK 每個 grapheme 算 1 字；其他語系使用 word-like segment；emoji cluster 算 1 字；單純標點不算字。
- 優先使用 `Intl.Segmenter`；若需要支援缺少 API 的環境，加入明確 fallback，而不是混用 code point 與 regex。
- 將統計整理為單次或少量 traversal，避免大型中間字串。

#### 驗收測試

- 加入 `👨‍👩‍👧‍👦`、`👍🏽`、`🇹🇼`、combining mark、variation selector、純標點、CJK 標點與 CRLF。
- 加入大型輸入測試，但避免依賴容易波動的極短 wall-clock 門檻。

### 2. 文字轉 Markdown/HTML (`text-markdown-html`)

#### 發現

- `text-markdown-html-converter.ts:80-132` 是 regex-based Markdown parser。巢狀 emphasis、escaped delimiter、code span、括號 URL、ordered list、code block 等常見語法會產生錯誤結果。
- `text-markdown-html-converter.ts:112` 把捕獲的 URL 直接放入雙引號屬性，未 escape quote，也未限制危險 scheme。複製後使用該 HTML 可能造成 attribute injection 或 `javascript:` link。
- HTML 轉 Markdown 把 `OL` 當 `UL`，所有 `LI` 都輸出 `-`；`PRE`、blockquote、nested list 與 code 中的 backtick 未正確處理。
- 富文字中的危險 link scheme 會原樣進入 Markdown。
- `text-markdown-html.ts:71-78` 只用 `setTimeout(0)` 延後大型轉換，工作仍在 main thread；元件銷毀時 timeout 未取消。
- 大型轉換等待期間保留上一份結果，copy 按鈕可複製與目前輸入不一致的舊輸出。
- clipboard `read()` 若存在但拒絕，流程直接進入 catch，沒有再嘗試可用的 `readText()`。

#### 套件評估

- **決策：建議安裝 `marked`、`dompurify`、`turndown`，另加 dev-only `@types/turndown`。**
- [`marked`](https://marked.js.org/) 負責 Markdown 轉 HTML，ESM、內建 TypeScript types。官方明確警告它不做 sanitization，因此不能單獨使用。
- [`DOMPurify`](https://github.com/cure53/DOMPurify) 負責清理 Marked 輸出，使用 browser DOM parser 與 allow-list，取代不可靠的 regex escape。限制為 HTML profile，並另設 link scheme policy。
- [`Turndown`](https://github.com/mixmark-io/turndown) 負責 HTML/DOM 轉 Markdown，已涵蓋 heading、list、code、link 與自訂 rule。package 有 browser ESM build，但沒有內建 types，故需要 `@types/turndown` 或專案內最小 declaration。
- 暫不裝 `turndown-plugin-gfm`。目前需求沒有 table、task list、strikethrough；需要時再加。
- 不採 unified/remark/rehype 全套方案。AST pipeline 更一致，但本工具需求會引入較多 packages 與 integration surface；三套件方案較小且責任清楚。

#### 建議實作

- 停用自製 Markdown parser。採維護中的 Markdown parser 與 HTML-to-Markdown converter；HTML 輸出再經 sanitizer 或嚴格 URL policy。新增 dependency 前先確認 bundle 影響。
- 明確定義支援語法與 raw HTML policy。預設不允許可執行 HTML；只允許 `http:`, `https:`, `mailto:` 等核准 scheme。
- conversion state 保存輸入 revision。處理中新輸入先讓舊結果失效，copy 永遠讀取同 revision 結果。
- 若實測長文會阻塞，再移入 Worker；20,000 字元本身不應作為沒有量測依據的固定分界。
- timeout 與 copy-status timer 加入 destroy cleanup。

#### 驗收測試

- 加入 quote injection、`javascript:`、HTML entity、escaped Markdown、巢狀 list、ordered list、code block、含括號 URL、空 link。
- 測試快速連續輸入與元件銷毀，不得複製或提交 stale result。
- 若引入第三方 parser，使用固定 fixture 驗證輸出 contract，不測第三方函式內部細節。

### 3. 圖片轉檔 (`image-converter`)

#### 發現

- `checkFormatSupport()` 只檢查 Blob 非 null。瀏覽器不支援指定 MIME 時，Canvas 可 fallback 成 PNG，因此 AVIF/WebP 可能被誤判為支援。
- `convertImage()` 同樣未驗證 `blob.type === requestedMime`。UI label、extension 與實際 bytes 可能不一致，屬輸出語意錯誤。
- `loadImage()` 成功時沒有 revoke 內部 Object URL；每次加入與每次轉換都會洩漏一個 URL，且加入時另建第二個 preview URL。
- 轉換期間 format、quality、remove、clear 仍可變更。完成 callback 使用舊設定產生 Blob，卻可能寫入已更新的 item，造成結果被錯誤標示；item 已移除時新 result URL 也會洩漏。
- 預設輸出永遠是 WebP，未依 runtime support 選擇可用格式。
- `estimatedRatio()` 只看 quality，完全不看來源內容、來源格式或尺寸；「預估節省空間」可能與實際結果相反。
- 接受所有 `image/*`，但 UI 只承諾 PNG/JPEG/WebP/AVIF。SVG、GIF 等輸入的 animation、外部資源與 alpha 行為沒有定義。
- ZIP 未設定 UTF-8 filename flag，中文檔名可能在部分解壓工具亂碼；同名輸入會形成重複 entry 名稱；`any[]` 掩蓋 BlobPart 型別。
- 沒有 pixel/dimension 上限；超大圖片可能超過 Canvas 限制或造成記憶體壓力。

#### 套件評估

- **決策：建議安裝 [`fflate`](https://github.com/101arrowz/fflate)。** 它提供 ESM、內建 TypeScript types、zero dependencies、ZIP/DEFLATE 與 streaming API。官方資料顯示完整 library 約 8 kB，ZIP 功能增量約 3 kB。
- 用 `fflate` 取代目前自製 CRC32、local header、central directory 與 EOCD，可直接處理 UTF-8 filename、壓縮、非同步與 archive compatibility，刪除高風險 binary protocol code。
- 暫不裝 `browser-image-compression`、`@jsquash/*` 或其他 codec。現階段原生 Canvas 已能滿足支援瀏覽器；先把 MIME fallback 驗證做正確。只有產品要求「所有瀏覽器都必須輸出 AVIF/WebP」時，才值得承擔 WASM codec 與 lazy chunk 成本。
- `pica` 擅長高品質 resize，但目前沒有 resize 功能需求，不安裝。

#### 建議實作

- capability test 與正式轉換都驗證 Blob MIME；不一致時視為不支援，不允許用錯誤副檔名下載。
- `loadImage()` 只使用一個受控 URL，成功與失敗皆 revoke。每個轉換建立 immutable job snapshot，完成時比對 item revision；過期結果立即 revoke 並丟棄。
- 預設格式從已支援清單選擇；unsupported format 在 core validation 層也拒絕，不能只依賴 disabled UI。
- 移除無根據的壓縮估算，或改用該圖片實際試編碼結果；此處只需修正數值語意，不改版面。
- 明確限制輸入 MIME 與最大 pixel count；錯誤訊息說明原因。
- ZIP 設定 general-purpose UTF-8 bit、處理重複檔名，並加入 archive structure 驗證。

#### 驗收測試

- 模擬 `toBlob('image/avif')` 回傳 `image/png`，AVIF 必須判定為不支援且不得下載 `.avif`。
- 測試 format/quality 在轉換途中改變、移除 item、clear all、元件銷毀。
- 實際解析 ZIP central directory，驗證 UTF-8 中文名、CRC、重複檔名與每個 entry bytes。
- 以透明 PNG 轉 JPEG，驗證輸出 alpha 語意與白底；其餘支援格式驗證 dimensions 及 MIME。

### 4. SVG 描圖 (`svg-draw`)

#### 發現

- timer 在 `startTrace()` 開始後，`getImageData()` 完成時呼叫 `cleanupWorker()`，連同 timer 一起停止；實際 Worker 描圖期間不會持續更新 elapsed time。
- 使用者在 `getImageData()` 階段按取消，只會清 timer；Promise 完成後仍會建立 Worker 並繼續描圖。取消語意不成立。
- 重新描圖完成時建立新 SVG preview URL，沒有先 revoke 舊 URL。
- `showAlert()` 的 timer 沒有 teardown，也可能由較舊 timer 清掉較新的訊息。
- 預估時間只依 pixel count 與固定速率，不含裝置速度、影像複雜度或 Worker warm-up，卻顯示精確秒數。
- 「一比一／Pixel Perfect」preset 仍量化成 64 色並進行向量近似，不可能保證 pixel-level identical。實際 SVG 本身可用，但 UI 語意過度承諾。
- full-resolution `getImageData()` 與 transferable copy 沒有 pixel 上限，超大圖可能造成 UI freeze 或記憶體耗盡。
- Worker 與 ImageTracer 交界使用 `any`，削弱 options/output contract。

#### 套件評估

- **決策：目前不新增；保留既有 `imagetracerjs`。** 先修取消、timer、memory budget 與輸出驗證，避免同時更換演算法造成 review 範圍失控。
- [`@neplex/vectorizer`](https://github.com/neplextech/vectorizer) 基於 VTracer，可處理彩色圖片、輸出較精簡 spline，核心演算法宣稱 `O(n)`。但目前 npm 為 0.1.x，官方也指出 browser WASI 下 async API 可能不可用，需在 Worker 呼叫同步 API。列為 replacement spike，不直接安裝。
- spike 應固定 10 至 20 張 fixture，比較 visual similarity、SVG bytes、path count、耗時、memory、透明背景與取消能力。只有結果明顯優於 ImageTracer 才替換。
- [`SVGO`](https://github.com/svg/svgo) 有正式 browser entry，可縮小 SVG；但它不改善描圖品質，且 aggressive plugin 可能改變 path/ID/色彩。先不安裝。若輸出大小仍是問題，再以 strict visual regression 與保守 plugin config 評估。

#### 建議實作

- 將 image decode 與 trace 納入同一個 cancellable job；每次 start 產生 generation ID，任何階段取消後都不得建立或提交 Worker 結果。
- 分開 `stopWorker()` 與 `stopTimer()`，timer 覆蓋完整 decode + trace；結果同時保存 total elapsed 與 trace elapsed，UI 顯示哪一個需固定語意。
- 新 preview 替換舊 preview 前 revoke；alert timer 使用單一可取消 handle。
- 加入 pixel budget 與可預期錯誤；若要縮圖，輸出與描述需明示不是原尺寸描圖。
- 預估改成範圍或 runtime calibration。將「一比一」改成「最高細節」等不保證等值的語意 copy；不更動控制項或版面。
- 補齊 ImageTracer declaration，移除 options `as any`。

#### 驗收測試

- 測試 decode 期間取消、Worker 期間取消、連續重新描圖、元件銷毀。
- 解析輸出 SVG，驗證 root、viewBox/尺寸、path/color 數量基本 contract，並確認下載 bytes 等於 preview bytes。
- 以透明圖、單色圖、超大圖與無效 image MIME 驗證錯誤路徑。

### 5. 文字差異比對 (`diff-checker`)

#### 發現

- `getFormattedText()` 對每行 `trim()` 並刪除所有空白行。Diff 工具因此不是比較原文；空行、縮排與 trailing spaces 等真實差異永久消失，且輸入框被回寫成修改後內容。
- 註解宣稱「不移除空行」，實作與 component test 卻明確移除，contract 自相矛盾。
- 比較有固定 1.2 秒延遲。期間 textarea 未 disabled；新輸入會隱藏結果，但舊 callback 最後仍把 `hasResult` 設回 true，顯示與目前文字不一致的結果。
- compare timer 與 highlight timer 在元件銷毀時未清除。
- LCS 使用 `O(mn)` 記憶體與時間，直接在 main thread 執行；大型文件可凍結頁面或耗盡記憶體。
- `tokenizeLine()` 沒有 Unicode `u` flag，emoji surrogate pair 會被拆開；行內 highlight 可能輸出 replacement character。
- 多行 removed/added block 只合併一組相鄰 pair，modified line 配對品質不穩定。
- `getLineNumbers()` 每次 change detection 都重新 split 與配置 array；狀態可改為 computed。

#### 套件評估

- **決策：建議安裝 [`diff`](https://github.com/kpdecker/jsdiff)（jsdiff）。** package 名稱是 `diff`，不是舊且不同用途的 `jsdiff` package。
- jsdiff 使用 Myers `O(ND)` 方法，提供 `diffLines`、word/character diff、ESM 與內建 TypeScript types，可取代自製 `O(mn)` DP matrix 與多數 pairing code。
- 套件不會自動解決 Unicode grapheme、stale result、Worker cancellation 或超大輸入。line diff 可交給 jsdiff；行內 token 仍先用 `Intl.Segmenter`，整體工作仍需 request ID、timeout/size budget。
- 導入前用目前 fixtures 建立 adapter contract，使 template 不直接依賴第三方 change object，未來升級可隔離。

#### 建議實作

- 純比較預設保留原始 bytes/字元語意，包括空白行與縮排。若既有產品需求一定要 normalize，只建立 compare copy，不回寫輸入，並把 normalization contract 寫成純函式與測試。
- 移除人工延遲，或至少將 timer 納入 cancellable generation。任一輸入變更後，舊 compare 不得提交。
- 為行數與總字元數設合理門檻；大型 diff 移入 Worker，並改採較節省記憶體的 Myers/patience diff 或成熟 library。
- 行內 token 使用 Unicode-aware segmenter；保證 grapheme 不被拆開。
- 變更 block 以 similarity 配對 removed/added lines，再做 word diff；未配對者維持純 added/removed。
- 移除未使用 imports，將 line number list 改為 computed。

#### 驗收測試

- 空白行、縮排、trailing spaces、CRLF/LF、emoji、combining marks、兩行對兩行修改。
- 比較途中再輸入、重複點擊、元件銷毀，舊結果不得出現。
- 建立大型 fixture，驗證受控的上限或 Worker 路徑，不使用脆弱的單次時間斷言。

### 6. 圖片轉 ASCII (`image-to-ascii`)

#### 發現

- dither 開啟且字元集長度為 1 時，`charSetLen - 1` 為 0；量化值成為 `NaN`，後續 index 可能讓輸出混入字串 `undefined`。空自訂字元集目前會 fallback 成單一空白，會直接觸發。
- 自訂字元集用 UTF-16 index 存取；emoji 或其他 astral symbol 會被拆成 surrogate halves。
- 透明像素 alpha 完全忽略，透明區域被當成黑色密集字元，通常與圖片預覽語意相反。
- `asciiResult` 是同步 computed；拖動 slider 會在 main thread 重取樣、讀 pixels、配置多個 Float32Array，再啟動 renderer。大寬度或圖片可造成卡頓。
- component renderer 與產生出的 TypeScript renderer 各維護一份近 180 行邏輯，容易產生 preview 與下載輸出不一致。
- `animationType: 'none'` 仍永久跑 30 FPS animation loop；元件未實作 `OnDestroy`，離開頁面時 active player 不一定釋放。
- scroll effects 建立的 timeout 沒有 cleanup。
- 連續選檔沒有 generation guard；較舊 FileReader/Image load 可能最後覆蓋新檔。
- 接受任意 `image/*`，但錯誤 copy 只說 PNG/JPG；decode、Canvas taint、超大圖片與 SVG/GIF 行為未定義。
- 匯出的 TS runtime 不驗證 `fps`、Canvas 與資料 dimensions；使用說明範例把 `document.getElementById()` 直接傳給需要 `HTMLCanvasElement` 的函式，在 strict TypeScript 下不成立。
- generated runtime 的 `none` 模式同樣持續 requestAnimationFrame，浪費 CPU。

#### 套件評估

- **決策：不安裝。** ASCII mapping、dithering、palette 與 generated renderer 是產品核心，現成 package 反而較難保證 preview 與輸出 runtime 完全一致。
- grapheme charset 直接使用原生 `Intl.Segmenter`；若 browser matrix 需要 fallback，可與字數統計共用 `unicode-segmenter`，不另選第二套 Unicode library。
- [`Comlink`](https://github.com/GoogleChromeLabs/comlink) 可把 Worker message 包成 RPC，體積小；但它不提供 job cancellation、latest-result guard 或 Angular lifecycle。此工具只有少數 Worker method 時，明確 typed protocol 更容易測試，暫不安裝。
- 不裝 GIF/animation decoder。現有需求是單張 raster 轉 ASCII；先限制輸入 contract，而不是擴張格式範圍。

#### 建議實作

- core 先驗證 width、source dimensions、contrast/brightness 範圍與 grapheme charset。1 字元 charset 使用固定量化值，不做除法；0 字元明確拒絕或使用受測 fallback。
- charset 使用 `Intl.Segmenter(..., { granularity: 'grapheme' })` 或等效 splitter，`ConvertResult` 保存 token array 或 stable index representation。
- 明確定義 alpha composite 背景；轉換前先與預覽背景合成，避免透明區域被誤判。
- 抽出單一 renderer specification；component preview 與 code generator 共用狀態規則/測試 fixture，避免兩份演算法漂移。
- 靜態模式只畫一次；動畫模式才建立 RAF。使用 effect cleanup 與 `DestroyRef` 釋放 player/timer。
- 大型轉換 debounce 或移入 Worker；連續選檔使用 generation ID。
- 限制輸入 MIME/pixel count，捕捉 `getImageData()` security/記憶體錯誤。
- 修正 strict TypeScript 使用範例並對 generated source 做真正 compile test。

#### 驗收測試

- 空 charset、1 grapheme、emoji charset、透明 PNG、純黑/純白、極端 contrast/brightness。
- preview 與 generated renderer 使用相同 fixture，比對每格字元、顏色與 animation 初始 frame。
- 將 generated TS 寫入測試 fixture，由 TypeScript/Angular build typecheck；驗證 `destroy()` 後不再排程 frame。
- 快速連續選兩張圖與 component destroy，不得提交舊圖結果或留下 RAF。

### 7. AI 圖片深度估算 (`depth-estimator`)

#### 發現

- Worker request/response 沒有 request ID。上傳新圖、切換 model/device、清除圖片後，舊推論結果仍可回寫目前 state。這是最高風險的結果錯配。
- Worker 會依序處理送入的多個 estimate，但 UI 只有一個 `isLoading`；較早工作完成時可提前解除 loading，較晚錯誤或成功再覆蓋結果。
- `createImageBitmap()` rejection 沒有 catch，會留下永久 loading 狀態與 unhandled rejection。
- `clearImage()` 不取消或失效目前推論，也未重設 loading/progress。
- 3D preview 對 640×640 輸入採 step 2，可產生約 102,400 vertices，卻使用 `Uint16Array` index；超過 65,535 後 index 截斷。每次 redraw 也新建 index buffer 而不刪除。
- 3D preview 使用 raw depth 加 invert，忽略 contrast、brightness、edge softening；OBJ/GLB 使用 contrast/brightness，但忽略 edge softening。相同控制值在不同輸出產生不同幾何。
- 接受所有 `image/*`。GLB 只支援 JPEG/PNG/WebP；若原圖是 GIF、AVIF、SVG 等，程式仍把原始 bytes 傳入，但 MIME fallback 宣告為 PNG，造成無效 GLB texture。
- OBJ/GLB Object URL 在 click 後立即 revoke，部分瀏覽器可能尚未開始讀取。
- clipboard 的 `toBlob(async callback)` 內部 rejection 不會被外層 try/catch 捕捉；Blob 為 null 或 Clipboard API 不支援時沒有回報。
- 16-bit PNG copy 宣稱「保留 float 深度階調」，實際是 0..1 正規化值量化成 unsigned 16-bit。不是 floating-point depth。
- exported depth metadata 保存原始模型 min/max，但 pixel 已做 normalization、contrast、brightness、invert、blur；若沒有清楚 mapping，consumer 容易誤解數值。
- WebGL shader compile/link 未檢查 status；WebGL resources 在銷毀或換 context 時未完整 delete。
- preview 與 export 會反覆在 main thread 對高解析度 depth 做 resize/blur，slider 連續事件可能造成明顯阻塞。

#### 套件評估

- **決策：建議安裝 runtime [`@gltf-transform/core`](https://github.com/donmccurdy/glTF-Transform)，但先設 bundle gate。** 它支援 browser/Node、TypeScript、程序化建立並輸出 GLB，會自動管理 accessor、bufferView、alignment、index 與 byte offset，適合取代目前手寫 GLB binary layout。
- 因它另依賴 `property-graph`，先做 isolated production build。建議 gate：只進入 `depth-estimator` lazy chunk；gzip 增量若不超過 100 kB 且 output contract 減少至少 100 行 binary code，採用。未過 gate則保留精簡自製 encoder，但必須靠 validator 測試。
- **建議安裝 dev-only [`gltf-validator`](https://github.com/KhronosGroup/glTF-Validator)。** 這是 Khronos 官方 glTF 2.0 validator，可檢查 GLB container、schema、buffer/accessor、image 與 extensions。只在 tests 使用，不進 production bundle。
- 圖片轉檔已建議的 `fflate` 可在此共用 `zlibSync`，取代 `CompressionStream('deflate')`，讓 8/16-bit PNG 在測試與 browser 有一致 encoder path。
- 不新增 Three.js。它可簡化 3D scene/export，但對單一 height mesh 過重，且不能取代 depth preprocessing 與 request-state 修正。
- 不新增另一套 ML runtime；保留現有 `@huggingface/transformers`，先修 Worker protocol 與模型輸出 contract。

#### 建議實作

- Worker protocol 加 `requestId`；response 全部 echo ID。元件只接收 active ID。clear、換圖、換 model/device 都讓舊 ID 失效；需要真正取消時 terminate 並重建 Worker。
- 將 `createImageBitmap()`、postMessage、Worker error、模型下載與推論分成明確 state machine；所有失敗都清 loading/progress。
- 3D preview 依 `MAX_UINT16_VERTICES` 自動計算 grid step，或在支援時使用 `OES_element_index_uint`/WebGL2 與 `Uint32Array`。重用並刪除 buffers；檢查 shader compile/link。
- 建立單一 `prepareGeometryDepth()`，讓 preview、OBJ、GLB 對 invert/contrast/brightness/edge softening 使用同一 contract。若某設定只影響 2D preview，則不得套入 3D copy。
- 所有輸入先轉碼成確定的 PNG/JPEG bytes 再嵌入 GLB，或明確拒絕 GLB 不支援的 MIME；宣告 MIME 必須符合 bytes signature。
- download URL 延後 revoke；clipboard 改成 Promise wrapper，null Blob、缺少 API、permission rejection 都回到同一錯誤狀態。
- 16-bit copy 改稱「16-bit normalized grayscale」，並在 metadata 寫入 normalization、invert、contrast、brightness、blur 與 relative-disparity 語意。
- 高解析度 export/blur 移入 Worker，或 throttle slider preview；避免同一 signal change 重複生成大型陣列。

#### 驗收測試

- 兩張圖片快速上傳、推論途中 clear、model/device 快速切換、舊 success 晚到；只有最新 request 可更新畫面。
- `createImageBitmap` rejection、Worker constructor/error、WebGPU fallback、WASM error 都必須結束 loading。
- 640×640 3D preview 的最大 index 不得超出 vertex count，也不得在 Uint16 模式超過 65,535 vertices。
- 用 GLB parser/validator 驗證 JSON chunk、bufferViews、accessors、indices、texture MIME/signature 與圖片方向。
- 用 PNG parser 驗證 8/16-bit IHDR、sample endian、dimensions、metadata 與處理後 pixel；copy/download bytes 應一致。
- 對同一 fixture，比對 3D preview、OBJ、GLB 的取樣位置與 depth adjustment contract。

### 8. 密碼產生器 (`password-generator`)

#### 發現

- `getRandomChar()` 與 Fisher-Yates 都用 `randomUint32 % range`。當 range 不能整除 2³² 時有 modulo bias；安全密碼工具不應宣稱均勻安全亂數。
- `firstCharRule: 'upper'` 永遠從全部大寫池選字，即使 `useUppercase` 是 false；`letter` 也會從未啟用的 upper/lower pool 選字。輸出違反 UI 勾選條件。
- 當 required first-char type 未啟用時，目前註解宣稱 fallback，但實際 `firstPool` 仍非空，因此不會 fallback。
- `generatePassword()` 遇到 unique 長度過大時靜默縮短；component 又獨立重算 pool size並修改 length。核心與 UI 有兩份規則，未來容易漂移。
- pool size 在 component 以 magic numbers 重算，和 logic constants 沒有共享 contract。
- strength 分數把「排除易混淆」、「不重複」與「首字為字母」當加分，但這些不必然增加 entropy；unique-only 反而限制樣本空間。長度與 pool entropy 才是主要依據，現有「極強」可能誤導。
- 生成器在長度不足以容納所有啟用 pool 時用 `pop()` 靜默捨棄後面的規則。現有 slider 最小 4 剛好可容納 4 pools，但 core public contract 仍不完整。
- `window.crypto` 讓純邏輯模組難以跨環境測試；型別也沒有 injectable RNG contract。
- `firstCharRule` 在 component 是 `signal<string>`，靠 cast 傳入；不合法值可能穿過 UI 邊界。
- success timer 未在 destroy 時清除，也可能清掉較新的訊息。

#### 套件評估

- **決策：不安裝。** 均勻亂數用原生 `crypto.getRandomValues()` 加 rejection sampling 即可；核心不到數十行，不需要 random/password library。
- [`@zxcvbn-ts/core`](https://zxcvbn-ts.github.io/zxcvbn/) 適合估算人類自選密碼的 dictionary、keyboard pattern 與常見變形，不適合拿來取代已知 pool/length 的隨機生成 entropy 計算。加上 dictionaries 也會增加 lazy chunk。
- 若未來增加「貼上既有密碼做強度檢查」，再以 dynamic import 導入 zxcvbn-ts 與繁中 feedback；目前 generator 不安裝。
- 不採 password-generator wrapper package。安全核心應維持小、可 audit、可注入 deterministic RNG 測試，避免把規則與 entropy contract交給黑箱。

#### 建議實作

- 建立 rejection sampling 的 `secureRandomInt(maxExclusive)`，完全消除 modulo bias；shuffle 與抽字共用。
- 先由 options 建立唯一 authoritative pool model。首字規則只能從已啟用 pool 的交集取字；交集為空時回傳具名 validation error，不得偷偷加入未選字元。
- `generatePassword` 改回傳 discriminated result，例如 success/password/effectiveLength 或 error/code；不要以空字串與靜默縮短表示多種錯誤。
- pool size、unique 最大長度、required groups、首字候選全部由 core validation 輸出，component 不再重算 magic number。
- strength 改用 pool size、長度、限制條件計算理論 entropy，另把「規則符合」與「強度」分開。文案只呈現可辯護的區間，不保證實際帳號政策或抗破解時間。
- 使用 `PasswordOptions['firstCharRule']` signal，移除 cast。RNG 以參數或小型介面注入，production 預設使用 Web Crypto，測試使用 deterministic stub。
- copy-status timer 加入 teardown。

#### 驗收測試

- 所有 first-char rule × enabled pools 組合；特別測試「只選數字 + 首字大寫」不得產生含大寫、也不得假裝成功。
- unique max length、每種 required group、無可用 pool、非法 length 與非法 options。
- deterministic RNG 驗證 rejection sampling、shuffle 邊界與每個 pool 必定出現；統計測試只作輔助，不作唯一正確性依據。
- entropy/strength 使用固定 cases 與單調性測試：相同 pool 增加長度不能降低估計；縮小 pool 不得無理由提高強度。

## 建議動工順序

### Phase 1：輸出正確性與安全性

1. `password-generator`：亂數、pool/首字 validation、strength contract。
2. `text-markdown-html`：parser、sanitization、stale copy。
3. `image-converter`：MIME 驗證、job revision、Object URL、ZIP。
4. `depth-estimator`：request ID、3D index、GLB texture MIME、clipboard/download。
5. `image-to-ascii`：單字元 charset、Unicode、renderer lifecycle。

### Phase 2：比較與長任務可靠性

1. `diff-checker`：保留原文、Unicode diff、取消 stale compare、large-input strategy。
2. `svg-draw`：完整取消、timer、資源釋放、pixel budget。
3. `word-count`：grapheme/word contract 與 Unicode fixtures。

### Phase 3：共通現代化與驗證

- 收斂 union types、移除 casts/`any`/未使用 imports。
- 統一 browser resource lifecycle。
- 增加真實 output parser/validator 測試。
- 每批執行 `pnpm run lint`、`pnpm exec ng test --watch=false`、`pnpm run build`。

## 完成定義

- 8 個工具所有 P0/P1 項目都有修正或明確記錄為不採用及原因。
- 每個工具至少有一組 failure/edge fixture，不只測元件可建立。
- 圖片、SVG、ZIP、PNG、OBJ、GLB、generated TypeScript 等輸出均由 parser、MIME/header 或 compiler 驗證，不只檢查 Blob 非空。
- 非同步工具通過 stale-result、cancel、clear、destroy 測試。
- UI 結構與視覺不變；必要 copy 只修正技術語意。
- `pnpm run lint`、完整 Angular tests、`pnpm run build` 全部通過。
