# Contract: `convertTextToMarkdownAndHtml` 純計算函式

本工具對外的核心「介面契約」是轉換函式的型別簽章與轉換規則。UI 元件依此契約呈現結果；單元測試以本契約的範例為驗收基準。佈局比照 [`../../001-word-count/contracts/word-count-stats.md`](../../001-word-count/contracts/word-count-stats.md)。

## Signature

```ts
export interface TextConversionResult {
  /** Markdown 格式輸出：段落以空白行分隔，段落內換行以內嵌 <br> 表示，Markdown 語法字元已跳脫 */
  readonly markdown: string;
  /** HTML 內容片段輸出：段落以 <p> 包裹，段落內換行以 <br> 表示，HTML 特殊字元已跳脫；不含 <html>/<head>/<body> 外層 */
  readonly html: string;
}

export function convertTextToMarkdownAndHtml(text: string): TextConversionResult;
```

- **純函式**：相同輸入永遠回傳相同輸出，無副作用、不讀寫外部狀態。
- **輸入**：任意 `string`（含空字串、純空白、換行、Markdown/HTML 特殊字元）。
- **輸出**：兩個字串欄位，段落數量彼此一致。

## 轉換規則

| 步驟 | 規則 |
|------|------|
| 1. 正規化 | 將 `\r\n`、`\r` 統一轉為 `\n` |
| 2. 修剪外圍空白 | 對整體文字 `trim()`；修剪後為空字串則直接回傳 `{ markdown: '', html: '' }` |
| 3. 段落切分 | 以 `/\n{2,}/`（一個或多個連續空白行）切分為段落陣列 |
| 4. 段落內換行 | 段落內以單一 `\n` 切分為行陣列，各行個別跳脫後以內嵌 `<br>` 重新連接（Markdown 與 HTML 皆同） |
| 5. Markdown 跳脫 | 先跳脫 `\` → `\\`，再跳脫 `` ` * _ { } [ ] ( ) # + - . ! \| > ~ ``（各自前綴 `\`）；不套用於步驟 4 插入的 `<br>` 標籤本身 |
| 6. HTML 跳脫 | 依序跳脫 `&` → `&amp;`（最先處理）、`<` → `&lt;`、`>` → `&gt;`、`"` → `&quot;`、`'` → `&#39;` |
| 7. Markdown 組裝 | 各段落以 `\n\n` 連接 |
| 8. HTML 組裝 | 各段落以 `<p>...</p>` 包裹後以 `\n` 連接 |

## 驗收範例（測試案例）

| 輸入 | markdown | html |
|------|----------|------|
| `""`（空字串） | `""` | `""` |
| `"   \n\n  "`（僅空白/換行） | `""` | `""` |
| `"hello"` | `"hello"` | `"<p>hello</p>"` |
| `"第一段\n\n第二段"` | `"第一段\n\n第二段"` | `"<p>第一段</p>\n<p>第二段</p>"` |
| `"line1\nline2"` | `"line1<br>line2"` | `"<p>line1<br>line2</p>"` |
| `"\n\n\nhello\n\n\n"`（前後多餘空行） | `"hello"` | `"<p>hello</p>"` |
| `"第一段\n\n\n\n第二段"`（連續多個空行） | `"第一段\n\n第二段"` | `"<p>第一段</p>\n<p>第二段</p>"` |
| `"* item"` | `"\* item"` | `"<p>* item</p>"` |
| `"<b>bold</b> & \"quote\""` | `"<b>bold</b> & \"quote\""` | `"<p>&lt;b&gt;bold&lt;/b&gt; &amp; &quot;quote&quot;</p>"` |
| `"# heading?"` | `"\# heading?"` | `"<p># heading?</p>"` |

> 說明：Markdown 欄位僅跳脫 D3 定義的字元集合（`` ` * _ { } [ ] ( ) # + - . ! | > ~ ``），因此 `<`、`>`、`&`、`"` 等 HTML 特殊字元在 Markdown 輸出中**不**跳脫（Markdown 語境下這些字元本身不構成語法誤判風險）；HTML 欄位則反過來僅處理 HTML 實體跳脫，不處理 Markdown 語法字元。

## 已知限制（載明於契約）

- 段落判定僅依「連續換行數量」，不偵測既有 Markdown 結構（清單、標題、表格等），對應 spec Assumptions：v1 僅處理「段落與換行」層級轉換。
- Markdown 跳脫字元集合為實務慣例集合（見 [research.md](../research.md) D3），非 CommonMark 全量 ASCII 標點跳脫；一般標點（逗號、句號以外情境下的冒號等）不跳脫，以維持輸出可讀性。
- 效能：本契約函式為同步字串運算；呼叫端（元件）負責依 [data-model.md](../data-model.md) 的 `ProcessingState` 決定是否延後呼叫以顯示「處理中」狀態（本函式本身不提供進度回報或取消能力，符合 YAGNI）。
