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

/**
 * 將一行文字拆解為單字、空白、標點符號 token，利於行內細部對照
 */
export function tokenizeLine(line: string): string[] {
  return line.match(/([a-zA-Z0-9]+|\s+|[^\w\s])/g) || [];
}

/**
 * 計算兩組陣列的 LCS 編輯路徑
 */
export function getLcs<T>(
  a: T[],
  b: T[],
  compareFn: (x: T, y: T) => boolean = (x, y) => x === y
): { type: "added" | "removed" | "equal"; item: T; indexA?: number; indexB?: number }[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (compareFn(a[i - 1], b[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: { type: "added" | "removed" | "equal"; item: T; indexA?: number; indexB?: number }[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && compareFn(a[i - 1], b[j - 1])) {
      result.unshift({ type: "equal", item: a[i - 1], indexA: i - 1, indexB: j - 1 });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "added", item: b[j - 1], indexB: j - 1 });
      j--;
    } else {
      result.unshift({ type: "removed", item: a[i - 1], indexA: i - 1 });
      i--;
    }
  }

  return result;
}

/**
 * 比對兩組行，回傳對齊的行陣列，並將相鄰的移除/新增行合併為 modified 且加上詞級高亮
 */
export function diffLines(linesA: string[], linesB: string[]): AlignedLine[] {
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
      leftLineNum++;
      rightLineNum++;
    } else if (step.type === "removed") {
      aligned.push({
        type: "removed",
        leftLineNum,
        leftText: step.item,
        rightText: "",
      });
      leftLineNum++;
    } else if (step.type === "added") {
      aligned.push({
        type: "added",
        rightLineNum,
        leftText: "",
        rightText: step.item,
      });
      rightLineNum++;
    }
  }

  // 合併相鄰的 removed + added 為 modified 行並進行 word diff
  const merged: AlignedLine[] = [];
  for (let i = 0; i < aligned.length; i++) {
    const current = aligned[i];
    const next = aligned[i + 1];

    if (current.type === "removed" && next && next.type === "added") {
      const leftWords = diffWords(current.leftText, next.rightText, "left");
      const rightWords = diffWords(current.leftText, next.rightText, "right");

      merged.push({
        type: "modified",
        leftLineNum: current.leftLineNum,
        rightLineNum: next.rightLineNum,
        leftText: current.leftText,
        rightText: next.rightText,
        leftWords,
        rightWords,
      });
      i++; // 跳過下一個已對齊的 added 行
    } else {
      merged.push(current);
    }
  }

  return merged;
}

export function diffWords(leftText: string, rightText: string, side: "left" | "right"): WordToken[] {
  const tokensA = tokenizeLine(leftText);
  const tokensB = tokenizeLine(rightText);
  const lcsWords = getLcs(tokensA, tokensB);
  const result: WordToken[] = [];

  for (const step of lcsWords) {
    if (step.type === "equal") {
      result.push({ type: "equal", text: step.item });
    } else if (step.type === "removed" && side === "left") {
      result.push({ type: "removed", text: step.item });
    } else if (step.type === "added" && side === "right") {
      result.push({ type: "added", text: step.item });
    }
  }

  return result;
}

/**
 * 尋找所有連續變更行所組成的差異區塊 (Diff Block)
 */
export function findDiffBlocks(lines: AlignedLine[]): DiffBlock[] {
  const blocks: DiffBlock[] = [];
  let currentBlock: { startIndex: number; endIndex: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isChange = line.type === "added" || line.type === "removed" || line.type === "modified";

    if (isChange) {
      if (currentBlock === null) {
        currentBlock = { startIndex: i, endIndex: i };
      } else {
        currentBlock.endIndex = i;
      }
    } else {
      if (currentBlock !== null) {
        blocks.push({
          id: `diff-block-${blocks.length}`,
          startIndex: currentBlock.startIndex,
          endIndex: currentBlock.endIndex,
        });
        currentBlock = null;
      }
    }
  }

  if (currentBlock !== null) {
    blocks.push({
      id: `diff-block-${blocks.length}`,
      startIndex: currentBlock.startIndex,
      endIndex: currentBlock.endIndex,
    });
  }

  return blocks;
}
