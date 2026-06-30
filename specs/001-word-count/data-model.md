# Phase 1 Data Model: 字數統計工具

本工具為純前端、不持久化。資料模型僅描述記憶體內的狀態與衍生值。

## Entity: InputText（輸入文字）

| 屬性 | 型別 | 說明 |
|------|------|------|
| value | `string` | 使用者目前在 textarea 中的內容。唯一的可變狀態來源。預設 `''`。 |

- **儲存**：元件內 `signal<string>('')`，不寫入任何持久層。
- **變更來源**：textarea `(input)` 事件、「貼上」按鈕（取代全部內容）、「清除」按鈕（設為 `''`）。
- **驗證規則**：無格式限制；接受任意字串（含換行、空白、emoji、CJK）。

## Entity: TextStats（統計結果）

由 `InputText.value` 經 `computeTextStats(text)` 即時衍生（`computed`），不獨立儲存。

| 欄位 | 型別 | 定義 | 空字串值 |
|------|------|------|---------|
| charactersWithSpaces | `number` | 全部字元數（含空白），以 Unicode 碼點計 | 0 |
| charactersNoSpaces | `number` | 不含任何空白字元的字元數（碼點） | 0 |
| words | `number` | 字數＝CJK 字元數 ＋ 非 CJK 空白分隔詞段數 | 0 |
| lines | `number` | 行數；空字串為 0，否則為換行分割段數 | 0 |

- **不變式（invariants）**：
  - 所有欄位 `>= 0` 的整數。
  - `charactersNoSpaces <= charactersWithSpaces`。
  - `text === ''` ⇒ 四欄位皆為 0（對應 FR-006）。
- **狀態轉換**：無；為純衍生值，隨 `InputText.value` 改變而重算。

## 衍生關係

```text
InputText.value (signal<string>)
        │  computeTextStats(value)   // 純函式，無副作用
        ▼
TextStats { charactersWithSpaces, charactersNoSpaces, words, lines }  (computed)
        │  render
        ▼
統計區 UI（aria-live="polite"）
```
