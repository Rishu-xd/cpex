import type { CompilerDiagnostic, DiagnosticSeverity } from './types';

const ANSI_ESCAPE_RE = /\x1B\[[0-9;]*[A-Za-z]/g;
const CLANG_DIAG_RE = /^(?:\.?\/)?([^:\s][^:]*):(\d+):(\d+):\s+(fatal error|error|warning|note):\s+(.*)$/;

export function stripAnsi(input: string): string {
  return input.replace(ANSI_ESCAPE_RE, '');
}

export function parseClangDiagnostics(rawStderr: string): CompilerDiagnostic[] {
  const clean = stripAnsi(rawStderr);
  const lines = clean.split(/\r?\n/);
  const diagnostics: CompilerDiagnostic[] = [];

  for (const rawLine of lines) {
    const match = rawLine.match(CLANG_DIAG_RE);
    if (!match) continue;

    const [, filePath, lineStr, colStr, rawSeverity, message] = match;
    const line = Number.parseInt(lineStr, 10);
    const column = Number.parseInt(colStr, 10);
    if (!Number.isFinite(line) || !Number.isFinite(column)) continue;

    let severity: DiagnosticSeverity = 'error';
    if (rawSeverity === 'warning') severity = 'warning';
    else if (rawSeverity === 'note') severity = 'note';

    const normalizedFile = filePath.replace(/^\/+/, '');
    diagnostics.push({
      file: normalizedFile,
      line,
      column,
      severity,
      message: message.trim(),
      rawLine,
    });
  }

  return diagnostics;
}
