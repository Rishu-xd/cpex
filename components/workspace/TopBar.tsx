'use client';

import React from 'react';
import Link from 'next/link';
import { CpexLogo } from '@/components/brand/CpexLogo';
import {
  Play,
  Square,
  Save,
  FlaskConical,
  PanelLeft,
  PanelBottom,
  PanelRight,
  Cpu,
  Check,
  GitBranch,
  GitCompare,
  Boxes,
  Upload,
} from 'lucide-react';
import type { CompilerRuntimeStatus, CppStandard } from '@/lib/compiler/types';

interface TopBarProps {
  experimentName: string;
  isTemporary: boolean;
  onExperimentNameChange: (name: string) => void;
  cppStandard: CppStandard;
  onToggleStandard: () => void;
  runtimeStatus: CompilerRuntimeStatus;
  isBusy: boolean;
  isDirty: boolean;
  savedAt: string | null;
  compareOpen: boolean;
  dsaOpen: boolean;
  githubLogin: string | null;
  onRun: () => void;
  onStop: () => void;
  onRunTests: () => void;
  onSave: () => void;
  onPushGitHub: () => void;
  onCreateSnapshot: () => void;
  onToggleCompare: () => void;
  onToggleDsa: () => void;
  leftOpen: boolean;
  bottomOpen: boolean;
  rightOpen: boolean;
  onToggleLeft: () => void;
  onToggleBottom: () => void;
  onToggleRight: () => void;
}

export function TopBar({
  experimentName,
  isTemporary,
  onExperimentNameChange,
  cppStandard,
  onToggleStandard,
  runtimeStatus,
  isBusy,
  isDirty,
  savedAt,
  compareOpen,
  dsaOpen,
  githubLogin,
  onRun,
  onStop,
  onRunTests,
  onSave,
  onPushGitHub,
  onCreateSnapshot,
  onToggleCompare,
  onToggleDsa,
  leftOpen,
  bottomOpen,
  rightOpen,
  onToggleLeft,
  onToggleBottom,
  onToggleRight,
}: TopBarProps) {
  return (
    <header className="h-12 bg-[#0d0d11] border-b border-white/[0.08] px-3 flex items-center justify-between gap-2 shrink-0 select-none">
      {/* Left: Brand + Experiment Name + C++ Badge */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Link
          href="/"
          title="Back to CPex overview"
          className="flex items-center gap-2 shrink-0 hover:opacity-90 transition-opacity"
        >
          <CpexLogo size={28} priority />
          <span className="font-semibold text-sm tracking-tight text-zinc-100">
            CPex
          </span>
        </Link>

        <span className="text-zinc-700">/</span>

        <input
          aria-label="Experiment name"
          value={experimentName}
          onChange={(e) => onExperimentNameChange(e.target.value)}
          className="bg-transparent text-xs sm:text-sm font-medium text-zinc-200 outline-none border border-transparent focus:border-white/15 rounded px-1.5 py-0.5 w-32 sm:w-48 truncate"
        />

        {isTemporary && (
          <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[10px] font-medium uppercase tracking-wider text-amber-300 shrink-0">
            Scratch
          </span>
        )}

        <button
          type="button"
          onClick={onToggleStandard}
          title="Click to switch C++17 / C++20"
          className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] font-mono text-[11px] text-sky-300 transition-colors shrink-0"
        >
          {cppStandard.toUpperCase()} · Clang WASM
        </button>
      </div>

      {/* Center / Right: Compiler status + Primary actions + Layout toggles */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div
          className="hidden xl:flex items-center gap-1.5 px-2.5 h-7 rounded bg-[#14141a] border border-white/[0.06] text-[11px] text-zinc-400"
          title={runtimeStatus.message}
        >
          <Cpu
            className={`w-3.5 h-3.5 ${
              runtimeStatus.phase === 'ready'
                ? 'text-emerald-400'
                : runtimeStatus.phase === 'error'
                  ? 'text-rose-400'
                  : runtimeStatus.phase === 'idle'
                    ? 'text-zinc-500'
                    : 'text-sky-400 animate-pulse'
            }`}
          />
          <span className="max-w-[170px] truncate">
            {runtimeStatus.phase === 'loading-compiler' &&
            runtimeStatus.progressPercent !== null
              ? `Loading Clang (${runtimeStatus.progressPercent}%)`
              : runtimeStatus.phase === 'ready'
                ? 'Clang WASM Ready'
                : runtimeStatus.phase === 'compiling'
                  ? 'Compiling C++...'
                  : runtimeStatus.phase === 'running'
                    ? 'Running WASM...'
                    : runtimeStatus.phase === 'error'
                      ? 'Compiler Error'
                      : 'Compiler Lazy-Ready'}
          </span>
        </div>

        {isBusy ? (
          <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-medium transition-colors"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onRun}
            className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-sky-500 hover:bg-sky-400 text-zinc-950 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run</span>
          </button>
        )}

        <button
          type="button"
          onClick={onRunTests}
          disabled={isBusy}
          title="Run all test cases (Ctrl+Shift+Enter)"
          className="hidden sm:flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-white/[0.06] hover:bg-white/[0.11] border border-white/[0.08] text-zinc-200 text-xs font-medium disabled:opacity-40 transition-colors"
        >
          <FlaskConical className="w-3.5 h-3.5" />
          <span>Tests</span>
        </button>

        <button
          type="button"
          onClick={onCreateSnapshot}
          title="Capture immutable code snapshot"
          className="hidden md:flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-white/[0.06] hover:bg-white/[0.11] border border-white/[0.08] text-zinc-200 text-xs font-medium transition-colors"
        >
          <GitBranch className="w-3.5 h-3.5 text-sky-300" />
          <span>Snapshot</span>
        </button>

        <button
          type="button"
          onClick={onToggleCompare}
          title="Compare versions, runs, or experiments side-by-side"
          className={`hidden sm:flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-xs font-medium transition-colors ${
            compareOpen
              ? 'bg-sky-500/20 border-sky-500/40 text-sky-200'
              : 'bg-white/[0.06] hover:bg-white/[0.11] border-white/[0.08] text-zinc-200'
          }`}
        >
          <GitCompare className="w-3.5 h-3.5" />
          <span>Compare</span>
        </button>

        <button
          type="button"
          onClick={onToggleDsa}
          title="Open interactive Data Structures & Algorithms Lab"
          className={`hidden sm:flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-xs font-medium transition-colors ${
            dsaOpen
              ? 'bg-sky-500/20 border-sky-500/40 text-sky-200'
              : 'bg-white/[0.06] hover:bg-white/[0.11] border-white/[0.08] text-zinc-200'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>DSA Lab</span>
        </button>

        <button
          type="button"
          onClick={onSave}
          title={savedAt ? `Last saved at ${savedAt}` : 'Save experiment locally (Ctrl+S)'}
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-white/[0.06] hover:bg-white/[0.11] border border-white/[0.08] text-zinc-200 text-xs font-medium transition-colors"
        >
          {isDirty || isTemporary ? (
            <Save className="w-3.5 h-3.5 text-amber-300" />
          ) : (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span className="hidden sm:inline">
            {isDirty || isTemporary ? 'Save' : 'Saved'}
          </span>
        </button>

        <button
          type="button"
          onClick={onPushGitHub}
          title={
            githubLogin
              ? `Push to GitHub as @${githubLogin}`
              : 'Connect GitHub to push code'
          }
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-white/[0.06] hover:bg-white/[0.11] border border-white/[0.08] text-zinc-200 text-xs font-medium transition-colors"
        >
          <Upload className="w-3.5 h-3.5 text-sky-300" />
          <span className="hidden sm:inline">Push</span>
          {githubLogin && (
            <span className="hidden xl:inline text-[10px] font-mono text-emerald-300">
              @{githubLogin}
            </span>
          )}
        </button>

        <div className="hidden md:flex items-center gap-0.5 pl-1 border-l border-white/[0.08]">
          <button
            type="button"
            onClick={onToggleLeft}
            title="Toggle left sidebar"
            className={`p-1.5 rounded transition-colors ${
              leftOpen
                ? 'text-zinc-200 bg-white/[0.08]'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
            }`}
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onToggleBottom}
            title="Toggle bottom panel"
            className={`p-1.5 rounded transition-colors ${
              bottomOpen
                ? 'text-zinc-200 bg-white/[0.08]'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
            }`}
          >
            <PanelBottom className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onToggleRight}
            title="Toggle right inspector"
            className={`p-1.5 rounded transition-colors ${
              rightOpen
                ? 'text-zinc-200 bg-white/[0.08]'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
            }`}
          >
            <PanelRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
