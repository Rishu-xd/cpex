import type {
  CompileOutcome,
  CompilerConfig,
  CompilerRuntimeStatus,
  CompilerWorkerRequest,
  CompilerWorkerResponse,
  ExecutionResult,
  RunnerWorkerRequest,
  RunnerWorkerResponse,
} from './types';

interface CompiledCacheEntry {
  cacheKey: string;
  wasmBytes: Uint8Array;
  compileStderr: string;
  diagnostics: CompileOutcome['diagnostics'];
  wasmSizeBytes: number;
  commandLine: string;
}

export interface TestCaseInput {
  id: string;
  name: string;
  stdin: string;
  expectedOutput: string;
}

export interface TestCaseRunOutcome {
  testCaseId: string;
  passed: boolean | null;
  result: ExecutionResult;
}

type StatusListener = (status: CompilerRuntimeStatus) => void;

function computeCacheKey(
  files: Record<string, string>,
  entryFile: string,
  config: CompilerConfig
): string {
  const sorted = Object.keys(files)
    .sort()
    .map((k) => [k, files[k]]);
  return JSON.stringify({
    files: sorted,
    entryFile,
    std: config.std,
    optLevel: config.optLevel,
    memoryLimitMb: config.memoryLimitMb,
  });
}

class CppRuntimeManager {
  private compilerWorker: Worker | null = null;
  private runnerWorker: Worker | null = null;
  private statusListeners = new Set<StatusListener>();
  private status: CompilerRuntimeStatus = {
    phase: 'idle',
    loaded: false,
    progressPercent: null,
    clangVersion: null,
    message: 'Compiler idle (lazy-loaded on first run)',
  };

  private compiledCache: CompiledCacheEntry | null = null;
  private requestCounter = 0;

  private activeRunReject: ((reason?: unknown) => void) | null = null;
  private activeRunCancelled = false;
  private activeCompileReject: ((err: Error) => void) | null = null;
  private activeTimeoutId: ReturnType<typeof setTimeout> | null = null;

  public subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public getStatus(): CompilerRuntimeStatus {
    return this.status;
  }

  private setStatus(next: Partial<CompilerRuntimeStatus>) {
    this.status = { ...this.status, ...next };
    for (const listener of this.statusListeners) {
      listener(this.status);
    }
  }

  private nextRequestId(prefix: string): string {
    this.requestCounter += 1;
    return `${prefix}-${this.requestCounter}`;
  }

  private ensureCompilerWorker(): Worker {
    if (typeof window === 'undefined') {
      throw new Error('C++ compiler runtime can only run in the browser.');
    }
    if (!this.compilerWorker) {
      const worker = new Worker(
        new URL('../../workers/cpp-compiler.worker.ts', import.meta.url),
        { type: 'module' }
      );
      worker.addEventListener('message', (ev: MessageEvent<CompilerWorkerResponse>) => {
        const msg = ev.data;
        if (msg.type === 'status') {
          this.setStatus({
            phase: msg.phase,
            loaded: msg.phase === 'ready' || msg.phase === 'compiling' ? true : this.status.loaded,
            progressPercent: msg.progressPercent,
            clangVersion: msg.clangVersion ?? this.status.clangVersion,
            message: msg.message,
          });
        }
      });
      worker.addEventListener('error', (err) => {
        this.setStatus({
          phase: 'error',
          message: err.message || 'Compiler worker crashed',
        });
      });
      this.compilerWorker = worker;
    }
    return this.compilerWorker;
  }

  private ensureRunnerWorker(): Worker {
    if (typeof window === 'undefined') {
      throw new Error('C++ runner runtime can only run in the browser.');
    }
    if (!this.runnerWorker) {
      this.runnerWorker = new Worker(
        new URL('../../workers/cpp-runner.worker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    return this.runnerWorker;
  }

  public async preload(): Promise<void> {
    const worker = this.ensureCompilerWorker();
    const requestId = this.nextRequestId('preload');

    await new Promise<void>((resolve, reject) => {
      const handleMessage = (ev: MessageEvent<CompilerWorkerResponse>) => {
        const msg = ev.data;
        if (msg.type === 'preload-result' && msg.requestId === requestId) {
          worker.removeEventListener('message', handleMessage);
          if (msg.ok) {
            this.setStatus({
              phase: 'ready',
              loaded: true,
              progressPercent: 100,
              clangVersion: msg.clangVersion,
              message: 'Clang/LLVM WASM ready',
            });
            resolve();
          } else {
            this.setStatus({
              phase: 'error',
              message: msg.errorMessage ?? 'Failed to load compiler',
            });
            reject(new Error(msg.errorMessage ?? 'Failed to load compiler'));
          }
        }
      };
      worker.addEventListener('message', handleMessage);
      const req: CompilerWorkerRequest = { type: 'preload', requestId };
      worker.postMessage(req);
    });
  }

  private async compile(
    files: Record<string, string>,
    entryFile: string,
    config: CompilerConfig
  ): Promise<{ outcome: CompileOutcome; cached: boolean }> {
    const cacheKey = computeCacheKey(files, entryFile, config);
    if (this.compiledCache && this.compiledCache.cacheKey === cacheKey) {
      return {
        cached: true,
        outcome: {
          ok: true,
          wasmBinary: this.compiledCache.wasmBytes,
          compileStderr: this.compiledCache.compileStderr,
          diagnostics: this.compiledCache.diagnostics,
          compileTimeMs: 0,
          wasmSizeBytes: this.compiledCache.wasmSizeBytes,
          commandLine: this.compiledCache.commandLine,
        },
      };
    }

    const worker = this.ensureCompilerWorker();
    const requestId = this.nextRequestId('compile');

    const outcome = await new Promise<CompileOutcome>((resolve, reject) => {
      this.activeCompileReject = reject;

      const handleMessage = (ev: MessageEvent<CompilerWorkerResponse>) => {
        const msg = ev.data;
        if (msg.type === 'compile-result' && msg.requestId === requestId) {
          worker.removeEventListener('message', handleMessage);
          this.activeCompileReject = null;

          if (msg.outcome.ok) {
            const bytes = new Uint8Array(msg.outcome.wasmBuffer);
            this.compiledCache = {
              cacheKey,
              wasmBytes: bytes,
              compileStderr: msg.outcome.compileStderr,
              diagnostics: msg.outcome.diagnostics,
              wasmSizeBytes: msg.outcome.wasmSizeBytes,
              commandLine: msg.outcome.commandLine,
            };
            resolve({
              ok: true,
              wasmBinary: bytes,
              compileStderr: msg.outcome.compileStderr,
              diagnostics: msg.outcome.diagnostics,
              compileTimeMs: msg.outcome.compileTimeMs,
              wasmSizeBytes: msg.outcome.wasmSizeBytes,
              commandLine: msg.outcome.commandLine,
            });
          } else {
            this.compiledCache = null;
            resolve(msg.outcome);
          }
        }
      };

      worker.addEventListener('message', handleMessage);
      const req: CompilerWorkerRequest = {
        type: 'compile',
        requestId,
        files,
        entryFile,
        config,
      };
      worker.postMessage(req);
    });

    return { outcome, cached: false };
  }

  private async executeWasm(
    wasmBytes: Uint8Array,
    stdin: string,
    timeoutMs: number
  ): Promise<
    | { kind: 'done'; response: RunnerWorkerResponse }
    | { kind: 'timeout' }
    | { kind: 'cancelled' }
  > {
    const worker = this.ensureRunnerWorker();
    const requestId = this.nextRequestId('run');

    // Clone buffer because postMessage transfers ownership to runner worker
    const bufferCopy = new Uint8Array(wasmBytes.byteLength);
    bufferCopy.set(wasmBytes);

    this.activeRunCancelled = false;

    return new Promise((resolve) => {
      let settled = false;

      const cleanup = () => {
        if (this.activeTimeoutId) {
          clearTimeout(this.activeTimeoutId);
          this.activeTimeoutId = null;
        }
        this.activeRunReject = null;
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
      };

      const terminateRunner = () => {
        if (this.runnerWorker) {
          this.runnerWorker.terminate();
          this.runnerWorker = null;
        }
      };

      const handleMessage = (ev: MessageEvent<RunnerWorkerResponse>) => {
        const msg = ev.data;
        if (msg.type === 'execute-result' && msg.requestId === requestId) {
          if (settled) return;
          settled = true;
          cleanup();
          resolve({ kind: 'done', response: msg });
        }
      };

      const handleError = (ev: ErrorEvent) => {
        if (settled) return;
        settled = true;
        cleanup();
        terminateRunner();
        resolve({
          kind: 'done',
          response: {
            type: 'execute-result',
            requestId,
            status: 'runtime-error',
            stdout: '',
            stderr: '',
            exitCode: null,
            executionTimeMs: 0,
            truncated: false,
            errorMessage: ev.message || 'Execution worker terminated unexpectedly.',
          },
        });
      };

      this.activeRunReject = () => {
        if (settled) return;
        settled = true;
        cleanup();
        terminateRunner();
        resolve({ kind: this.activeRunCancelled ? 'cancelled' : 'timeout' });
      };

      this.activeTimeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        terminateRunner();
        resolve({ kind: 'timeout' });
      }, timeoutMs);

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);

      const req: RunnerWorkerRequest = {
        type: 'execute',
        requestId,
        wasmBuffer: bufferCopy.buffer,
        stdin,
      };
      worker.postMessage(req, [bufferCopy.buffer]);
    });
  }

  public async run(
    files: Record<string, string>,
    entryFile: string,
    stdin: string,
    config: CompilerConfig
  ): Promise<ExecutionResult> {
    this.activeRunCancelled = false;

    let compileRes: { outcome: CompileOutcome; cached: boolean };
    try {
      compileRes = await this.compile(files, entryFile, config);
    } catch {
      this.setStatus({
        phase: this.compilerWorker ? 'ready' : 'idle',
        message: 'Compilation cancelled',
      });
      return {
        status: 'cancelled',
        stdout: '',
        stderr: '',
        compileStderr: '',
        diagnostics: [],
        exitCode: null,
        compileTimeMs: 0,
        executionTimeMs: null,
        wasmSizeBytes: null,
        cachedCompile: false,
        truncated: false,
        errorMessage: 'Compilation cancelled by user.',
        commandLine: `clang++ -std=${config.std} ${entryFile}`,
      };
    }

    const { outcome, cached } = compileRes;
    if (!outcome.ok) {
      this.setStatus({
        phase: 'ready',
        loaded: true,
        message: 'Clang/LLVM WASM ready',
      });
      return {
        status: 'compile-error',
        stdout: '',
        stderr: '',
        compileStderr: outcome.compileStderr,
        diagnostics: outcome.diagnostics,
        exitCode: null,
        compileTimeMs: outcome.compileTimeMs,
        executionTimeMs: null,
        wasmSizeBytes: null,
        cachedCompile: cached,
        truncated: false,
        errorMessage: outcome.errorMessage,
        commandLine: outcome.commandLine,
      };
    }

    this.setStatus({
      phase: 'running',
      loaded: true,
      message: 'Executing program.wasm in isolated worker...',
    });

    const exec = await this.executeWasm(outcome.wasmBinary, stdin, config.timeoutMs);

    this.setStatus({
      phase: 'ready',
      loaded: true,
      message: 'Clang/LLVM WASM ready',
    });

    if (exec.kind === 'timeout') {
      return {
        status: 'timeout',
        stdout: '',
        stderr: '',
        compileStderr: outcome.compileStderr,
        diagnostics: outcome.diagnostics,
        exitCode: null,
        compileTimeMs: outcome.compileTimeMs,
        executionTimeMs: config.timeoutMs,
        wasmSizeBytes: outcome.wasmSizeBytes,
        cachedCompile: cached,
        truncated: false,
        errorMessage: `Execution timed out after ${(config.timeoutMs / 1000).toFixed(1)}s (worker terminated).`,
        commandLine: outcome.commandLine,
      };
    }

    if (exec.kind === 'cancelled') {
      return {
        status: 'cancelled',
        stdout: '',
        stderr: '',
        compileStderr: outcome.compileStderr,
        diagnostics: outcome.diagnostics,
        exitCode: null,
        compileTimeMs: outcome.compileTimeMs,
        executionTimeMs: null,
        wasmSizeBytes: outcome.wasmSizeBytes,
        cachedCompile: cached,
        truncated: false,
        errorMessage: 'Execution interrupted by user.',
        commandLine: outcome.commandLine,
      };
    }

    const r = exec.response;
    return {
      status: r.status,
      stdout: r.stdout,
      stderr: r.stderr,
      compileStderr: outcome.compileStderr,
      diagnostics: outcome.diagnostics,
      exitCode: r.exitCode,
      compileTimeMs: outcome.compileTimeMs,
      executionTimeMs: r.executionTimeMs,
      wasmSizeBytes: outcome.wasmSizeBytes,
      cachedCompile: cached,
      truncated: r.truncated,
      errorMessage: r.errorMessage,
      commandLine: outcome.commandLine,
    };
  }

  public async runTestCases(
    files: Record<string, string>,
    entryFile: string,
    testCases: TestCaseInput[],
    config: CompilerConfig,
    onCaseComplete?: (outcome: TestCaseRunOutcome) => void
  ): Promise<TestCaseRunOutcome[]> {
    const results: TestCaseRunOutcome[] = [];
    this.activeRunCancelled = false;

    for (let i = 0; i < testCases.length; i += 1) {
      if (this.activeRunCancelled) break;
      const tc = testCases[i];
      const execResult = await this.run(files, entryFile, tc.stdin, config);

      let passed: boolean | null = null;
      if (execResult.status === 'success') {
        if (tc.expectedOutput.trim().length > 0) {
          passed =
            normalizeOutput(execResult.stdout) === normalizeOutput(tc.expectedOutput);
        } else {
          passed = true;
        }
      } else {
        passed = false;
      }

      const item: TestCaseRunOutcome = {
        testCaseId: tc.id,
        passed,
        result: execResult,
      };
      results.push(item);
      onCaseComplete?.(item);

      if (execResult.status === 'compile-error' || execResult.status === 'cancelled') {
        break;
      }
    }

    return results;
  }

  public cancel(): void {
    this.activeRunCancelled = true;
    if (this.activeRunReject) {
      this.activeRunReject();
      return;
    }
    if (this.activeCompileReject) {
      const rejectFn = this.activeCompileReject;
      this.activeCompileReject = null;
      if (this.compilerWorker) {
        this.compilerWorker.terminate();
        this.compilerWorker = null;
      }
      this.setStatus({
        phase: 'idle',
        loaded: false,
        progressPercent: null,
        message: 'Compiler stopped (will reload on next run)',
      });
      rejectFn(new Error('Cancelled'));
    }
  }

  public resetCompiler(): void {
    this.compiledCache = null;
    if (this.runnerWorker) {
      this.runnerWorker.terminate();
      this.runnerWorker = null;
    }
    if (this.compilerWorker) {
      this.compilerWorker.terminate();
      this.compilerWorker = null;
    }
    this.setStatus({
      phase: 'idle',
      loaded: false,
      progressPercent: null,
      clangVersion: null,
      message: 'Compiler unloaded (will lazy-load on next run)',
    });
  }
}

function normalizeOutput(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''))
    .join('\n')
    .trimEnd();
}

export const cppRuntime = new CppRuntimeManager();
