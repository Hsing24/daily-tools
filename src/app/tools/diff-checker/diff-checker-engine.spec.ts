import { describe, it, expect } from "vitest";
import {
  tokenizeLine,
  getLcs,
  diffLines,
  diffWords,
  findDiffBlocks,
} from "./diff-checker-engine";

describe("Diff Checker Engine", () => {
  describe("tokenizeLine", () => {
    it("should split English words, spaces, and punctuation correctly", () => {
      const line = "Hello world! 123";
      const tokens = tokenizeLine(line);
      expect(tokens).toEqual(["Hello", " ", "world", "!", " ", "123"]);
    });

    it("should split Chinese characters and mixings correctly", () => {
      const line = "哈囉 world 世界";
      const tokens = tokenizeLine(line);
      expect(tokens).toEqual(["哈", "囉", " ", "world", " ", "世", "界"]);
    });
  });

  describe("getLcs", () => {
    it("should compute LCS for string arrays", () => {
      const a = ["A", "B", "C"];
      const b = ["A", "D", "C"];
      const result = getLcs(a, b);

      expect(result).toEqual([
        { type: "equal", item: "A", indexA: 0, indexB: 0 },
        { type: "removed", item: "B", indexA: 1 },
        { type: "added", item: "D", indexB: 1 },
        { type: "equal", item: "C", indexA: 2, indexB: 2 },
      ]);
    });
  });

  describe("diffLines", () => {
    it("should return equal rows for identical texts", () => {
      const linesA = ["line 1", "line 2"];
      const linesB = ["line 1", "line 2"];
      const result = diffLines(linesA, linesB);

      expect(result.length).toBe(2);
      expect(result[0]).toEqual({
        type: "equal",
        leftLineNum: 1,
        rightLineNum: 1,
        leftText: "line 1",
        rightText: "line 1",
      });
    });

    it("should handle isolated added or removed lines", () => {
      const linesA = ["line 1", "line 2"];
      const linesB = ["line 1", "line 1.5", "line 2"];
      const result = diffLines(linesA, linesB);

      expect(result.length).toBe(3);
      expect(result[1]).toEqual({
        type: "added",
        rightLineNum: 2,
        leftText: "",
        rightText: "line 1.5",
      });
    });

    it("should merge adjacent removed + added lines into modified with word diff highlights", () => {
      const linesA = ["hello world"];
      const linesB = ["hello brave world"];
      const result = diffLines(linesA, linesB);

      expect(result.length).toBe(1);
      expect(result[0].type).toBe("modified");
      expect(result[0].leftLineNum).toBe(1);
      expect(result[0].rightLineNum).toBe(1);

      // 左側 'brave' 應該不存在，右側應高亮新增 'brave'
      const leftWords = result[0].leftWords || [];
      const rightWords = result[0].rightWords || [];

      expect(leftWords.map(w => w.text).join("")).toBe("hello world");
      expect(rightWords.map(w => w.text).join("")).toBe("hello brave world");

      const braveToken = rightWords.find(w => w.text === "brave");
      expect(braveToken?.type).toBe("added");
    });
  });

  describe("findDiffBlocks", () => {
    it("should group consecutive changes as a single block", () => {
      const aligned = [
        { type: "equal", leftText: "a", rightText: "a" },
        { type: "removed", leftText: "b", rightText: "" },
        { type: "added", leftText: "", rightText: "c" },
        { type: "equal", leftText: "d", rightText: "d" },
        { type: "modified", leftText: "e", rightText: "f" },
        { type: "equal", leftText: "g", rightText: "g" },
      ] as any[];

      const blocks = findDiffBlocks(aligned);
      expect(blocks.length).toBe(2);

      // 第一個 block 涵蓋索引 1 到 2 (removed 與 added 連續變更)
      expect(blocks[0]).toEqual({
        id: "diff-block-0",
        startIndex: 1,
        endIndex: 2,
      });

      // 第二個 block 涵蓋索引 4 (modified 變更)
      expect(blocks[1]).toEqual({
        id: "diff-block-1",
        startIndex: 4,
        endIndex: 4,
      });
    });
  });
});
