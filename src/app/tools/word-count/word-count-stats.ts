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
// Emoji includes ordinary # and *; only count pictographs, flags and keycaps.
const EMOJI_PATTERN =
  /[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3]/u;
const graphemeSegmenter =
  typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : undefined;
const wordSegmenter =
  typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "word" })
    : undefined;

function* segmentGraphemes(text: string): Iterable<string> {
  if (graphemeSegmenter) {
    for (const part of graphemeSegmenter.segment(text)) yield part.segment;
  } else {
    yield* text;
  }
}

function* segmentWords(text: string): Iterable<WordSegment> {
  if (wordSegmenter) {
    for (const part of wordSegmenter.segment(text)) {
      yield { segment: part.segment, isWordLike: part.isWordLike ?? false };
    }
    return;
  }

  for (const [segment] of text.matchAll(
    /[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]/gu,
  )) {
    yield {
      segment,
      isWordLike: /[\p{L}\p{N}]/u.test(segment),
    };
  }
}

function isWhitespace(grapheme: string): boolean {
  return /^[\s\u3000]+$/u.test(grapheme);
}

function countWords(text: string): number {
  let count = 0;
  for (const word of segmentWords(text)) {
    if (word.isWordLike) {
      if (
        !CJK_PATTERN.test(word.segment) &&
        !EMOJI_PATTERN.test(word.segment)
      ) {
        count += 1;
        continue;
      }
      let hasOtherWordContent = false;
      for (const grapheme of segmentGraphemes(word.segment)) {
        if (CJK_PATTERN.test(grapheme) || EMOJI_PATTERN.test(grapheme)) {
          count += 1 + (hasOtherWordContent ? 1 : 0);
          hasOtherWordContent = false;
        } else if (!isWhitespace(grapheme)) hasOtherWordContent = true;
      }
      count += hasOtherWordContent ? 1 : 0;
    } else {
      if (!EMOJI_PATTERN.test(word.segment)) continue;
      for (const grapheme of segmentGraphemes(word.segment)) {
        if (EMOJI_PATTERN.test(grapheme)) count += 1;
      }
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

  let charactersWithSpaces = 0;
  let charactersNoSpaces = 0;
  let lines = 1;
  let previousGrapheme = "";
  for (const grapheme of segmentGraphemes(text)) {
    charactersWithSpaces += 1;
    if (!isWhitespace(grapheme)) charactersNoSpaces += 1;
    if (
      grapheme === "\r\n" ||
      grapheme === "\r" ||
      (grapheme === "\n" && previousGrapheme !== "\r")
    )
      lines += 1;
    previousGrapheme = grapheme;
  }
  return {
    charactersWithSpaces,
    charactersNoSpaces,
    words: countWords(text),
    lines,
  };
}
