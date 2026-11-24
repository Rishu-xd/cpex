'use client';

import React from 'react';
import {
  Boxes,
  Cpu,
  Gauge,
  Keyboard,
  PanelRightClose,
  Play,
  FlaskConical,
  Save,
  Square,
  Download,
  RotateCcw,
  NotebookPen,
  GitBranch,
  GitCompare,
} from 'lucide-react';
import type {
  CompilerConfig,
  CompilerRuntimeStatus,
  ExecutionResult,
} from '@/lib/compiler/types';
import type { AlgorithmId, DataStructureId } from '@/lib/dsa/types';
import { DsaToolkitPanel } from '../visualizer/DsaToolkitPanel';

interface RightPanelProps {
  onCollapse: () => void;
  panelMode: 'inspector' | 'dsa';
  onPanelModeChange: (mode: 'inspector' | 'dsa') => void;
  dsaMode: 'structures' | 'algorithms';
  structureId: DataStructureId;
  algorithmId: AlgorithmId;
  onDsaModeChange: (mode: 'structures' | 'algorithms') => void;
  onSelectStructure: (id: DataStructureId) => void;
  onSelectAlgorithm: (id: AlgorithmId) => void;
  onExpandDsa: () => void;
  onCopyToStdin: (stdinText: string) => void;
  runtimeStatus: CompilerRuntimeStatus;
  compilerConfig: CompilerConfig;
  lastResult: ExecutionResult | null;
  isBusy: boolean;
  notes: string;
  onNotesChange: (value: string) => void;
  versionsCount: number;
  testPassSummary: { passed: number; total: number } | null;
  onCreateSnapshot: () => void;
  onOpenCompare: () => void;
  onPreloadCompiler: () => void;
  onResetCompiler: () => void;
  onRun: () => void;
  onStop: () => void;
  onRunAllTests: () => void;
  onSave: () => void;
}

export function RightPanel({
  onCollapse,
  panelMode,
  onPanelModeChange,
  dsaMode,
  structureId,
  algorithmId,
  onDsaModeChange,
  onSelectStructure,
  onSelectAlgorithm,
  onExpandDsa,
  onCopyToStdin,
  runtimeStatus,
  compilerConfig,
  lastResult,
  isBusy,
  notes,
  onNotesChange,
  versionsCount,
  testPassSummary,
  onCreateSnapshot,
  onOpenCompare,
  onPreloadCompiler,
  onResetCompiler,
  onRun,
  onStop,
  onRunAllTests,
  onSave,
}: RightPanelProps) {
  return (
    <div className="flex flex-col h-full bg-[#101014] border-l border-white/[0.08] select-none">
      <div className="flex items-center justify-between h-9 px-2.5 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-1 bg-[#0b0b0f] p-0.5 rounded border border-white/[0.06] text-[11px]">
          <button
            type="button"
            onClick={() => onPanelModeChange('inspector')}
            className={`px-2 py-0.5 rounded transition-colors ${
              panelMode === 'inspector'
                ? 'bg-white/[0.1] text-zinc-100 font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Inspector
          </button>
          <button
            type="button"
            onClick={() => onPanelModeChange('dsa')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
              panelMode === 'dsa'
                ? 'bg-sky-500/20 text-sky-200 font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Boxes className="w-3 h-3" />
            <span>DSA Lab</span>
          </button>
        </div>
        <button
          type="button"
          onClick={onCollapse}
          className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06]"
          title="Collapse right panel"
        >
          <PanelRightClose className="w-3.5 h-3.5" />
        </button>
      </div>

      {panelMode === 'dsa' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <DsaToolkitPanel
            mode={dsaMode}
            structureId={structureId}
            algorithmId={algorithmId}
            expanded={false}
            onModeChange={onDsaModeChange}
            onSelectStructure={onSelectStructure}
            onSelectAlgorithm={onSelectAlgorithm}
            onToggleExpand={onExpandDsa}
            onCopyToStdin={onCopyToStdin}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 text-xs">
        {/* Lab Notes Card */}
        <div className="rounded-md bg-[#14141a] border border-white/[0.07] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-medium text-zinc-200">
              <NotebookPen className="w-3.5 h-3.5 text-sky-400" />
              <span>Experiment Notes</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">
              {versionsCount}v{testPassSummary ? ` · ${testPassSummary.passed}/${testPassSummary.total}` : ''}
            </span>
          </div>

          <textarea
            aria-label="Experiment notes"
            rows={4}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Record time/space complexity, invariants, edge cases, or hypothesis..."
            className="w-full rounded bg-[#0c0c0f] border border-white/[0.08] focus:border-sky-500/40 p-2 font-mono text-[11px] text-zinc-200 placeholder:text-zinc-600 outline-none resize-y"
          />

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={onCreateSnapshot}
              className="flex-1 flex items-center justify-center gap-1 h-7 rounded bg-white/[0.06] hover:bg-white/[0.11] text-zinc-200 transition-colors"
            >
              <GitBranch className="w-3 h-3 text-sky-300" />
              <span>Snapshot</span>
            </button>
            <button
              type="button"
              onClick={onOpenCompare}
              className="flex-1 flex items-center justify-center gap-1 h-7 rounded bg-white/[0.06] hover:bg-white/[0.11] text-zinc-200 transition-colors"
            >
              <GitCompare className="w-3 h-3 text-sky-300" />
              <span>Compare</span>
            </button>
          </div>
        </div>

        {/* Compiler Runtime Card */}
        <div className="rounded-md bg-[#14141a] border border-white/[0.07] p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-medium text-zinc-200">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>Browser C++ Engine</span>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-mono ${
                runtimeStatus.phase === 'ready'
                  ? 'text-emerald-400'
                  : runtimeStatus.phase === 'loading-compiler' ||
                      runtimeStatus.phase === 'compiling' ||
                      runtimeStatus.phase === 'running'
                    ? 'text-sky-400'
                    : runtimeStatus.phase === 'error'
                      ? 'text-rose-400'
                      : 'text-zinc-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  runtimeStatus.phase === 'ready'
                    ? 'bg-emerald-400'
                    : runtimeStatus.phase === 'error'
                      ? 'bg-rose-400'
                      : runtimeStatus.phase === 'idle'
                        ? 'bg-zinc-500'
                        : 'bg-sky-400 animate-pulse'
                }`}
              />
              {runtimeStatus.phase}
            </span>
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed">
            {runtimeStatus.message}
          </p>

          {runtimeStatus.phase === 'loading-compiler' &&
            runtimeStatus.progressPercent !== null && (
              <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full bg-sky-400 transition-all duration-200"
                  style={{ width: `${runtimeStatus.progressPercent}%` }}
                />
              </div>
            )}

          {runtimeStatus.clangVersion && (
            <div className="font-mono text-[10px] text-zinc-500 break-words">
              {runtimeStatus.clangVersion}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {!runtimeStatus.loaded ? (
              <button
                type="button"
                onClick={onPreloadCompiler}
                disabled={runtimeStatus.phase === 'loading-compiler'}
                className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded bg-white/[0.06] hover:bg-white/[0.11] text-zinc-200 disabled:opacity-40 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Preload Compiler
              </button>
            ) : (
              <button
                type="button"
                onClick={onResetCompiler}
                disabled={isBusy}
                className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded bg-white/[0.06] hover:bg-white/[0.11] text-zinc-300 disabled:opacity-40 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Worker
              </button>
            )}
          </div>
        </div>

        {/* Last Execution Telemetry */}
        <div className="rounded-md bg-[#14141a] border border-white/[0.07] p-3 space-y-2">
          <div className="flex items-center gap-1.5 font-medium text-zinc-200">
            <Gauge className="w-3.5 h-3.5 text-sky-400" />
            <span>Execution Telemetry</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded bg-[#0d0d11] border border-white/[0.05]">
              <div className="text-zinc-500">Compile</div>
              <div className="font-mono text-zinc-200 mt-0.5">
                {lastResult
                  ? lastResult.cachedCompile
                    ? '0ms (cached)'
                    : `${lastResult.compileTimeMs}ms`
                  : '—'}
              </div>
            </div>
            <div className="p-2 rounded bg-[#0d0d11] border border-white/[0.05]">
              <div className="text-zinc-500">Execution</div>
              <div className="font-mono text-zinc-200 mt-0.5">
                {lastResult?.executionTimeMs !== null && lastResult
                  ? `${lastResult.executionTimeMs}ms`
                  : '—'}
              </div>
            </div>
            <div className="p-2 rounded bg-[#0d0d11] border border-white/[0.05]">
              <div className="text-zinc-500">Exit Code</div>
              <div className="font-mono text-zinc-200 mt-0.5">
                {lastResult?.exitCode !== null && lastResult
                  ? lastResult.exitCode
                  : '—'}
              </div>
            </div>
            <div className="p-2 rounded bg-[#0d0d11] border border-white/[0.05]">
              <div className="text-zinc-500">Limits</div>
              <div className="font-mono text-zinc-200 mt-0.5">
                {compilerConfig.timeoutMs / 1000}s / {compilerConfig.memoryLimitMb}MB
              </div>
            </div>
          </div>
        </div>

        {/* Experiment Actions & Shortcuts */}
        <div className="rounded-md bg-[#14141a] border border-white/[0.07] p-3 space-y-2">
          <div className="flex items-center gap-1.5 font-medium text-zinc-200">
            <Keyboard className="w-3.5 h-3.5 text-sky-400" />
            <span>Controls & Shortcuts</span>
          </div>

          <div className="space-y-1.5">
            {isBusy ? (
              <button
                type="button"
                onClick={onStop}
                className="w-full flex items-center justify-between px-2.5 h-8 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Square className="w-3.5 h-3.5" />
                  Stop Execution
                </span>
                <kbd className="font-mono text-[10px] text-rose-300">Esc</kbd>
              </button>
            ) : (
              <button
                type="button"
                onClick={onRun}
                className="w-full flex items-center justify-between px-2.5 h-8 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-500/30 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5" />
                  Compile & Run
                </span>
                <kbd className="font-mono text-[10px] text-sky-300">Ctrl+Enter</kbd>
              </button>
            )}

            <button
              type="button"
              onClick={onRunAllTests}
              disabled={isBusy}
              className="w-full flex items-center justify-between px-2.5 h-8 rounded bg-white/[0.05] hover:bg-white/[0.09] text-zinc-200 disabled:opacity-40 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5" />
                Run All Test Cases
              </span>
              <kbd className="font-mono text-[10px] text-zinc-400">
                Ctrl+Shift+Enter
              </kbd>
            </button>

            <button
              type="button"
              onClick={onSave}
              className="w-full flex items-center justify-between px-2.5 h-8 rounded bg-white/[0.05] hover:bg-white/[0.09] text-zinc-200 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5" />
                Save Experiment
              </span>
              <kbd className="font-mono text-[10px] text-zinc-400">Ctrl+S</kbd>
            </button>
          </div>

          <div className="pt-1.5 border-t border-white/[0.06] text-[11px] text-zinc-500 flex items-center justify-between">
            <span>Format C++ code</span>
            <kbd className="font-mono text-[10px] text-zinc-400">Shift+Alt+F</kbd>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
