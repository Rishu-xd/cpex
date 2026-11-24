'use client';

import React, { useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';

interface PlaybackBarProps {
  step: number;
  totalSteps: number;
  playing: boolean;
  speed: number;
  title: string;
  detail: string;
  resultSummary?: string;
  onStepChange: (nextStep: number) => void;
  onTogglePlay: () => void;
  onPause: () => void;
  onSpeedChange: (nextSpeed: number) => void;
}

const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 4];

export function PlaybackBar({
  step,
  totalSteps,
  playing,
  speed,
  title,
  detail,
  resultSummary,
  onStepChange,
  onTogglePlay,
  onPause,
  onSpeedChange,
}: PlaybackBarProps) {
  const maxStep = Math.max(0, totalSteps - 1);

  useEffect(() => {
    if (!playing) return;
    if (step >= maxStep) {
      const id = setTimeout(() => onPause(), 0);
      return () => clearTimeout(id);
    }
    const intervalMs = Math.max(120, Math.round(700 / speed));
    const timer = setInterval(() => {
      onStepChange(Math.min(maxStep, step + 1));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [playing, step, maxStep, speed, onStepChange, onPause]);

  return (
    <div className="rounded-md bg-[#121218] border border-white/[0.08] p-2.5 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              onPause();
              onStepChange(0);
            }}
            disabled={totalSteps <= 1 || step === 0}
            className="p-1.5 rounded bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 disabled:opacity-35"
            title="Reset to step 0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              onPause();
              onStepChange(Math.max(0, step - 1));
            }}
            disabled={totalSteps <= 1 || step === 0}
            className="p-1.5 rounded bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 disabled:opacity-35"
            title="Previous step"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            disabled={totalSteps <= 1}
            className="flex items-center gap-1 h-7 px-2.5 rounded bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/35 text-sky-200 text-xs font-medium disabled:opacity-35"
          >
            {playing ? (
              <>
                <Pause className="w-3 h-3" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                <span>Play</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              onPause();
              onStepChange(Math.min(maxStep, step + 1));
            }}
            disabled={totalSteps <= 1 || step >= maxStep}
            className="p-1.5 rounded bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 disabled:opacity-35"
            title="Next step"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-zinc-400">
            Step {Math.min(step + 1, totalSteps)} / {Math.max(1, totalSteps)}
          </span>
          <select
            aria-label="Playback speed"
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="h-6 rounded bg-[#0b0b0f] border border-white/[0.08] px-1.5 font-mono text-[11px] text-zinc-300 outline-none"
          >
            {SPEED_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}x
              </option>
            ))}
          </select>
        </div>
      </div>

      {totalSteps > 1 && (
        <input
          type="range"
          min={0}
          max={maxStep}
          value={Math.min(step, maxStep)}
          onChange={(e) => {
            onPause();
            onStepChange(Number(e.target.value));
          }}
          className="w-full accent-sky-400 h-1.5"
        />
      )}

      <div className="text-xs space-y-0.5">
        <div className="font-medium text-zinc-100">{title}</div>
        <div className="font-mono text-[11px] text-zinc-400">{detail}</div>
        {resultSummary && (
          <div className="inline-block mt-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 font-mono text-[11px] text-emerald-300">
            Result: {resultSummary}
          </div>
        )}
      </div>
    </div>
  );
}
