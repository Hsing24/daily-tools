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
export const MAX_DIFF_TIME_MS = 150;

export class DiffBudgetExceededError extends Error {
  constructor() {
    super("Diff computation exceeded its time budget");
    this.name = "DiffBudgetExceededError";
  }
}

const wordSegmenter =
  typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "word" })
    : undefined;

/** 使用 Unicode-aware word segmentation，保留空白與標點 token。 */
export function tokenizeLine(line: string): string[] {
  if (wordSegmenter) {
    return Array.from(wordSegmenter.segment(line), (part) => part.segment);
  }

  return line.match(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]/gu) ?? [];
}

/** 以 jsdiff Myers diff 計算編輯路徑，避免自製 O(mn) matrix。 */
export function getLcs<T>(
  a: T[],
  b: T[],
  compareFn: (x: T, y: T) => boolean = (x, y) => x === y,
  deadline = Date.now() + MAX_DIFF_TIME_MS,
): {
  type: "added" | "removed" | "equal";
  item: T;
  indexA?: number;
  indexB?: number;
}[] {
  if (Date.now() > deadline) throw new DiffBudgetExceededError();
  const changes = diffArrays(a, b, {
    comparator: compareFn,
    timeout: Math.max(0, deadline - Date.now()),
  });
  if (!changes) throw new DiffBudgetExceededError();
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

function createAlignedLines(
  linesA: string[],
  linesB: string[],
  deadline: number,
): AlignedLine[] {
  const lcsResult = getLcs(linesA, linesB, undefined, deadline);
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

function pairChangedLines(
  lines: AlignedLine[],
  deadline: number,
): AlignedLine[] {
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
      const words = diffWordPair(left.leftText, right.rightText, deadline);
      merged.push({
        type: "modified",
        leftLineNum: left.leftLineNum,
        rightLineNum: right.rightLineNum,
        leftText: left.leftText,
        rightText: right.rightText,
        leftWords: words.left,
        rightWords: words.right,
      });
    }
    merged.push(...removed.slice(pairCount), ...added.slice(pairCount));
  }

  return merged;
}

/** 比對完整行內容，保留空白行、縮排、trailing spaces 與換行差異。 */
export function diffLines(linesA: string[], linesB: string[]): AlignedLine[] {
  const deadline = Date.now() + MAX_DIFF_TIME_MS;
  return pairChangedLines(
    createAlignedLines(linesA, linesB, deadline),
    deadline,
  );
}

export function diffWords(
  leftText: string,
  rightText: string,
  side: "left" | "right",
): WordToken[] {
  return diffWordPair(leftText, rightText, Date.now() + MAX_DIFF_TIME_MS)[side];
}

function diffWordPair(
  leftText: string,
  rightText: string,
  deadline: number,
): { left: WordToken[]; right: WordToken[] } {
  const changes = getLcs(
    tokenizeLine(leftText),
    tokenizeLine(rightText),
    undefined,
    deadline,
  );
  const left: WordToken[] = [];
  const right: WordToken[] = [];

  for (const change of changes) {
    if (change.type === "equal") {
      left.push({ type: "equal", text: change.item });
      right.push({ type: "equal", text: change.item });
    } else if (change.type === "removed") {
      left.push({ type: "removed", text: change.item });
    } else {
      right.push({ type: "added", text: change.item });
    }
  }

  return { left, right };
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
