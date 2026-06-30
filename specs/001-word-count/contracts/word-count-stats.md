# Contract: `computeTextStats` 純計算函式

本工具對外的核心「介面契約」是計算函式的型別簽章與計算規則。UI 元件依此契約呈現結果；單元測試以本契約的範例為驗收基準。

## Signature

```ts
export interface TextStats {
  /** 全部字元數（含空白），以 Unicode 碼點計 */
  readonly charactersWithSpaces: number;
  /** 不含任何空白字元的字元數（碼點） */
  readonly charactersNoSpaces: number;
  /** 字數：CJK 字元數 + emoji 數 + 其餘空白分隔詞段數 */
  readonly words: number;
  /** 行數：空字串為 0，否則為換行分割段數 */
  readonly lines: number;
}

export function computeTextStats(text: string): TextStats;
```

- **純函式**：相同輸入永遠回傳相同輸出，無副作用、不讀寫外部狀態。
- **輸入**：任意 `string`（含空字串、空白、換行、emoji、CJK、全/半形）。
- **輸出**：四個非負整數，滿足 `charactersNoSpaces <= charactersWithSpaces`。

## 計算規則

| 欄位 | 規則 |
|------|------|
| charactersWithSpaces | `[...text].length`（依碼點計，emoji 等 BMP 外字元算 1） |
| charactersNoSpaces | 碼點中非空白者的數量（空白＝`\s`，含半形空白、Tab、換行；CJK 全形空白 `\u3000` 視為空白） |
| words | `cjk + emoji + other`：`cjk` = 符合 `/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu` 的字元數；`emoji` = 符合 `/\p{Extended_Pictographic}/gu` 的字元數；`other` = 將 CJK 與 emoji 字元皆替換為空白後，以 `/\s+/` 分割並濾除空字串的詞段數 |
| lines | `text === '' ? 0 : text.split(/\r\n|\r|\n/).length` |

## 驗收範例（測試案例）

| 輸入 | chars(含空白) | chars(不含空白) | words | lines |
|------|------|------|------|------|
| `""`（空字串） | 0 | 0 | 0 | 0 |
| `"hello world"` | 11 | 10 | 2 | 1 |
| `"你好世界"` | 4 | 4 | 4 | 1 |
| `"你好 world"` | 8 | 7 | 3 | 1 |
| `"  "`（兩個半形空白） | 2 | 0 | 0 | 1 |
| `"a\nb\nc"` | 5 | 3 | 3 | 3 |
| `"line1\n"`（尾端換行） | 6 | 5 | 1 | 2 |
| `"😀😀"` | 2 | 2 | 2 | 1 |
| `"Hello，世界！"`（全形標點） | 9 | 9 | 4 | 1 |

> 說明：`"😀😀"` → 兩個 emoji 各算 1 個字（`emoji=2`），無 CJK 與其餘詞段，故 `words = 2`。
> 說明：`"Hello，世界！"` 共 9 個碼點且無空白，故字元數與不含空白字元數皆為 9。CJK 字元為「世」「界」共 2、無 emoji；將 CJK 替換為空白後得 `"Hello，  ！"`，以空白分詞為 `Hello，` 與 `！` 兩段（`other=2`），故 `words = 2 + 0 + 2 = 4`。標點計入字元數但不屬 CJK，也不分隔英文詞。

## 已知限制（載明於契約）

- 字元數以碼點計，未使用 grapheme 叢集；組合字、ZWJ 旗幟/家庭 emoji 可能算成多個碼點。本版視為可接受（YAGNI；如需精確 grapheme 計數，未來可改用 `Intl.Segmenter`）。
- 「字數」採混合規則：CJK（中日韓）每字算 1、emoji 每個算 1、其餘以空白分詞，三者相加（Clarify Q1=A；emoji 規則於分析階段補定）。emoji 以 `\p{Extended_Pictographic}` 逐碼點計，ZWJ/旗幟序列可能算成多個字；`©®™` 等 pictographic 符號亦會被算入字數，本版視為可接受。
