/// <reference lib="webworker" />

import { parseClangDiagnostics } from '../lib/compiler/diagnostics';
import type {
  CompilerWorkerRequest,
  CompilerWorkerResponse,
  CompileOutcome,
} from '../lib/compiler/types';

interface YoWaspModule {
  runClang: (
    args?: string[] | null,
    files?: Record<string, string | Uint8Array>,
    options?: {
      stdout?: ((bytes: Uint8Array | null) => void) | null;
      stderr?: ((bytes: Uint8Array | null) => void) | null;
      fetchProgress?: (event: {
        source: object;
        totalLength: number;
        doneLength: number;
      }) => void;
    }
  ) => Promise<Record<string, Uint8Array | string>>;
  Exit: new (...args: unknown[]) => Error & { code: number };
  version?: string;
}

const SOURCE_FILE_RE = /\.(cpp|cc|cxx|c)$/i;

let clangModulePromise: Promise<YoWaspModule> | null = null;
let cachedClangVersion: string | null = null;
let lastReportedPercent = -1;

function post(message: CompilerWorkerResponse, transfer?: Transferable[]) {
  if (transfer && transfer.length > 0) {
    self.postMessage(message, transfer);
  } else {
    self.postMessage(message);
  }
}

async function ensureClangLoaded(): Promise<YoWaspModule> {
  if (!clangModulePromise) {
    clangModulePromise = (async () => {
      post({
        type: 'status',
        phase: 'loading-compiler',
        progressPercent: 0,
        clangVersion: cachedClangVersion,
        message: 'Fetching Clang/LLVM WebAssembly toolchain...',
      });

      const bundleUrl = new URL('/compiler/bundle.js', self.location.origin).href;
      const mod = (await import(
        /* webpackIgnore: true */ /* turbopackIgnore: true */ bundleUrl
      )) as YoWaspModule;

      const dec = new TextDecoder();
      let verOut = '';
      await mod.runClang(['clang++', '--version'], {}, {
        stdout: (bytes) => {
          if (bytes) verOut += dec.decode(bytes, { stream: true });
        },
        stderr: (bytes) => {
          if (bytes) verOut += dec.decode(bytes, { stream: true });
        },
        fetchProgress: ({ totalLength, doneLength }) => {
          if (totalLength > 0) {
            const pct = Math.min(100, Math.round((doneLength / totalLength) * 100));
            if (pct !== lastReportedPercent) {
              lastReportedPercent = pct;
              post({
                type: 'status',
                phase: 'loading-compiler',
                progressPercent: pct,
                clangVersion: null,
                message: `Loading Clang/LLVM WASM (${pct}%)...`,
              });
            }
          }
        },
      });
      verOut += dec.decode();

      const firstLine = verOut.split(/\r?\n/)[0]?.trim() || mod.version || 'Clang WASM';
      cachedClangVersion = firstLine;

      post({
        type: 'status',
        phase: 'ready',
        progressPercent: 100,
        clangVersion: cachedClangVersion,
        message: 'Clang/LLVM WASM ready',
      });

      return mod;
    })().catch((err) => {
      clangModulePromise = null;
      lastReportedPercent = -1;
      throw err;
    });
  }

  return clangModulePromise;
}

self.onmessage = async (event: MessageEvent<CompilerWorkerRequest>) => {
  const msg = event.data;

  if (msg.type === 'preload') {
    try {
      await ensureClangLoaded();
      post({
        type: 'preload-result',
        requestId: msg.requestId,
        ok: true,
        clangVersion: cachedClangVersion,
      });
    } catch (err) {
      post({
        type: 'preload-result',
        requestId: msg.requestId,
        ok: false,
        clangVersion: cachedClangVersion,
        errorMessage:
          err instanceof Error ? err.message : 'Failed to initialize Clang WASM',
      });
    }
    return;
  }

  if (msg.type === 'compile') {
    const t0 = performance.now();
    const { requestId, files, entryFile, config } = msg;

    const sourceFiles = Object.keys(files).filter((name) => SOURCE_FILE_RE.test(name));
    if (sourceFiles.length === 0 && files[entryFile] !== undefined) {
      sourceFiles.push(entryFile);
    }

    const maxMemoryBytes = config.memoryLimitMb * 1024 * 1024;
    const args = [
      'clang++',
      `-std=${config.std}`,
      config.optLevel,
      '-fno-exceptions',
      '-Wall',
      '-Wextra',
      ...sourceFiles,
      '-o',
      'program.wasm',
      `-Wl,--max-memory=${maxMemoryBytes}`,
    ];
    const commandLine = args.join(' ');

    try {
      const clang = await ensureClangLoaded();

      post({
        type: 'status',
        phase: 'compiling',
        progressPercent: 100,
        clangVersion: cachedClangVersion,
        message: `Compiling with ${config.std}...`,
      });

      const compileStart = performance.now();
      const decOut = new TextDecoder();
      const decErr = new TextDecoder();
      let compileStdout = '';
      let compileStderr = '';

      try {
        const outFiles = await clang.runClang(args, files, {
          stdout: (bytes) => {
            if (bytes) compileStdout += decOut.decode(bytes, { stream: true });
          },
          stderr: (bytes) => {
            if (bytes) compileStderr += decErr.decode(bytes, { stream: true });
          },
          fetchProgress: () => {},
        });

        compileStdout += decOut.decode();
        compileStderr += decErr.decode();

        const combinedErr = [compileStderr, compileStdout].filter(Boolean).join('\n').trim();
        const wasmEntry = outFiles['program.wasm'];
        const compileTimeMs = Math.round(performance.now() - compileStart);

        if (!(wasmEntry instanceof Uint8Array)) {
          const outcome: CompileOutcome = {
            ok: false,
            compileStderr: combinedErr || 'Compiler did not produce program.wasm.',
            diagnostics: parseClangDiagnostics(combinedErr),
            compileTimeMs,
            errorMessage: 'Compilation produced no WebAssembly binary.',
            commandLine,
          };
          post({ type: 'compile-result', requestId, outcome });
          return;
        }

        // Copy into a clean standalone ArrayBuffer so transferring never mutates internal views
        const wasmCopy = new Uint8Array(wasmEntry.byteLength);
        wasmCopy.set(wasmEntry);

        post({
          type: 'status',
          phase: 'ready',
          progressPercent: 100,
          clangVersion: cachedClangVersion,
          message: 'Clang/LLVM WASM ready',
        });

        post(
          {
            type: 'compile-result',
            requestId,
            outcome: {
              ok: true,
              wasmBuffer: wasmCopy.buffer,
              compileStderr: combinedErr,
              diagnostics: parseClangDiagnostics(combinedErr),
              compileTimeMs,
              wasmSizeBytes: wasmCopy.byteLength,
              commandLine,
            },
          },
          [wasmCopy.buffer]
        );
      } catch (compileErr) {
        compileStdout += decOut.decode();
        compileStderr += decErr.decode();
        const combinedErr = [compileStderr, compileStdout].filter(Boolean).join('\n').trim();
        const compileTimeMs = Math.round(performance.now() - compileStart);

        post({
          type: 'status',
          phase: 'ready',
          progressPercent: 100,
          clangVersion: cachedClangVersion,
          message: 'Clang/LLVM WASM ready',
        });

        const isCompilerExit =
          compileErr instanceof clang.Exit ||
          (typeof compileErr === 'object' &&
            compileErr !== null &&
            'code' in compileErr);

        const errorMessage = isCompilerExit
          ? 'Compilation failed'
          : compileErr instanceof Error
            ? compileErr.message
            : 'Unexpected compiler failure';

        post({
          type: 'compile-result',
          requestId,
          outcome: {
            ok: false,
            compileStderr: combinedErr || errorMessage,
            diagnostics: parseClangDiagnostics(combinedErr),
            compileTimeMs,
            errorMessage,
            commandLine,
          },
        });
      }
    } catch (initErr) {
      const compileTimeMs = Math.round(performance.now() - t0);
      const errMsg =
        initErr instanceof Error
          ? initErr.message
          : 'Failed to load Clang/LLVM WebAssembly runtime';

      post({
        type: 'compile-result',
        requestId,
        outcome: {
          ok: false,
          compileStderr: errMsg,
          diagnostics: [],
          compileTimeMs,
          errorMessage: errMsg,
          commandLine,
        },
      });
    }
  }
};
