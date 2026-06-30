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

  it('應正確處理含有全形標點的中文與英文 "Hello，世界！"', () => {
    const stats = computeTextStats("Hello，世界！");
    expect(stats.charactersWithSpaces).toBe(9);
    expect(stats.charactersNoSpaces).toBe(9);
    expect(stats.words).toBe(4); // 世 (1) + 界 (1) + Hello， (1) + ！ (1)
    expect(stats.lines).toBe(1);
  });
});
