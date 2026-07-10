# Phase 1 Data Model: 文字轉 Markdown/HTML 工具

本工具為純前端、不持久化。資料模型僅描述記憶體內的狀態與衍生值，佈局比照 [`../001-word-count/data-model.md`](../001-word-count/data-model.md)。

## Entity: SourceText（輸入文字）

| 屬性 | 型別 | 說明 |
|------|------|------|
| value | `string` | 使用者目前在 textarea 中的純文字內容。唯一的可變狀態來源。預設 `''`。 |

- **儲存**：元件內 `signal<string>('')`，不寫入任何持久層。
- **變更來源**：textarea `(input)` 事件、「貼上」按鈕（取代全部現有內容）、「清除」按鈕（設為 `''`）。
- **驗證規則**：無格式限制；接受任意字串（含空白、換行、Markdown/HTML 特殊字元）。

## Entity: ConversionResult（轉換結果）

由 `SourceText.value` 經純函式 `convertTextToMarkdownAndHtml(text)` 即時衍生（`computed`），不獨立儲存。

| 欄位 | 型別 | 定義 | 空輸入值 |
|------|------|------|---------|
| markdown | `string` | Markdown 格式輸出：段落以空白行分隔，段落內換行以內嵌 `<br>` 表示，Markdown 語法字元皆已跳脫 | `''` |
| html | `string` | HTML 內容片段輸出：段落以 `<p>` 包裹，段落內換行以 `<br>` 表示，HTML 特殊字元皆已跳脫；不含 `<html>`/`<head>`/`<body>` 外層 | `''` |

- **不變式（invariants）**：
  - `text === ''`（或僅含空白/換行）⇒ `markdown === '' && html === ''`（對應 FR-010）。
  - 兩欄位的段落數量一致（皆等於輸入以空白行切分後的段落數）。
  - `html` 不含任何未跳脫的 `<`、`>`、`&`、`"`、`'`（換行用途的 `<br>` 除外）。
- **狀態轉換**：無；為純衍生值，隨 `SourceText.value` 改變而重算。

## Entity: ProcessingState（處理狀態）

| 屬性 | 型別 | 說明 |
|------|------|------|
| isProcessing | `boolean` | 大量文字（門檻以上）轉換期間為 `true`；轉換完成或輸入低於門檻時為 `false`。預設 `false`。 |

- **儲存**：元件內 `signal<boolean>(false)`。
- **變更來源**：見 [research.md](./research.md) D5——輸入超過門檻時，先設為 `true` 再以 `setTimeout(0)` 延後計算並於完成後設回 `false`。
- **UI 影響**：`isProcessing === true` 時，輸出區塊顯示「處理中」狀態，不顯示（或凍結顯示）前一次的 `ConversionResult`，避免逐步顯示部分結果（FR-014）。

## Entity: FeedbackMessage（提示訊息，貼上/複製回饋）

| 屬性 | 型別 | 說明 |
|------|------|------|
| clipboardAlert | `string` | 「貼上」失敗時顯示的提示文字；空字串代表無提示。 |
| copyMarkdownStatus | `string` | Markdown 輸出區塊「複製」操作的回饋文字（成功／失敗），透過 `aria-live="polite"` 呈現。 |
| copyHtmlStatus | `string` | HTML 輸出區塊「複製」操作的回饋文字（成功／失敗），透過 `aria-live="polite"` 呈現。 |

- **儲存**：各自獨立的 `signal<string>('')`，與 `word-count.ts` 的 `alertMessage` 模式一致。

## 衍生關係

```text
SourceText.value (signal<string>)
        │  convertTextToMarkdownAndHtml(value)   // 純函式，無副作用
        ▼
ConversionResult { markdown, html }  (computed)
        │
        ├─ ProcessingState.isProcessing  // 大量輸入時延後顯示，見 research.md D5
        │
        ▼
兩個輸出區塊 UI（各自「複製」按鈕 + aria-live 回饋）
```
