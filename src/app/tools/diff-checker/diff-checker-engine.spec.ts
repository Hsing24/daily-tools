import { describe, it, expect } from "vitest";
import {
  type AlignedLine,
  tokenizeLine,
  getLcs,
  diffLines,
  diffWords,
  findDiffBlocks,
  DiffBudgetExceededError,
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
      expect(tokens).toEqual(["哈囉", " ", "world", " ", "世界"]);
    });

    it("should keep grapheme clusters intact", () => {
      expect(tokenizeLine("👨‍👩‍👧‍👦 👍🏽 🇹🇼")).toEqual(["👨‍👩‍👧‍👦", " ", "👍🏽", " ", "🇹🇼"]);
    });
  });

  describe("getLcs", () => {
    it("should stop an expired computation instead of returning a partial diff", () => {
      expect(() => getLcs(["a"], ["b"], undefined, -1)).toThrow(
        DiffBudgetExceededError,
      );
    });
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
    it("should preserve both original texts when highlighting multiple Unicode changes", () => {
      const left = ["👨‍👩‍👧‍👦 e\u0301 old", "  old  "];
      const right = ["👍🏽 e\u0301 new", "  new  "];
      const rows = diffLines(left, right);
      expect(
        rows.map((row) => row.leftWords?.map((word) => word.text).join("")),
      ).toEqual(left);
      expect(
        rows.map((row) => row.rightWords?.map((word) => word.text).join("")),
      ).toEqual(right);
    });
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

      expect(leftWords.map((w) => w.text).join("")).toBe("hello world");
      expect(rightWords.map((w) => w.text).join("")).toBe("hello brave world");

      const braveToken = rightWords.find((w) => w.text === "brave");
      expect(braveToken?.type).toBe("added");
    });

    it("should preserve blank lines, indentation, trailing spaces, and CRLF", () => {
      const result = diffLines(
        ["  same  ", "", "last\r"],
        ["  same  ", "", "last"],
      );

      expect(result[0].type).toBe("equal");
      expect(result[0].leftText).toBe("  same  ");
      expect(result[1].leftText).toBe("");
      expect(result.some((line) => line.type === "modified")).toBe(true);
    });

    it("should pair multiple removed and added lines", () => {
      const result = diffLines(["old one", "old two"], ["new one", "new two"]);

      expect(result).toHaveLength(2);
      expect(result.every((line) => line.type === "modified")).toBe(true);
    });

    it("should align related edits when a new line precedes a changed block", () => {
      const left = ["const count = 1;", "const active = true;"];
      const right = [
        "// new comment",
        "const count = 2;",
        "const active = false;",
      ];
      const result = diffLines(left, right);
      expect(result.map((line) => line.type)).toEqual([
        "added",
        "modified",
        "modified",
      ]);
      expect(result[1].leftLineNum).toBe(1);
      expect(result[1].rightLineNum).toBe(2);
      expect(
        result[1].leftWords?.filter((word) => word.type === "removed"),
      ).toEqual([{ type: "removed", text: "1" }]);
      expect(
        result[2].rightWords?.filter((word) => word.type === "added"),
      ).toEqual([{ type: "added", text: "false" }]);
      expect(
        result.filter((row) => row.leftLineNum).map((row) => row.leftText),
      ).toEqual(left);
      expect(
        result.filter((row) => row.rightLineNum).map((row) => row.rightText),
      ).toEqual(right);
    });

    it("should leave a deleted line separate before a related modification", () => {
      const result = diffLines(
        ["obsolete unrelated", "const count = 1;"],
        ["const count = 2;"],
      );
      expect(result.map((line) => line.type)).toEqual(["removed", "modified"]);
      expect(result[1].leftLineNum).toBe(2);
      expect(result[1].rightLineNum).toBe(1);
    });

    it("should preserve every input line with bounded fallback for a large hunk", () => {
      const left = Array.from({ length: 65 }, (_, i) => `left${i}`);
      const right = Array.from({ length: 65 }, (_, i) => `right${i}`);
      const result = diffLines(left, right);
      expect(result.map((line) => line.leftText)).toEqual(left);
      expect(result.map((line) => line.rightText)).toEqual(right);
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
      ] as AlignedLine[];

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
