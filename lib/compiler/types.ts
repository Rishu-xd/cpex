export type CppStandard = 'c++17' | 'c++20';

export type OptimizationLevel = '-O0' | '-O1' | '-O2';

export interface CompilerConfig {
  std: CppStandard;
  optLevel: OptimizationLevel;
  timeoutMs: number;
  memoryLimitMb: 32 | 64 | 128 | 256;
}

export const DEFAULT_COMPILER_CONFIG: CompilerConfig = {
  std: 'c++17',
  optLevel: '-O1',
  timeoutMs: 5000,
  memoryLimitMb: 64,
};

export type DiagnosticSeverity = 'error' | 'warning' | 'note';

export interface CompilerDiagnostic {
  file: string;
  line: number;
  column: number;
  severity: DiagnosticSeverity;
  message: string;
  rawLine: string;
}

export type CompilerPhase =
  | 'idle'
  | 'loading-compiler'
  | 'ready'
  | 'compiling'
  | 'running'
  | 'error';

export interface CompilerRuntimeStatus {
  phase: CompilerPhase;
  loaded: boolean;
  progressPercent: number | null;
  clangVersion: string | null;
  message: string;
}

export type ExecutionStatus =
  | 'success'
  | 'compile-error'
  | 'runtime-error'
  | 'timeout'
  | 'cancelled';

export interface ExecutionResult {
  status: ExecutionStatus;
  stdout: string;
  stderr: string;
  compileStderr: string;
  diagnostics: CompilerDiagnostic[];
  exitCode: number | null;
  compileTimeMs: number;
  executionTimeMs: number | null;
  wasmSizeBytes: number | null;
  cachedCompile: boolean;
  truncated: boolean;
  errorMessage: string | null;
  commandLine: string;
}

export interface CompileSuccess {
  ok: true;
  wasmBinary: Uint8Array;
  compileStderr: string;
  diagnostics: CompilerDiagnostic[];
  compileTimeMs: number;
  wasmSizeBytes: number;
  commandLine: string;
}

export interface CompileFailure {
  ok: false;
  compileStderr: string;
  diagnostics: CompilerDiagnostic[];
  compileTimeMs: number;
  errorMessage: string;
  commandLine: string;
}

export type CompileOutcome = CompileSuccess | CompileFailure;

export type CompilerWorkerRequest =
  | { type: 'preload'; requestId: string }
  | {
      type: 'compile';
      requestId: string;
      files: Record<string, string>;
      entryFile: string;
      config: CompilerConfig;
    };

export type CompilerWorkerResponse =
  | {
      type: 'status';
      phase: 'loading-compiler' | 'ready' | 'compiling';
      progressPercent: number | null;
      clangVersion: string | null;
      message: string;
    }
  | {
      type: 'preload-result';
      requestId: string;
      ok: boolean;
      clangVersion: string | null;
      errorMessage?: string;
    }
  | {
      type: 'compile-result';
      requestId: string;
      outcome:
        | {
            ok: true;
            wasmBuffer: ArrayBuffer;
            compileStderr: string;
            diagnostics: CompilerDiagnostic[];
            compileTimeMs: number;
            wasmSizeBytes: number;
            commandLine: string;
          }
        | CompileFailure;
    };

export interface RunnerWorkerRequest {
  type: 'execute';
  requestId: string;
  wasmBuffer: ArrayBuffer;
  stdin: string;
}

export interface RunnerWorkerResponse {
  type: 'execute-result';
  requestId: string;
  status: 'success' | 'runtime-error';
  stdout: string;
  stderr: string;
  exitCode: number | null;
  executionTimeMs: number;
  truncated: boolean;
  errorMessage: string | null;
}
