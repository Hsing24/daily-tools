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

export function computeTextStats(text: string): TextStats {
  if (text === "") {
    return {
      charactersWithSpaces: 0,
      charactersNoSpaces: 0,
      words: 0,
      lines: 0,
    };
  }

  // 1. 全部字元數（含空白），以 Unicode 碼點計
  const codePoints = [...text];
  const charactersWithSpaces = codePoints.length;

  // 2. 不含任何空白字元的字元數（碼點）
  // 空白定義：\s 或 CJK 全形空白 \u3000
  const isSpace = (char: string) => /\s/.test(char) || char === "\u3000";
  const charactersNoSpaces = codePoints.filter((c) => !isSpace(c)).length;

  // 3. 字數：cjk + emoji + other
  const cjkRegex =
    /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;
  const emojiRegex = /\p{Extended_Pictographic}/gu;

  const cjkCount = (text.match(cjkRegex) || []).length;
  const emojiCount = (text.match(emojiRegex) || []).length;

  // 將 CJK 與 emoji 皆替換為空白
  const temp = text.replace(cjkRegex, " ").replace(emojiRegex, " ");
  // 以空白（含 \u3000）進行分割並濾除空字串
  const otherWords = temp.split(/[\s\u3000]+/).filter((w) => w !== "");
  const otherCount = otherWords.length;

  const words = cjkCount + emojiCount + otherCount;

  // 4. 行數：空字串為 0，否則為換行分割段數
  const lines = text.split(/\r\n|\r|\n/).length;

  return {
    charactersWithSpaces,
    charactersNoSpaces,
    words,
    lines,
  };
}
