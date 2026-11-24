'use client';

import React, { useMemo, useState } from 'react';
import {
  Terminal,
  FileInput,
  SquareTerminal,
  AlertCircle,
  FlaskConical,
  Info,
  Copy,
  Check,
  Trash2,
  Play,
  Plus,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  BookmarkPlus,
} from 'lucide-react';
import { computeOutputDiff, visualizeWhitespace } from '@/lib/experiments/diff';
import type { CompilerConfig, CompilerRuntimeStatus, ExecutionResult } from '@/lib/compiler/types';
import type { TestCase, TestCaseRunResult } from '@/types/workspace';

export type BottomTabId =
  | 'terminal'
  | 'input'
  | 'output'
  | 'errors'
  | 'test-cases'
  | 'info';

interface BottomPanelProps {
  activeTab: BottomTabId;
  onTabChange: (tab: BottomTabId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  stdin: string;
  onStdinChange: (value: string) => void;
  onSaveStdinAsTestCase: () => void;
  result: ExecutionResult | null;
  runtimeStatus: CompilerRuntimeStatus;
  compilerConfig: CompilerConfig;
  isBusy: boolean;
  testCases: TestCase[];
  testResults: Record<string, TestCaseRunResult>;
  onAddTestCase: () => void;
  onDuplicateTestCase: (id: string) => void;
  onUpdateTestCase: (id: string, patch: Partial<TestCase>) => void;
  onDeleteTestCase: (id: string) => void;
  onLoadTestCaseToStdin: (id: string) => void;
  onAcceptActualOutput: (id: string) => void;
  onRunSingleTestCase: (id: string) => void;
  onRunAllTestCases: () => void;
  onClearOutput: () => void;
  onJumpToLocation: (file: string, line: number, column: number) => void;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function BottomPanel({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  stdin,
  onStdinChange,
  onSaveStdinAsTestCase,
  result,
  runtimeStatus,
  compilerConfig,
  isBusy,
  testCases,
  testResults,
  onAddTestCase,
  onDuplicateTestCase,
  onUpdateTestCase,
  onDeleteTestCase,
  onLoadTestCaseToStdin,
  onAcceptActualOutput,
  onRunSingleTestCase,
  onRunAllTestCases,
  onClearOutput,
  onJumpToLocation,
}: BottomPanelProps) {
  const [copied, setCopied] = useState(false);
  const [showRawCompileErr, setShowRawCompileErr] = useState(false);
  const [testFilter, setTestFilter] = useState<'all' | 'failed'>('all');
  const [showWhitespace, setShowWhitespace] = useState(false);

  const errorDiags =
    result?.diagnostics.filter((d) => d.severity === 'error') ?? [];
  const warningDiags =
    result?.diagnostics.filter((d) => d.severity === 'warning') ?? [];
  const totalDiagCount = errorDiags.length + warningDiags.length;

  const testSummary = useMemo(() => {
    let completed = 0;
    let passed = 0;
    let failed = 0;
    let totalExecMs = 0;
    for (const tc of testCases) {
      const outcome = testResults[tc.id];
      if (!outcome) continue;
      completed += 1;
      if (outcome.passed) passed += 1;
      else failed += 1;
      if (outcome.result.executionTimeMs !== null) {
        totalExecMs += outcome.result.executionTimeMs;
      }
    }
    return {
      completed,
      passed,
      failed,
      totalExecMs: Math.round(totalExecMs * 10) / 10,
    };
  }, [testCases, testResults]);

  const visibleTestCases = useMemo(() => {
    if (testFilter === 'all') return testCases;
    return testCases.filter((tc) => {
      const outcome = testResults[tc.id];
      return outcome && !outcome.passed;
    });
  }, [testCases, testResults, testFilter]);

  const handleCopyStdout = async () => {
    if (!result?.stdout) return;
    try {
      await navigator.clipboard.writeText(result.stdout);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable
    }
  };

  const tabs: Array<{
    id: BottomTabId;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
    badgeTone?: 'error' | 'warn' | 'neutral';
  }> = [
    {
      id: 'terminal',
      label: 'Terminal',
      icon: <Terminal className="w-3.5 h-3.5" />,
    },
    {
      id: 'input',
      label: 'Input (stdin)',
      icon: <FileInput className="w-3.5 h-3.5" />,
      badge: stdin.length > 0 ? `${stdin.split('\n').length}L` : undefined,
      badgeTone: 'neutral',
    },
    {
      id: 'output',
      label: 'Output (stdout)',
      icon: <SquareTerminal className="w-3.5 h-3.5" />,
    },
    {
      id: 'errors',
      label: 'Errors',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      badge:
        totalDiagCount > 0
          ? totalDiagCount
          : result?.status === 'compile-error' || result?.status === 'runtime-error'
            ? '!'
            : undefined,
      badgeTone:
        errorDiags.length > 0 ||
        result?.status === 'compile-error' ||
        result?.status === 'runtime-error'
          ? 'error'
          : 'warn',
    },
    {
      id: 'test-cases',
      label: 'Test Cases',
      icon: <FlaskConical className="w-3.5 h-3.5" />,
      badge:
        testSummary.completed > 0
          ? `${testSummary.passed}/${testCases.length}`
          : testCases.length,
      badgeTone: testSummary.failed > 0 ? 'error' : 'neutral',
    },
    {
      id: 'info',
      label: 'Execution Info',
      icon: <Info className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0d0d11] border-t border-white/[0.08]">
      {/* Tab Bar */}
      <div className="flex items-center justify-between h-9 px-2 bg-[#101014] border-b border-white/[0.08] shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id && !collapsed;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  onTabChange(tab.id);
                  if (collapsed) onToggleCollapse();
                }}
                className={`flex items-center gap-1.5 h-7 px-2.5 rounded text-xs font-medium transition-colors shrink-0 ${
                  isActive
                    ? 'bg-white/[0.08] text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0 rounded-full text-[10px] font-mono ${
                      tab.badgeTone === 'error'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : tab.badgeTone === 'warn'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-white/[0.07] text-zinc-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          {result && (
            <span
              className={`hidden md:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded border ${
                result.status === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : result.status === 'compile-error'
                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                    : result.status === 'runtime-error'
                      ? 'border-orange-500/30 bg-orange-500/10 text-orange-300'
                      : result.status === 'timeout'
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                        : 'border-zinc-700 bg-zinc-800/70 text-zinc-300'
              }`}
            >
              {result.status}
              {result.executionTimeMs !== null ? ` · ${result.executionTimeMs}ms` : ''}
            </span>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
            title={collapsed ? 'Expand bottom panel' : 'Collapse bottom panel'}
          >
            {collapsed ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {!collapsed && (
        <div className="flex-1 min-h-0 overflow-auto">
          {activeTab === 'terminal' && (
            <div className="h-full flex flex-col p-3 font-mono text-xs leading-relaxed">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/[0.06]">
                <span className="text-zinc-500 truncate">
                  {result
                    ? `$ ${result.commandLine}`
                    : `$ clang++ -std=${compilerConfig.std} ${compilerConfig.optLevel} -fno-exceptions main.cpp -o program.wasm`}
                </span>
                {result && (
                  <button
                    type="button"
                    onClick={onClearOutput}
                    className="flex items-center gap-1 text-[11px] font-sans text-zinc-400 hover:text-zinc-200 px-2 py-0.5 rounded hover:bg-white/[0.05]"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>

              {isBusy ? (
                <div className="text-sky-300 animate-pulse">
                  {runtimeStatus.message}
                  {runtimeStatus.progressPercent !== null &&
                  runtimeStatus.phase === 'loading-compiler'
                    ? ` (${runtimeStatus.progressPercent}%)`
                    : ''}
                </div>
              ) : !result ? (
                <div className="text-zinc-500">
                  Press <span className="text-zinc-300">Run</span> (or{' '}
                  <span className="text-zinc-300">Ctrl+Enter</span>) to compile and execute C++17 locally in your browser via WebAssembly.
                </div>
              ) : (
                <div className="space-y-2">
                  {result.status === 'compile-error' && (
                    <div className="text-rose-300 whitespace-pre-wrap">
                      <div className="text-rose-400 font-semibold mb-1">
                        [Compilation Error]
                      </div>
                      {result.compileStderr || result.errorMessage}
                    </div>
                  )}

                  {result.status !== 'compile-error' && result.compileStderr && (
                    <div className="text-amber-300/90 whitespace-pre-wrap border-l-2 border-amber-500/40 pl-2">
                      {result.compileStderr}
                    </div>
                  )}

                  {result.stdout.length > 0 && (
                    <pre className="text-zinc-100 whitespace-pre-wrap break-words">
                      {result.stdout}
                    </pre>
                  )}

                  {result.stderr.length > 0 && (
                    <pre className="text-orange-300 whitespace-pre-wrap break-words">
                      {result.stderr}
                    </pre>
                  )}

                  {result.status === 'success' && result.stdout.length === 0 && (
                    <div className="text-zinc-500 italic">(no output on stdout)</div>
                  )}

                  {result.errorMessage && result.status !== 'compile-error' && (
                    <div className="text-orange-300 bg-orange-500/10 border border-orange-500/25 rounded px-2.5 py-1.5">
                      {result.errorMessage}
                    </div>
                  )}

                  {result.truncated && (
                    <div className="text-amber-300 text-[11px]">
                      Output truncated at 512 KB safety limit.
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/[0.06] text-[11px] text-zinc-500 flex flex-wrap gap-4">
                    <span>
                      Compile:{' '}
                      <span className="text-zinc-300">
                        {result.cachedCompile ? 'cached (0ms)' : `${result.compileTimeMs}ms`}
                      </span>
                    </span>
                    {result.executionTimeMs !== null && (
                      <span>
                        Run:{' '}
                        <span className="text-zinc-300">{result.executionTimeMs}ms</span>
                      </span>
                    )}
                    {result.exitCode !== null && (
                      <span>
                        Exit code:{' '}
                        <span
                          className={
                            result.exitCode === 0 ? 'text-emerald-400' : 'text-rose-400'
                          }
                        >
                          {result.exitCode}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'input' && (
            <div className="h-full flex flex-col p-3 gap-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>
                  Custom Standard Input (<code className="font-mono text-zinc-300">std::cin</code>)
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-zinc-500">
                    {stdin.length} chars
                  </span>
                  <button
                    type="button"
                    onClick={onSaveStdinAsTestCase}
                    className="flex items-center gap-1 text-[11px] text-sky-300 hover:text-sky-200 px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/25"
                    title="Create a test case from this input"
                  >
                    <BookmarkPlus className="w-3 h-3" />
                    Save as Test Case
                  </button>
                  {stdin.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onStdinChange('')}
                      className="text-[11px] text-zinc-400 hover:text-zinc-200 px-2 py-0.5 rounded hover:bg-white/[0.06]"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <textarea
                aria-label="Standard Input (stdin)"
                value={stdin}
                onChange={(e) => onStdinChange(e.target.value)}
                placeholder="Enter stdin lines passed to your C++ program (e.g. array size and elements)..."
                spellCheck={false}
                className="flex-1 w-full resize-none rounded-md bg-[#09090c] border border-white/[0.08] focus:border-sky-500/50 outline-none p-2.5 font-mono text-xs text-zinc-100 placeholder:text-zinc-600"
              />
            </div>
          )}

          {activeTab === 'output' && (
            <div className="h-full flex flex-col p-3 gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">
                  Program Output (<code className="font-mono text-zinc-300">stdout</code>)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyStdout}
                    disabled={!result?.stdout}
                    className="flex items-center gap-1 text-[11px] text-zinc-300 disabled:text-zinc-600 px-2 py-1 rounded hover:bg-white/[0.06] disabled:hover:bg-transparent"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onClearOutput}
                    disabled={!result}
                    className="flex items-center gap-1 text-[11px] text-zinc-400 disabled:text-zinc-600 hover:text-zinc-200 px-2 py-1 rounded hover:bg-white/[0.06]"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear
                  </button>
                </div>
              </div>
              <div className="flex-1 rounded-md bg-[#09090c] border border-white/[0.08] p-2.5 font-mono text-xs overflow-auto">
                {!result ? (
                  <span className="text-zinc-600">No execution output yet.</span>
                ) : result.status === 'compile-error' ? (
                  <span className="text-rose-400">
                    Compilation failed — see the Errors tab for diagnostics.
                  </span>
                ) : (
                  <div className="space-y-2">
                    <pre className="text-zinc-100 whitespace-pre-wrap break-words">
                      {result.stdout.length > 0 ? result.stdout : '(empty stdout)'}
                    </pre>
                    {result.stderr && (
                      <div className="pt-2 border-t border-white/[0.06]">
                        <div className="text-[11px] text-orange-400 mb-1">stderr:</div>
                        <pre className="text-orange-200 whitespace-pre-wrap break-words">
                          {result.stderr}
                        </pre>
                      </div>
                    )}
                    {result.errorMessage && (
                      <div className="text-orange-300 bg-orange-500/10 border border-orange-500/25 rounded px-2 py-1">
                        {result.errorMessage}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'errors' && (
            <div className="h-full flex flex-col p-3 gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-300 font-medium">
                    Diagnostics & Runtime Errors
                  </span>
                  {result?.status === 'compile-error' && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[11px]">
                      Compilation Error
                    </span>
                  )}
                  {(result?.status === 'runtime-error' || result?.status === 'timeout') && (
                    <span className="px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-300 border border-orange-500/30 text-[11px]">
                      {result.status === 'timeout' ? 'Execution Timeout' : 'Runtime Error'}
                    </span>
                  )}
                </div>
                {result?.compileStderr && (
                  <button
                    type="button"
                    onClick={() => setShowRawCompileErr((v) => !v)}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200 px-2 py-0.5 rounded border border-white/[0.08]"
                  >
                    {showRawCompileErr ? 'Structured View' : 'Raw Clang Output'}
                  </button>
                )}
              </div>

              {!result ? (
                <div className="text-xs text-zinc-500">
                  No compilation or runtime diagnostics.
                </div>
              ) : showRawCompileErr && result.compileStderr ? (
                <pre className="flex-1 rounded bg-[#09090c] border border-white/[0.08] p-2.5 font-mono text-xs text-rose-200 whitespace-pre-wrap overflow-auto">
                  {result.compileStderr}
                </pre>
              ) : (
                <div className="space-y-1.5 overflow-auto">
                  {result.status === 'runtime-error' || result.status === 'timeout' ? (
                    <div className="p-2.5 rounded-md bg-orange-500/10 border border-orange-500/25 text-xs text-orange-200 space-y-1">
                      <div className="font-medium text-orange-300">
                        {result.errorMessage ?? 'Runtime error'}
                      </div>
                      {result.stderr && (
                        <pre className="font-mono text-[11px] text-orange-200/90 whitespace-pre-wrap">
                          {result.stderr}
                        </pre>
                      )}
                    </div>
                  ) : null}

                  {result.diagnostics.length > 0 ? (
                    result.diagnostics.map((d, idx) => (
                      <button
                        key={`${d.file}-${d.line}-${d.column}-${idx}`}
                        type="button"
                        onClick={() => onJumpToLocation(d.file, d.line, d.column)}
                        className="w-full text-left flex items-start gap-2.5 p-2 rounded-md bg-[#121217] hover:bg-[#191920] border border-white/[0.06] transition-colors"
                      >
                        {d.severity === 'error' ? (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-mono text-sky-300">
                              {d.file}:{d.line}:{d.column}
                            </span>
                            <span
                              className={`text-[10px] uppercase tracking-wider font-medium ${
                                d.severity === 'error'
                                  ? 'text-rose-400'
                                  : d.severity === 'warning'
                                    ? 'text-amber-400'
                                    : 'text-zinc-400'
                              }`}
                            >
                              {d.severity}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-200 mt-0.5 break-words">
                            {d.message}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : result.status === 'compile-error' ? (
                    <pre className="rounded bg-[#09090c] border border-white/[0.08] p-2.5 font-mono text-xs text-rose-200 whitespace-pre-wrap">
                      {result.compileStderr || result.errorMessage}
                    </pre>
                  ) : result.status === 'success' ? (
                    <div className="flex items-center gap-2 text-xs text-emerald-400 py-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Compiled and executed cleanly with 0 errors.</span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {activeTab === 'test-cases' && (
            <div className="h-full flex flex-col p-3 gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  {testSummary.completed > 0 ? (
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white/[0.06] text-zinc-200">
                      <span className="text-emerald-300">{testSummary.passed} passed</span>
                      {testSummary.failed > 0 && (
                        <span className="text-rose-300"> · {testSummary.failed} failed</span>
                      )}
                      <span className="text-zinc-400"> · {testSummary.totalExecMs}ms</span>
                    </span>
                  ) : (
                    <span className="text-zinc-400">
                      Compile once, run sequentially against multiple custom test cases
                    </span>
                  )}

                  {testSummary.failed > 0 && (
                    <div className="flex items-center rounded bg-white/[0.05] p-0.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setTestFilter('all')}
                        className={`px-2 py-0.5 rounded ${
                          testFilter === 'all' ? 'bg-white/[0.1] text-zinc-100' : 'text-zinc-400'
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setTestFilter('failed')}
                        className={`px-2 py-0.5 rounded ${
                          testFilter === 'failed' ? 'bg-rose-500/20 text-rose-200' : 'text-zinc-400'
                        }`}
                      >
                        Failed
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-[11px] text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showWhitespace}
                      onChange={(e) => setShowWhitespace(e.target.checked)}
                      className="accent-sky-400"
                    />
                    Whitespace
                  </label>
                  <button
                    type="button"
                    onClick={onAddTestCase}
                    className="flex items-center gap-1 h-7 px-2.5 rounded text-xs bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Case
                  </button>
                  <button
                    type="button"
                    onClick={onRunAllTestCases}
                    disabled={isBusy || testCases.length === 0}
                    className="flex items-center gap-1 h-7 px-2.5 rounded text-xs bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-500/30 disabled:opacity-40 transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    Run All ({testCases.length})
                  </button>
                </div>
              </div>

              <div className="space-y-2 overflow-auto pb-2">
                {visibleTestCases.map((tc) => {
                  const outcome = testResults[tc.id];
                  const showDiff =
                    outcome &&
                    outcome.result.status === 'success' &&
                    tc.expectedOutput.trim().length > 0 &&
                    outcome.passed === false;
                  const diff = showDiff
                    ? computeOutputDiff(tc.expectedOutput, outcome.result.stdout)
                    : null;

                  return (
                    <div
                      key={tc.id}
                      className="rounded-md bg-[#121217] border border-white/[0.07] p-2.5 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            value={tc.name}
                            onChange={(e) =>
                              onUpdateTestCase(tc.id, { name: e.target.value })
                            }
                            className="bg-transparent text-xs font-medium text-zinc-100 outline-none border-b border-transparent focus:border-sky-500/50 w-36"
                          />
                          {outcome && (
                            <span
                              className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${
                                outcome.passed === true
                                  ? 'bg-emerald-500/15 text-emerald-300'
                                  : 'bg-rose-500/15 text-rose-300'
                              }`}
                            >
                              {outcome.result.status !== 'success'
                                ? outcome.result.status
                                : outcome.passed
                                  ? 'PASS'
                                  : 'MISMATCH'}
                              {outcome.result.executionTimeMs !== null
                                ? ` (${outcome.result.executionTimeMs}ms)`
                                : ''}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onLoadTestCaseToStdin(tc.id)}
                            className="flex items-center gap-1 h-6 px-2 rounded text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]"
                            title="Load this input into the Input (stdin) tab"
                          >
                            <ArrowUpRight className="w-3 h-3" />
                            To stdin
                          </button>
                          <button
                            type="button"
                            onClick={() => onDuplicateTestCase(tc.id)}
                            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]"
                            title="Duplicate test case"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRunSingleTestCase(tc.id)}
                            disabled={isBusy}
                            className="flex items-center gap-1 h-6 px-2 rounded text-[11px] bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 disabled:opacity-40"
                          >
                            <Play className="w-3 h-3" />
                            Run
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTestCase(tc.id)}
                            disabled={testCases.length <= 1}
                            className="p-1 rounded text-zinc-500 hover:text-rose-400 disabled:opacity-30"
                            title="Delete test case"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                            stdin
                          </div>
                          <textarea
                            rows={2}
                            value={tc.stdin}
                            onChange={(e) =>
                              onUpdateTestCase(tc.id, { stdin: e.target.value })
                            }
                            placeholder="Input for this case..."
                            className="w-full rounded bg-[#09090c] border border-white/[0.07] p-1.5 font-mono text-[11px] text-zinc-200 outline-none focus:border-sky-500/40 resize-y"
                          />
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                            Expected stdout (optional)
                          </div>
                          <textarea
                            rows={2}
                            value={tc.expectedOutput}
                            onChange={(e) =>
                              onUpdateTestCase(tc.id, {
                                expectedOutput: e.target.value,
                              })
                            }
                            placeholder="Leave blank to inspect actual output..."
                            className="w-full rounded bg-[#09090c] border border-white/[0.07] p-1.5 font-mono text-[11px] text-zinc-200 outline-none focus:border-sky-500/40 resize-y"
                          />
                        </div>
                      </div>

                      {outcome && (
                        <div className="rounded bg-[#09090c] border border-white/[0.06] p-2 font-mono text-[11px] space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-500">
                              {diff ? 'Expected vs Actual Diff:' : 'Actual output:'}
                            </span>
                            {outcome.result.status === 'success' &&
                              outcome.passed === false && (
                                <button
                                  type="button"
                                  onClick={() => onAcceptActualOutput(tc.id)}
                                  className="text-[10px] font-sans text-sky-400 hover:text-sky-300"
                                >
                                  Use Actual as Expected
                                </button>
                              )}
                          </div>

                          {diff ? (
                            <div className="space-y-0.5 max-h-40 overflow-auto">
                              {diff.rows.map((row) => {
                                const expText =
                                  row.expected !== null
                                    ? showWhitespace
                                      ? visualizeWhitespace(row.expected)
                                      : row.expected
                                    : '(missing)';
                                const actText =
                                  row.actual !== null
                                    ? showWhitespace
                                      ? visualizeWhitespace(row.actual)
                                      : row.actual
                                    : '(missing)';
                                return (
                                  <div
                                    key={row.lineNumber}
                                    className={`grid grid-cols-12 gap-2 px-1.5 py-0.5 rounded ${
                                      row.kind === 'equal'
                                        ? 'text-zinc-400'
                                        : 'bg-rose-500/10 text-zinc-200'
                                    }`}
                                  >
                                    <span className="col-span-1 text-zinc-600">
                                      L{row.lineNumber}
                                    </span>
                                    <span className="col-span-5 truncate text-emerald-300/90">
                                      - {expText}
                                    </span>
                                    <span className="col-span-6 truncate text-rose-300/90">
                                      + {actText}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <pre className="text-zinc-200 whitespace-pre-wrap">
                              {outcome.result.status === 'compile-error'
                                ? outcome.result.compileStderr
                                : (() => {
                                    const txt =
                                      outcome.result.stdout ||
                                      outcome.result.errorMessage ||
                                      '(empty)';
                                    return showWhitespace && outcome.result.stdout
                                      ? visualizeWhitespace(txt)
                                      : txt;
                                  })()}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'info' && (
            <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 rounded bg-[#121217] border border-white/[0.06]">
                <div className="text-zinc-500 text-[11px]">Toolchain</div>
                <div className="font-mono text-zinc-200 mt-0.5 truncate">
                  {runtimeStatus.clangVersion ?? 'Clang/LLVM 22 (WASM)'}
                </div>
              </div>
              <div className="p-2.5 rounded bg-[#121217] border border-white/[0.06]">
                <div className="text-zinc-500 text-[11px]">Target & Standard</div>
                <div className="font-mono text-zinc-200 mt-0.5">
                  wasm32-wasip1 · {compilerConfig.std} · {compilerConfig.optLevel}
                </div>
              </div>
              <div className="p-2.5 rounded bg-[#121217] border border-white/[0.06]">
                <div className="text-zinc-500 text-[11px]">Compile / Run Time</div>
                <div className="font-mono text-zinc-200 mt-0.5">
                  {result
                    ? `${result.cachedCompile ? '0ms (cached)' : `${result.compileTimeMs}ms`} / ${
                        result.executionTimeMs !== null ? `${result.executionTimeMs}ms` : '—'
                      }`
                    : '—'}
                </div>
              </div>
              <div className="p-2.5 rounded bg-[#121217] border border-white/[0.06]">
                <div className="text-zinc-500 text-[11px]">Binary Size / Limit</div>
                <div className="font-mono text-zinc-200 mt-0.5">
                  {formatBytes(result?.wasmSizeBytes ?? null)} / {compilerConfig.memoryLimitMb} MB
                </div>
              </div>
              <div className="col-span-2 md:col-span-4 p-2.5 rounded bg-[#121217] border border-white/[0.06] text-[11px] text-zinc-400 leading-relaxed">
                Execution runs 100% locally inside your browser using two isolated Web Workers (Clang/LLVM WASI compiler + <code className="text-zinc-300">@bjorn3/browser_wasi_shim</code> runner). Compiled with <code className="text-zinc-300">-fno-exceptions</code> for WASI compatibility; STL headers (<code className="text-zinc-300">&lt;iostream&gt;</code>, <code className="text-zinc-300">&lt;vector&gt;</code>, <code className="text-zinc-300">&lt;algorithm&gt;</code>, <code className="text-zinc-300">&lt;map&gt;</code>, <code className="text-zinc-300">&lt;set&gt;</code>, <code className="text-zinc-300">&lt;unordered_map&gt;</code>, <code className="text-zinc-300">&lt;queue&gt;</code>, <code className="text-zinc-300">&lt;stack&gt;</code>) are bundled in the browser sysroot.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
