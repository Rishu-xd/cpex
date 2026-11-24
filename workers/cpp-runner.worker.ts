/// <reference lib="webworker" />

import {
  ConsoleStdout,
  File,
  OpenFile,
  PreopenDirectory,
  WASI,
} from '@bjorn3/browser_wasi_shim';
import type {
  RunnerWorkerRequest,
  RunnerWorkerResponse,
} from '../lib/compiler/types';

const MAX_OUTPUT_BYTES = 512 * 1024;

class OutputLimitError extends Error {
  constructor() {
    super('Program output exceeded 512 KB limit and was truncated.');
  }
}

function formatWasmTrap(err: unknown): string {
  if (err instanceof OutputLimitError) {
    return err.message;
  }
  if (err instanceof WebAssembly.RuntimeError) {
    const msg = err.message.toLowerCase();
    if (msg.includes('unreachable')) {
      return 'Runtime trap: unreachable instruction executed (std::abort(), failed assertion, or missing return in non-void function).';
    }
    if (msg.includes('out of bounds')) {
      return 'Runtime trap: memory access out of bounds (null pointer dereference, out-of-range access, or memory limit exceeded).';
    }
    if (msg.includes('divide by zero')) {
      return 'Runtime trap: integer division or modulo by zero.';
    }
    if (msg.includes('integer overflow') || msg.includes('invalid conversion')) {
      return 'Runtime trap: arithmetic overflow or invalid integer conversion.';
    }
    if (msg.includes('call stack exhausted')) {
      return 'Runtime trap: call stack exhausted (infinite recursion or stack overflow).';
    }
    return `WebAssembly runtime trap: ${err.message}`;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

self.onmessage = async (event: MessageEvent<RunnerWorkerRequest>) => {
  const msg = event.data;
  if (msg.type !== 'execute') return;

  const { requestId, wasmBuffer, stdin } = msg;
  const decOut = new TextDecoder('utf-8', { fatal: false });
  const decErr = new TextDecoder('utf-8', { fatal: false });

  let stdout = '';
  let stderr = '';
  let totalBytes = 0;
  let truncated = false;

  const appendBytes = (target: 'stdout' | 'stderr', chunk: Uint8Array) => {
    const remaining = MAX_OUTPUT_BYTES - totalBytes;
    if (remaining <= 0) {
      truncated = true;
      throw new OutputLimitError();
    }
    const slice = chunk.byteLength > remaining ? chunk.subarray(0, remaining) : chunk;
    totalBytes += slice.byteLength;
    if (target === 'stdout') {
      stdout += decOut.decode(slice, { stream: true });
    } else {
      stderr += decErr.decode(slice, { stream: true });
    }
    if (chunk.byteLength > remaining) {
      truncated = true;
      throw new OutputLimitError();
    }
  };

  try {
    const stdinBytes = new TextEncoder().encode(stdin);
    const fds = [
      new OpenFile(new File(stdinBytes)),
      new ConsoleStdout((chunk) => appendBytes('stdout', chunk)),
      new ConsoleStdout((chunk) => appendBytes('stderr', chunk)),
      new PreopenDirectory('.', new Map()),
    ];

    const wasi = new WASI(['program.wasm'], [], fds);
    const wasmModule = await WebAssembly.compile(wasmBuffer);
    const instance = await WebAssembly.instantiate(wasmModule, {
      wasi_snapshot_preview1: wasi.wasiImport,
    });

    const t0 = performance.now();
    let exitCode: number | null = null;
    let trapError: unknown = null;

    try {
      exitCode = wasi.start(
        instance as unknown as {
          exports: { memory: WebAssembly.Memory; _start: () => unknown };
        }
      );
    } catch (err) {
      trapError = err;
    }

    const executionTimeMs = Math.max(0, Math.round((performance.now() - t0) * 10) / 10);
    stdout += decOut.decode();
    stderr += decErr.decode();

    if (trapError !== null) {
      const errorMessage = formatWasmTrap(trapError);
      const response: RunnerWorkerResponse = {
        type: 'execute-result',
        requestId,
        status: 'runtime-error',
        stdout,
        stderr,
        exitCode,
        executionTimeMs,
        truncated,
        errorMessage,
      };
      self.postMessage(response);
      return;
    }

    const isSuccess = exitCode === 0;
    const response: RunnerWorkerResponse = {
      type: 'execute-result',
      requestId,
      status: isSuccess ? 'success' : 'runtime-error',
      stdout,
      stderr,
      exitCode,
      executionTimeMs,
      truncated,
      errorMessage: isSuccess ? null : `Program exited with non-zero status ${exitCode}`,
    };
    self.postMessage(response);
  } catch (err) {
    stdout += decOut.decode();
    stderr += decErr.decode();
    const response: RunnerWorkerResponse = {
      type: 'execute-result',
      requestId,
      status: 'runtime-error',
      stdout,
      stderr,
      exitCode: null,
      executionTimeMs: 0,
      truncated,
      errorMessage: formatWasmTrap(err),
    };
    self.postMessage(response);
  }
};
