export type OutputDiffRowKind = 'equal' | 'changed' | 'added' | 'removed';

export interface OutputDiffRow {
  lineNumber: number;
  expected: string | null;
  actual: string | null;
  kind: OutputDiffRowKind;
}

export interface OutputDiffResult {
  isMatch: boolean;
  rows: OutputDiffRow[];
}

function normalizeForComparison(text: string): string[] {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''))
    .join('\n')
    .trimEnd();
  if (normalized.length === 0) return [];
  return normalized.split('\n');
}

export function visualizeWhitespace(line: string): string {
  return line.replace(/ /g, '·').replace(/\t/g, '→');
}

export function computeOutputDiff(
  expected: string,
  actual: string
): OutputDiffResult {
  const expLines = normalizeForComparison(expected);
  const actLines = normalizeForComparison(actual);
  const maxLen = Math.max(expLines.length, actLines.length);

  const rows: OutputDiffRow[] = [];
  let isMatch = expLines.length === actLines.length;

  for (let i = 0; i < maxLen; i += 1) {
    const hasExp = i < expLines.length;
    const hasAct = i < actLines.length;
    const expVal = hasExp ? expLines[i] : null;
    const actVal = hasAct ? actLines[i] : null;

    let kind: OutputDiffRowKind = 'equal';
    if (hasExp && hasAct) {
      if (expVal !== actVal) {
        kind = 'changed';
        isMatch = false;
      }
    } else if (hasExp && !hasAct) {
      kind = 'removed';
      isMatch = false;
    } else {
      kind = 'added';
      isMatch = false;
    }

    rows.push({
      lineNumber: i + 1,
      expected: expVal,
      actual: actVal,
      kind,
    });
  }

  return { isMatch, rows };
}
