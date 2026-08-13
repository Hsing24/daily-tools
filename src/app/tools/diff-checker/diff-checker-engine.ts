import { diffArrays } from "diff";

export interface AlignedLine {
  type: "added" | "removed" | "equal" | "modified";
  leftLineNum?: number;
  rightLineNum?: number;
  leftText: string;
  rightText: string;
  leftWords?: WordToken[];
  rightWords?: WordToken[];
}

export interface WordToken {
  type: "added" | "removed" | "equal";
  text: string;
}

export interface DiffBlock {
  id: string;
  startIndex: number;
  endIndex: number;
}

export const MAX_DIFF_LINES = 10_000;
export const MAX_DIFF_CHARACTERS = 200_000;

/** 使用 Unicode-aware word segmentation，保留空白與標點 token。 */
export function tokenizeLine(line: string): string[] {
  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
    return Array.from(segmenter.segment(line), (part) => part.segment);
  }

  return line.match(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]/gu) ?? [];
}

/** 以 jsdiff Myers diff 計算編輯路徑，避免自製 O(mn) matrix。 */
export function getLcs<T>(
  a: T[],
  b: T[],
  compareFn: (x: T, y: T) => boolean = (x, y) => x === y,
): {
  type: "added" | "removed" | "equal";
  item: T;
  indexA?: number;
  indexB?: number;
}[] {
  const changes = diffArrays(a, b, { comparator: compareFn });
  const result: {
    type: "added" | "removed" | "equal";
    item: T;
    indexA?: number;
    indexB?: number;
  }[] = [];
  let indexA = 0;
  let indexB = 0;

  for (const change of changes) {
    for (const item of change.value) {
      if (change.added) {
        result.push({ type: "added", item, indexB });
        indexB += 1;
      } else if (change.removed) {
        result.push({ type: "removed", item, indexA });
        indexA += 1;
      } else {
        result.push({ type: "equal", item, indexA, indexB });
        indexA += 1;
        indexB += 1;
      }
    }
  }

  return result;
}

function createAlignedLines(linesA: string[], linesB: string[]): AlignedLine[] {
  const lcsResult = getLcs(linesA, linesB);
  const aligned: AlignedLine[] = [];
  let leftLineNum = 1;
  let rightLineNum = 1;

  for (const step of lcsResult) {
    if (step.type === "equal") {
      aligned.push({
        type: "equal",
        leftLineNum,
        rightLineNum,
        leftText: step.item,
        rightText: step.item,
      });
      leftLineNum += 1;
      rightLineNum += 1;
    } else if (step.type === "removed") {
      aligned.push({
        type: "removed",
        leftLineNum,
        leftText: step.item,
        rightText: "",
      });
      leftLineNum += 1;
    } else {
      aligned.push({
        type: "added",
        rightLineNum,
        leftText: "",
        rightText: step.item,
      });
      rightLineNum += 1;
    }
  }

  return aligned;
}

function pairChangedLines(lines: AlignedLine[]): AlignedLine[] {
  const merged: AlignedLine[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (line.type !== "removed" && line.type !== "added") {
      merged.push(line);
      index += 1;
      continue;
    }

    const removed: AlignedLine[] = [];
    const added: AlignedLine[] = [];
    while (
      index < lines.length &&
      (lines[index].type === "removed" || lines[index].type === "added")
    ) {
      const changed = lines[index];
      if (changed.type === "removed") removed.push(changed);
      else added.push(changed);
      index += 1;
    }

    const pairCount = Math.min(removed.length, added.length);
    for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
      const left = removed[pairIndex];
      const right = added[pairIndex];
      merged.push({
        type: "modified",
        leftLineNum: left.leftLineNum,
        rightLineNum: right.rightLineNum,
        leftText: left.leftText,
        rightText: right.rightText,
        leftWords: diffWords(left.leftText, right.rightText, "left"),
        rightWords: diffWords(left.leftText, right.rightText, "right"),
      });
    }
    merged.push(...removed.slice(pairCount), ...added.slice(pairCount));
  }

  return merged;
}

/** 比對完整行內容，保留空白行、縮排、trailing spaces 與換行差異。 */
export function diffLines(linesA: string[], linesB: string[]): AlignedLine[] {
  return pairChangedLines(createAlignedLines(linesA, linesB));
}

export function diffWords(
  leftText: string,
  rightText: string,
  side: "left" | "right",
): WordToken[] {
  const changes = getLcs(tokenizeLine(leftText), tokenizeLine(rightText));
  const result: WordToken[] = [];

  for (const change of changes) {
    if (change.type === "equal")
      result.push({ type: "equal", text: change.item });
    if (change.type === "removed" && side === "left")
      result.push({ type: "removed", text: change.item });
    if (change.type === "added" && side === "right")
      result.push({ type: "added", text: change.item });
  }

  return result;
}

export function findDiffBlocks(lines: AlignedLine[]): DiffBlock[] {
  const blocks: DiffBlock[] = [];
  let currentBlock: { startIndex: number; endIndex: number } | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const isChange =
      line.type === "added" ||
      line.type === "removed" ||
      line.type === "modified";

    if (isChange) {
      currentBlock ??= { startIndex: index, endIndex: index };
      currentBlock.endIndex = index;
    } else if (currentBlock) {
      blocks.push({ id: `diff-block-${blocks.length}`, ...currentBlock });
      currentBlock = null;
    }
  }

  if (currentBlock)
    blocks.push({ id: `diff-block-${blocks.length}`, ...currentBlock });
  return blocks;
}

export function splitTextIntoLines(text: string): string[] {
  return text ? text.split("\n") : [];
}
