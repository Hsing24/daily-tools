import { describe, it, expect } from "vitest";
import { computeTextStats } from "./word-count-stats";

describe("computeTextStats", () => {
  it("應正確處理空字串", () => {
    const stats = computeTextStats("");
    expect(stats.charactersWithSpaces).toBe(0);
    expect(stats.charactersNoSpaces).toBe(0);
    expect(stats.words).toBe(0);
    expect(stats.lines).toBe(0);
  });

  it('應正確處理純英文單字 "hello world"', () => {
    const stats = computeTextStats("hello world");
    expect(stats.charactersWithSpaces).toBe(11);
    expect(stats.charactersNoSpaces).toBe(10);
    expect(stats.words).toBe(2);
    expect(stats.lines).toBe(1);
  });

  it('應正確處理純中文 "你好世界"', () => {
    const stats = computeTextStats("你好世界");
    expect(stats.charactersWithSpaces).toBe(4);
    expect(stats.charactersNoSpaces).toBe(4);
    expect(stats.words).toBe(4);
    expect(stats.lines).toBe(1);
  });

  it('應正確處理中英混排 "你好 world"', () => {
    const stats = computeTextStats("你好 world");
    expect(stats.charactersWithSpaces).toBe(8);
    expect(stats.charactersNoSpaces).toBe(7);
    expect(stats.words).toBe(3);
    expect(stats.lines).toBe(1);
  });

  it('應正確處理純空白 "  "', () => {
    const stats = computeTextStats("  ");
    expect(stats.charactersWithSpaces).toBe(2);
    expect(stats.charactersNoSpaces).toBe(0);
    expect(stats.words).toBe(0);
    expect(stats.lines).toBe(1);
  });

  it('應正確處理多行文字 "a\\nb\\nc"', () => {
    const stats = computeTextStats("a\nb\nc");
    expect(stats.charactersWithSpaces).toBe(5);
    expect(stats.charactersNoSpaces).toBe(3);
    expect(stats.words).toBe(3);
    expect(stats.lines).toBe(3);
  });

  it('應正確處理尾端換行 "line1\\n"', () => {
    const stats = computeTextStats("line1\n");
    expect(stats.charactersWithSpaces).toBe(6);
    expect(stats.charactersNoSpaces).toBe(5);
    expect(stats.words).toBe(1);
    expect(stats.lines).toBe(2);
  });

  it('應正確處理 Emoji "😀😀" (每個 extended pictographic 算作 1 個字)', () => {
    const stats = computeTextStats("😀😀");
    expect(stats.charactersWithSpaces).toBe(2);
    expect(stats.charactersNoSpaces).toBe(2);
    expect(stats.words).toBe(2);
    expect(stats.lines).toBe(1);
  });

  it("純標點不應計入字數", () => {
    const stats = computeTextStats("Hello，世界！");
    expect(stats.charactersWithSpaces).toBe(9);
    expect(stats.charactersNoSpaces).toBe(9);
    expect(stats.words).toBe(3);
    expect(stats.lines).toBe(1);
  });

  it("應以 grapheme cluster 計算家庭 emoji、膚色、旗幟與 combining mark", () => {
    const stats = computeTextStats("👨‍👩‍👧‍👦👍🏽🇹🇼e\u0301✈️");

    expect(stats.charactersWithSpaces).toBe(5);
    expect(stats.charactersNoSpaces).toBe(5);
    expect(stats.words).toBe(5);
  });

  it("純標點與 CJK 標點不應計入字數", () => {
    const stats = computeTextStats("！？。，、…");

    expect(stats.charactersWithSpaces).toBe(6);
    expect(stats.charactersNoSpaces).toBe(6);
    expect(stats.words).toBe(0);
  });

  it("普通 # 與 * 不應算成 emoji，keycap emoji 則應計入字數", () => {
    expect(computeTextStats("# *").words).toBe(0);
    expect(computeTextStats("#️⃣ *️⃣ 1️⃣").words).toBe(3);
  });

  it("連續 keycap emoji 與夾在詞中的 emoji 應各自算一字", () => {
    expect(computeTextStats("1️⃣2️⃣3️⃣")).toEqual({
      charactersWithSpaces: 3,
      charactersNoSpaces: 3,
      words: 3,
      lines: 1,
    });
    expect(computeTextStats("go1️⃣now2️⃣").words).toBe(4);
    expect(computeTextStats("123").words).toBe(1);
    expect(computeTextStats("中文1️⃣English").words).toBe(4);
  });

  it("長文統計應與重複段落的 grapheme / word contract 一致", () => {
    const paragraph = "你好 world 👨‍👩‍👧‍👦e\u0301\r\n";
    const single = computeTextStats(paragraph);
    const repeated = computeTextStats(paragraph.repeat(1000));
    expect(repeated.charactersWithSpaces).toBe(
      single.charactersWithSpaces * 1000,
    );
    expect(repeated.charactersNoSpaces).toBe(single.charactersNoSpaces * 1000);
    expect(repeated.words).toBe(single.words * 1000);
    expect(repeated.lines).toBe(1001);
  });

  it("CRLF 應保留行數語意", () => {
    const stats = computeTextStats("a\r\nb\r\n");

    expect(stats.lines).toBe(3);
    expect(stats.words).toBe(2);
  });
});
