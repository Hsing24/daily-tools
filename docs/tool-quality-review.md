# 工具產出品質與效能審查

審查日期：2026-10-05。範圍為 `app.routes.ts` 登錄的全部 8 項工具，涵蓋純邏輯、Angular state、Worker、下載產物及第三方方案。依本次確認，圖片與文字維持瀏覽器本機處理；可使用免費開源套件，並兼顧輸出品質、效能與載入成本。AI 模型初次仍需下載，圖片不送到雲端推論。

本次直接修正可重現的輸出錯誤、非同步競態與不必要配置。新增 `turndown-plugin-gfm@1.0.2`，擴充 Markdown 表格、圖片與安全相對連結。其餘工具保留現有套件，替代方案的文件優勢不等於本專案的實測優勢。

首輪完成於 `8954848`；後續 GPT-6-Astra（xhigh）實作與獨立驗收記錄見[第二輪審查](tool-quality-second-pass.md)。

## 各工具修改與套件決策

| 工具                                      | 輸出品質與穩定性修改                                                                                                                                               | 效能修改                                                                                                                                   | 第三方決策                                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| 字數統計 `word-count`                     | 維持 grapheme、CJK、emoji 計數；補 CRLF、單獨 CR 與混合換行；銷毀後 clipboard 結果失效                                                                             | 重用 Intl.Segmenter，逐項遍歷，避免把整篇與每個片段都展開成陣列                                                                            | 保留原生 Intl.Segmenter；相容需求確立後才考慮 unicode-segmenter                            |
| 文字轉 Markdown/HTML `text-markdown-html` | 保留 fenced/indented code 空白與 hard breaks；支援表格、圖片、相對連結；處理 table pipe、空表格與合併 cell；清除危險 HTML/URL；舊複製／貼上結果失效                | 保留語法的 block normalization；使用獨立 sanitizer hook 取代跨 Document 搬移；非同步狀態清理                                               | 採用 turndown-plugin-gfm 的 tables plugin，配合既有 marked、DOMPurify、Turndown            |
| 圖片轉檔 `image-converter`                | 清空／銷毀後 decode 結果失效；全數 decode 失敗顯示錯誤；阻止銷毀後 ZIP 下載；維持實際 MIME、檔名及中文 ZIP contract                                                | 同 revision 不重複編碼；結果替換時釋放舊 Object URL                                                                                        | 保留 Canvas 與 fflate；jSquash codecs 列為需量測的候選                                     |
| SVG 描圖 `svg-draw`                       | 以 XML parser 驗證 SVG；preset 切換取消舊作業，避免設定與結果不符                                                                                                  | 直接 transfer ImageData buffer，移除全尺寸 RGBA 複製                                                                                       | 保留 ImageTracer；Vectorizer 和 SVGO 分別作描圖與縮碼候選                                  |
| 文字差異比對 `diff-checker`               | 保留 Unicode、空白行、縮排與換行；超出運算預算顯示明確提示，不交付部分結果；取消 highlight／clipboard 舊狀態                                                       | modified 行只計算一次 word diff；重用 segmenter；block ID 查詢改 Map；jsdiff 設定共用 deadline                                             | 保留 jsdiff；不再引入另一套 diff engine                                                    |
| 圖片轉 ASCII `image-to-ascii`             | 驗證新舊字元與原色結果相同；修復下載 TypeScript 的 strict nullable errors，實際 compile 並執行輸出                                                                 | 移除 3 個 RGB Float32 暫存陣列；預先算 contrast；合併像素／原色處理                                                                        | 保留自製核心與原生 Intl.Segmenter；pica 僅作重採樣品質候選                                 |
| AI 深度估算 `depth-estimator`             | 移除無法公開下載的 Tiny；拒絕 NaN、Infinity、截短 tensor；修 PNG/OBJ/GLB 與 preview 幾何一致性、邊界與正面；sample 可結束 loading；清理 bitmap、pipeline、下載 URL | Worker 序列化且只保留最新待執行圖；GPU 失敗重試 CPU 並快取；3D 旋轉重用 geometry/texture；無 blur 路徑減少配置；16-bit PNG 無損 row filter | 保留 Transformers.js 與 Small；GLB 通過 Khronos validator；暫不增加 glTF Transform runtime |
| 密碼產生器 `password-generator`           | 改成均勻抽取完整候選再拒絕缺少類型的密碼；精確計入首字、強制類型與 unique 限制的 entropy；clipboard 舊結果失效                                                     | 每次產生批次取得 128 個 Uint32 亂數；unique 用交換後 pop 取樣                                                                              | 保留 Web Crypto；zxcvbn 適合人類自選密碼，這個隨機產生器不新增它                           |

## 效能量測

基線 commit：`06ff6695902bb4161fc399f78b2237e8f5cb659b`。下列 root 量測使用 Node 26.10.0，8 次 warmup、前後交錯 25 次，取 median。純核心量測排除圖片 decode、Canvas 重採樣、DOM render 與模型推論；數字不能當作整頁加速比例。ASCII 另以 100 組設定檢查字元與顏色和基線完全一致。

| 場景                                                |     修改前 |     修改後 |      耗時減少 |
| --------------------------------------------------- | ---------: | ---------: | ------------: |
| 字數統計，中英／emoji／換行混合 80,000 UTF-16 units | 593.851 ms | 174.442 ms |         70.6% |
| ASCII 199,800 cells，單色，無 dither                |  10.631 ms |   5.794 ms |         45.5% |
| ASCII 199,800 cells，原色，無 dither                |  57.927 ms |  52.832 ms |          8.8% |
| ASCII 199,800 cells，單色，有 dither                |  12.833 ms |   9.552 ms |         25.6% |
| ASCII 199,800 cells，原色，有 dither                |  62.324 ms |  49.447 ms |         20.7% |
| 密碼，16 字元預設規則                               |   0.072 ms |   0.030 ms |         57.9% |
| 密碼，64 字元且不重複                               |   0.545 ms |   0.071 ms |         87.0% |
| 密碼，4 字元且四類各至少一個                        |   0.015 ms |   0.026 ms | 增加 0.011 ms |

另在 Node 26 的獨立 benchmark 中，1,000 行／100 行修改的 Diff median（5 次）15.48 → 6.66 ms；每側 2,500 完全不同的行（3 次）1607.84 → 150.90 ms，修改後回傳受控超時而非完整 diff。Markdown 50,046 UTF-16 units（3 次）256.18 → 229.34 ms；包含 HTML 的 fixture 使用 jsdom，兩份輸出長度與基線相同。不同 fixture、DOM 模擬與重複次數不能直接與上表互相比較。

最短密碼需拒絕較多候選以保持均勻分布，不能以較快但有偏差的強制插入演算法作替代。精確 entropy 以 BigInt inclusion–exclusion 計算；獨立按類型序列枚舉 280 組有效設定確認計數一致。

可重跑核心 benchmark：

```sh
source ~/.nvm/nvm.sh
nvm use 26
node scripts/benchmark-tool-cores.mjs --baseline 06ff6695902bb4161fc399f78b2237e8f5cb659b
```

Script 會從指定 Git revision 取得舊核心，量測目前工作目錄，並清除暫存檔。它也比對相同文字及 ASCII fixture 的輸出。請在沒有 build/tests 同時執行時量測，避免 CPU 競爭影響結果。

另有三項配置與匯出收益：

- SVG 20 MP 輸入移除 80 MB RGBA 複製；這是配置量，不是圖片峰值總記憶體。純 buffer 準備的 Node median 19.786 → 6.854 ms，不含描圖。
- ASCII 有 dither 的 Float32 暫存由 4 個降為 1 個，199,800 cells 約 3.1968 → 0.7992 MB；無 dither 的 3 個 RGB 暫存全部移除。字元／原色輸出陣列仍會配置。
- Depth 1600×1000、blur=0 的處理 median 17.43 → 11.76 ms。16-bit 平滑合成資料的 PNG 342,992 → 32,452 bytes、編碼 210.2 → 118.8 ms；相同尺寸的高噪聲合成資料大小均為 3,201,713 bytes，編碼 223.0 → 276.1 ms。row filter 保持無損，但不保證所有輸入較快或較小。

Diff 的 150 ms deadline 限制 jsdiff 搜尋，不是整個 UI 操作的硬性耗時保證；tokenization、結果組裝與畫面 render 仍有成本。現有 200,000 字元／10,000 行上限保留，超時請縮小比較範圍。

## 第三方方案比較

採用條件是：browser 可用、免費開源、符合既有部署方式，且在固定 fixture 的品質、檔案大小或效能上有可測量收益。除了 GFM 擴充，以下候選本次沒有宣稱已改善輸出，亦未安裝為 runtime dependencies。

| 方案                                                                     | 官方能力與適用工具                                                  | 本次判斷及採用前需要的證據                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [turndown-plugin-gfm](https://github.com/mixmark-io/turndown-plugin-gfm) | Turndown 官方 GFM 擴充，MIT，tables plugin                          | 已採用；本地 fixture 驗證雙向表格、pipe、空表格、relative URL、圖片與危險 scheme。合併 cell 用 sanitized HTML 保留結構                                                                                                                                                                |
| [unicode-segmenter](https://github.com/cometkim/unicode-segmenter)       | Unicode grapheme 分段                                               | 原生 Intl.Segmenter 足夠；若新增舊 browser 支援，再檢查必要性與 fallback contract                                                                                                                                                                                                     |
| [jSquash](https://github.com/jamsinclair/jSquash)                        | Browser WASM codecs，含 MozJPEG、WebP、AVIF、OxiPNG                 | 可能讓編碼更一致並改善體積；目前未做等品質 A/B，不能證明優於 Canvas。先比較相同品質、alpha、SSIM/視覺差異、下載 bytes、WASM 冷啟動與 encode 峰值記憶體。AVIF 多線程需 [COOP/COEP](https://github.com/jamsinclair/jSquash/blob/main/packages/avif/README.md)，現有部署不能直接假設具備 |
| [pica](https://github.com/nodeca/pica)                                   | 高品質 resize、tiles、Worker                                        | 圖片轉檔目前不縮圖，沒有直接收益；ASCII 可用細線／棋盤格／透明圖片 fixture 比較重採樣品質及成本                                                                                                                                                                                       |
| [Vectorizer](https://github.com/neplextech/vectorizer)                   | Rust/VTracer，browser WASM 與 Worker 同步路徑                       | 可能提高描圖速度與曲線品質；官方 Node benchmark 不能外推本 SPA。需比較照片、圖示、文字、alpha 的像素誤差、path 數、bytes、時間及 WASM 載入量，確認 browser API 支援                                                                                                                   |
| [SVGO browser](https://svgo.dev/docs/usage/browser/)                     | 簡化 SVG 結構與路徑                                                 | 縮碼不等於描圖畫質提升；需 rasterize pixel regression，避免移除語意或 alpha 改變，之後才作可選下載優化                                                                                                                                                                                |
| [jsdiff](https://github.com/kpdecker/jsdiff)                             | 維護中的 diff engine，timeout／maxEditLength                        | 已使用；此次修掉重複 word diff 與無界搜尋，沒有證據需要替換                                                                                                                                                                                                                           |
| [Comlink](https://github.com/GoogleChromeLabs/comlink)                   | Worker RPC                                                          | 不改進 ASCII 映射、品質或取消語意；現有小型 message protocol 足夠                                                                                                                                                                                                                     |
| [glTF Transform](https://gltf-transform.dev/)                            | glTF scenes、materials、extensions、壓縮處理                        | 現有單一 mesh 的 GLB 已通 Khronos validator，加入 SDK 不會提高模型深度準確度。若擴充 scenes／壓縮再評估 lazy bundle 與 extension 需求                                                                                                                                                 |
| [Depth Anything V2](https://github.com/DepthAnything/Depth-Anything-V2)  | Small 24.8M，Apache-2.0；Base/Large 分別 97.5M/335.3M，CC-BY-NC-4.0 | 保留 [Small ONNX](https://huggingface.co/onnx-community/depth-anything-v2-small)，移除公開不可下載的 Tiny。更大模型增加記憶體／下載量且授權不同；未下載推論，不能宣稱此專案精度提升                                                                                                   |
| [zxcvbn-ts](https://github.com/zxcvbn-ts/zxcvbn)                         | 以字典、模式與猜測評估人類密碼                                      | 本工具直接知道隨機取樣空間，用精確計數即可。若未來加入既有密碼檢查，再 lazy-load 它                                                                                                                                                                                                   |

既有 [marked](https://marked.js.org/)、[DOMPurify](https://github.com/cure53/DOMPurify)、[Turndown](https://github.com/mixmark-io/turndown) 與 [fflate](https://github.com/101arrowz/fflate) 保留。安全 HTML 仍須 sanitizer；parser 本身不負責清除可執行內容。密碼採 [Web Crypto](https://www.w3.org/TR/WebCryptoAPI/) 與無 modulo bias 的 bounded integer 抽樣。

## 驗證與限制

核心及元件回歸涵蓋：Unicode／換行、Markdown code 空白與 GFM roundtrip、URL/HTML 清理、最新 revision、Worker cancel／序列化／GPU fallback／dispose、下載 MIME、PNG 實際 sample 解碼、mesh 邊界／winding／Float32 bounds、密碼規則與 entropy、ASCII 輸出實際 TypeScript strict compile/runtime。

GLB 用 [Khronos glTF Validator](https://github.com/KhronosGroup/glTF-Validator) `2.0.0-dev.3.10` 對含實際 PNG 貼圖、1600×1000 aspect 的產物驗證，結果 0 errors／warnings／infos／hints。另驗證 browser 下載的 384×384 sample GLB：0 errors／warnings、1 個非 2 的冪貼圖尺寸提示。Validator 作臨時驗證工具，未增加 production dependency。

第一批整合驗證：Node 26.10.0，`pnpm exec ng test --watch=false` 共 24 files／269 tests 全通過；`pnpm run build`、`pnpm run lint` 與 `git diff --check` 通過。production initial raw size 維持 305.03 kB，estimated transfer 84.23 → 84.20 kB；文字轉換 lazy chunk 93.69 → 97.09 kB，estimated transfer 27.81 → 28.82 kB，GFM 與安全擴充沒有進入 initial bundle。8 條工具 route 均通過 production browser smoke；另外驗證實際 ZIP 中文檔名／WebP bytes、64×64 SVG XML、下載 ASCII TypeScript strict compile，以及 sample 深度 PNG／OBJ／GLB 下載。模型權重未下載，實際模型推論速度、不同 GPU／browser、照片 corpus 的品質比較尚未量測；GPU fallback 由注入的 Worker 測試驗證。本次圖片 browser smoke fixture 為 64×64 PNG，不能當作大圖效能或視覺品質 corpus。
