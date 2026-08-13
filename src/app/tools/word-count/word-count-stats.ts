export interface TextStats {
  /** 全部 grapheme cluster 數（含空白） */
  readonly charactersWithSpaces: number;
  /** 不含空白 grapheme cluster 數 */
  readonly charactersNoSpaces: number;
  /** CJK grapheme、emoji cluster 與其他 word-like segment 數 */
  readonly words: number;
  /** 行數：空字串為 0，否則為換行分割段數 */
  readonly lines: number;
}

interface WordSegment {
  segment: string;
  isWordLike: boolean;
}

const CJK_PATTERN =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const EMOJI_PATTERN = /\p{Emoji}/u;

function segmentGraphemes(text: string): string[] {
  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    });
    return Array.from(segmenter.segment(text), (part) => part.segment);
  }
  return Array.from(text);
}

function segmentWords(text: string): WordSegment[] {
  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
    return Array.from(segmenter.segment(text), (part) => ({
      segment: part.segment,
      isWordLike: part.isWordLike ?? false,
    }));
  }

  return (text.match(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]/gu) ?? []).map(
    (segment) => ({
      segment,
      isWordLike: /[\p{L}\p{N}]/u.test(segment),
    }),
  );
}

function isWhitespace(grapheme: string): boolean {
  return /^[\s\u3000]+$/u.test(grapheme);
}

function countWords(text: string): number {
  let count = 0;
  for (const word of segmentWords(text)) {
    const graphemes = segmentGraphemes(word.segment);
    if (word.isWordLike) {
      let cjkCount = 0;
      let hasOtherWordContent = false;
      for (const grapheme of graphemes) {
        if (CJK_PATTERN.test(grapheme)) cjkCount += 1;
        else if (!isWhitespace(grapheme)) hasOtherWordContent = true;
      }
      count += cjkCount + (hasOtherWordContent ? 1 : 0);
    } else {
      count += graphemes.filter((grapheme) =>
        EMOJI_PATTERN.test(grapheme),
      ).length;
    }
  }
  return count;
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

  const graphemes = segmentGraphemes(text);
  return {
    charactersWithSpaces: graphemes.length,
    charactersNoSpaces: graphemes.filter((grapheme) => !isWhitespace(grapheme))
      .length,
    words: countWords(text),
    lines: text.split(/\r\n|\r|\n/).length,
  };
}
