'use client';

import React, { useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import {
  DEFAULT_ALGORITHM_INPUT,
  generateAlgorithmSteps,
  type AlgorithmInput,
} from '@/lib/dsa/algorithms';
import { computeGraphCircularLayout } from '@/lib/dsa/structures';
import type { AlgorithmFrame, AlgorithmId } from '@/lib/dsa/types';
import { PlaybackBar } from './PlaybackBar';

interface AlgorithmLabProps {
  algorithmId: AlgorithmId;
  onCopyToStdin: (stdinText: string) => void;
}

function parseArrayString(raw: string): number[] {
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isFinite(n));
}

export function AlgorithmLab({ algorithmId, onCopyToStdin }: AlgorithmLabProps) {
  const isGraphAlgo = algorithmId === 'bfs' || algorithmId === 'dfs';
  const needsTarget =
    algorithmId === 'linear-search' ||
    algorithmId === 'binary-search' ||
    algorithmId === 'two-pointers' ||
    algorithmId === 'sliding-window';

  const [arrayText, setArrayText] = useState(
    algorithmId === 'two-pointers'
      ? '2 4 7 11 15 20'
      : DEFAULT_ALGORITHM_INPUT.array.join(' ')
  );
  const [targetText, setTargetText] = useState(
    algorithmId === 'two-pointers' ? '18' : String(DEFAULT_ALGORITHM_INPUT.target)
  );
  const [windowText, setWindowText] = useState(
    String(DEFAULT_ALGORITHM_INPUT.windowSize)
  );
  const [slidingMode, setSlidingMode] = useState<'fixed' | 'variable'>('fixed');
  const [edgeText, setEdgeText] = useState(DEFAULT_ALGORITHM_INPUT.edgeText);
  const [startNode, setStartNode] = useState(DEFAULT_ALGORITHM_INPUT.startNode);
  const [directed, setDirected] = useState(false);

  const [algoInput, setAlgoInput] = useState<AlgorithmInput>(() => ({
    ...DEFAULT_ALGORITHM_INPUT,
    array:
      algorithmId === 'two-pointers'
        ? [2, 4, 7, 11, 15, 20]
        : DEFAULT_ALGORITHM_INPUT.array,
    target: algorithmId === 'two-pointers' ? 18 : DEFAULT_ALGORITHM_INPUT.target,
  }));

  const frames: AlgorithmFrame[] = useMemo(
    () => generateAlgorithmSteps(algorithmId, algoInput),
    [algorithmId, algoInput]
  );

  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const safeStep = Math.min(step, Math.max(0, frames.length - 1));
  const currentFrame = frames[safeStep];
  const lastFrame = frames[frames.length - 1];

  const handleApplyInput = () => {
    const nextArray = parseArrayString(arrayText);
    const nextTarget = Number.parseInt(targetText, 10) || 0;
    const nextWin = Math.max(1, Number.parseInt(windowText, 10) || 1);

    setAlgoInput({
      array: nextArray.length > 0 ? nextArray : [1],
      target: nextTarget,
      windowSize: nextWin,
      slidingMode,
      edgeText,
      startNode: startNode.trim() || '0',
      directed,
    });
    setStep(0);
    setPlaying(true);
  };

  const handleSendStdin = () => {
    if (isGraphAlgo) {
      const f = currentFrame;
      if (f.kind === 'graph') {
        const lines = f.state.edges.map((e) => `${e.from} ${e.to}`);
        onCopyToStdin(`${f.state.nodes.length} ${f.state.edges.length}\n${lines.join('\n')}\n`);
      }
      return;
    }
    const arr = parseArrayString(arrayText);
    if (needsTarget) {
      onCopyToStdin(`${arr.length} ${Number.parseInt(targetText, 10) || 0}\n${arr.join(' ')}\n`);
    } else {
      onCopyToStdin(`${arr.length}\n${arr.join(' ')}\n`);
    }
  };

  return (
    <div className="space-y-3 text-xs">
      {/* Custom Input Controls */}
      <div className="rounded-md bg-[#121218] border border-white/[0.08] p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-zinc-400">
            Algorithm Input
          </span>
          <button
            type="button"
            onClick={handleSendStdin}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.11] text-[11px] text-zinc-200"
            title="Copy raw input into stdin"
          >
            <Send className="w-3 h-3 text-sky-400" />
            To stdin
          </button>
        </div>

        {isGraphAlgo ? (
          <div className="space-y-2">
            <label className="block space-y-0.5">
              <span className="text-[10px] text-zinc-500">Edge List</span>
              <input
                value={edgeText}
                onChange={(e) => setEdgeText(e.target.value)}
                className="w-full h-7 px-2 rounded bg-[#0b0b0f] border border-white/[0.08] font-mono text-[11px] text-zinc-200 outline-none"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-500">Start</span>
                <input
                  value={startNode}
                  onChange={(e) => setStartNode(e.target.value)}
                  className="w-14 h-7 px-2 rounded bg-[#0b0b0f] border border-white/[0.08] font-mono text-zinc-200 outline-none"
                />
              </label>
              <label className="flex items-center gap-1 text-[11px] text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={directed}
                  onChange={(e) => setDirected(e.target.checked)}
                  className="accent-sky-400"
                />
                Directed
              </label>
              <button
                type="button"
                onClick={handleApplyInput}
                className="ml-auto h-7 px-3 rounded bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-200 font-medium"
              >
                Run Trace
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block space-y-0.5">
              <span className="text-[10px] text-zinc-500">Array</span>
              <input
                value={arrayText}
                onChange={(e) => setArrayText(e.target.value)}
                className="w-full h-7 px-2 rounded bg-[#0b0b0f] border border-white/[0.08] font-mono text-[11px] text-zinc-200 outline-none"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              {needsTarget && (
                <label className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-500">
                    {algorithmId === 'sliding-window' && slidingMode === 'variable'
                      ? 'Min Sum'
                      : 'Target'}
                  </span>
                  <input
                    value={targetText}
                    onChange={(e) => setTargetText(e.target.value)}
                    className="w-16 h-7 px-2 rounded bg-[#0b0b0f] border border-white/[0.08] font-mono text-zinc-200 outline-none"
                  />
                </label>
              )}

              {algorithmId === 'sliding-window' && (
                <>
                  <select
                    value={slidingMode}
                    onChange={(e) =>
                      setSlidingMode(e.target.value as 'fixed' | 'variable')
                    }
                    className="h-7 rounded bg-[#0b0b0f] border border-white/[0.08] px-2 text-[11px] text-zinc-200 outline-none"
                  >
                    <option value="fixed">Fixed k</option>
                    <option value="variable">Variable (&gt;= target)</option>
                  </select>
                  {slidingMode === 'fixed' && (
                    <label className="flex items-center gap-1.5">
                      <span className="text-[10px] text-zinc-500">k</span>
                      <input
                        value={windowText}
                        onChange={(e) => setWindowText(e.target.value)}
                        className="w-12 h-7 px-2 rounded bg-[#0b0b0f] border border-white/[0.08] font-mono text-zinc-200 outline-none"
                      />
                    </label>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={handleApplyInput}
                className="ml-auto h-7 px-3 rounded bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-200 font-medium"
              >
                Run Trace
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Algorithm Visual Stage */}
      <div className="rounded-md bg-[#0b0b0f] border border-white/[0.08] p-3 overflow-x-auto">
        {currentFrame.kind === 'array' ? (
          <ArrayAlgoCanvas frame={currentFrame} />
        ) : (
          <GraphAlgoCanvas frame={currentFrame} />
        )}
      </div>

      {/* Step Playback Bar */}
      <PlaybackBar
        step={safeStep}
        totalSteps={frames.length}
        playing={playing}
        speed={speed}
        title={currentFrame.title}
        detail={currentFrame.detail}
        resultSummary={currentFrame.resultSummary ?? lastFrame.resultSummary}
        onStepChange={setStep}
        onTogglePlay={() => setPlaying((p) => !p)}
        onPause={() => setPlaying(false)}
        onSpeedChange={setSpeed}
      />

      {/* Metrics Strip */}
      <div className="rounded-md bg-[#121218] border border-white/[0.08] p-2.5 flex flex-wrap gap-3 font-mono text-[11px] text-zinc-300">
        {Object.entries(currentFrame.state.metrics).map(([k, v]) => (
          <span key={k}>
            <span className="text-zinc-500">{k}=</span>
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

function ArrayAlgoCanvas({
  frame,
}: {
  frame: Extract<AlgorithmFrame, { kind: 'array' }>;
}) {
  const { items, activeIndices, comparingIndices, sortedIndices, discardedIndices, windowRange, bestRange, pointers } =
    frame.state;
  const maxAbs = Math.max(1, ...items.map((x) => Math.abs(x)));

  return (
    <div className="space-y-3">
      {/* Bar Chart */}
      <div className="flex items-end gap-1.5 h-28 pt-2">
        {items.map((val, idx) => {
          const isActive = activeIndices.includes(idx);
          const isCompare = comparingIndices.includes(idx);
          const isSorted = sortedIndices.includes(idx);
          const isDiscarded = discardedIndices.includes(idx);
          const inWindow =
            windowRange !== null &&
            idx >= windowRange[0] &&
            idx <= windowRange[1];
          const inBest =
            bestRange !== null && idx >= bestRange[0] && idx <= bestRange[1];

          const pct = Math.max(18, Math.round((Math.abs(val) / maxAbs) * 100));
          const barClass = isActive
            ? 'bg-sky-400'
            : isCompare
              ? 'bg-amber-400'
              : isSorted
                ? 'bg-emerald-400'
                : inWindow
                  ? 'bg-sky-400/75'
                  : isDiscarded
                    ? 'bg-zinc-800'
                    : 'bg-zinc-600';

          return (
            <div
              key={idx}
              className={`flex-1 min-w-[26px] flex flex-col items-center justify-end h-full rounded-t px-0.5 ${
                inBest ? 'ring-1 ring-emerald-500/40 bg-emerald-500/5' : ''
              }`}
            >
              <div
                style={{ height: `${pct}%` }}
                className={`w-full rounded-t transition-all duration-150 ${barClass}`}
              />
            </div>
          );
        })}
      </div>

      {/* Indexed Cells + Pointer Tags */}
      <div className="flex gap-1.5">
        {items.map((val, idx) => {
          const ptrs = pointers.filter((p) => p.index === idx);
          const isActive = activeIndices.includes(idx);
          const isCompare = comparingIndices.includes(idx);
          const isSorted = sortedIndices.includes(idx);
          const inWindow =
            windowRange !== null &&
            idx >= windowRange[0] &&
            idx <= windowRange[1];

          return (
            <div
              key={idx}
              className="flex-1 min-w-[26px] flex flex-col items-center gap-0.5"
            >
              <div
                className={`w-full h-7 rounded border flex items-center justify-center font-mono text-[11px] ${
                  isActive
                    ? 'bg-sky-500/25 border-sky-400 text-sky-100 font-semibold'
                    : isCompare
                      ? 'bg-amber-500/20 border-amber-400 text-amber-100'
                      : isSorted
                        ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                        : inWindow
                          ? 'bg-sky-500/15 border-sky-500/40 text-sky-200'
                          : 'bg-[#16161e] border-white/[0.1] text-zinc-300'
                }`}
              >
                {val}
              </div>
              <span className="font-mono text-[9px] text-zinc-500">{idx}</span>
              <div className="flex flex-wrap justify-center gap-0.5 min-h-[14px]">
                {ptrs.map((p) => (
                  <span
                    key={p.label}
                    className={`px-1 rounded text-[9px] font-mono ${
                      p.tone === 'emerald'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : p.tone === 'amber'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-sky-500/20 text-sky-300'
                    }`}
                  >
                    {p.label}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GraphAlgoCanvas({
  frame,
}: {
  frame: Extract<AlgorithmFrame, { kind: 'graph' }>;
}) {
  const {
    nodes,
    edges,
    directed,
    currentNodeId,
    visitedIds,
    frontierIds,
    activeEdgeId,
    distances,
  } = frame.state;

  const positioned = useMemo(
    () => computeGraphCircularLayout(nodes, 380, 200),
    [nodes]
  );
  const posMap = useMemo(
    () => new Map(positioned.map((n) => [n.id, n])),
    [positioned]
  );

  return (
    <div className="space-y-2">
      <svg viewBox="0 0 380 200" className="w-full max-h-52">
        {directed && (
          <defs>
            <marker
              id="algo-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="21"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L7,3 z" fill="rgba(148,163,184,0.85)" />
            </marker>
          </defs>
        )}
        {edges.map((e) => {
          const u = posMap.get(e.from);
          const v = posMap.get(e.to);
          if (!u || !v) return null;
          const isAct = e.id === activeEdgeId;
          return (
            <line
              key={e.id}
              x1={u.x}
              y1={u.y}
              x2={v.x}
              y2={v.y}
              stroke={isAct ? '#38bdf8' : 'rgba(255,255,255,0.2)'}
              strokeWidth={isAct ? 2.6 : 1.5}
              markerEnd={directed ? 'url(#algo-arrow)' : undefined}
            />
          );
        })}
        {positioned.map((n) => {
          const isCurr = n.id === currentNodeId;
          const isVisited = visitedIds.includes(n.id);
          const isFrontier = frontierIds.includes(n.id);
          const dist = distances[n.id];

          const fill = isCurr
            ? 'rgba(56,189,248,0.3)'
            : isVisited
              ? 'rgba(16,185,129,0.22)'
              : isFrontier
                ? 'rgba(245,158,11,0.22)'
                : '#16161e';
          const stroke = isCurr
            ? '#38bdf8'
            : isVisited
              ? '#34d399'
              : isFrontier
                ? '#fbbf24'
                : 'rgba(255,255,255,0.22)';

          return (
            <g key={n.id}>
              <circle
                cx={n.x}
                cy={n.y}
                r={16}
                fill={fill}
                stroke={stroke}
                strokeWidth={isCurr ? 2.2 : 1.4}
              />
              <text
                x={n.x}
                y={n.y + 4}
                textAnchor="middle"
                className="fill-zinc-100 font-mono text-[11px]"
              >
                {n.label}
              </text>
              {dist !== undefined && (
                <text
                  x={n.x + 17}
                  y={n.y - 12}
                  className="fill-sky-300 font-mono text-[9px]"
                >
                  d:{dist}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
        <div className="p-2 rounded bg-[#121218] border border-white/[0.06]">
          <div className="text-[10px] text-zinc-500">Frontier</div>
          <div className="text-amber-300 truncate">
            [{frontierIds.join(', ') || 'empty'}]
          </div>
        </div>
        <div className="p-2 rounded bg-[#121218] border border-white/[0.06]">
          <div className="text-[10px] text-zinc-500">Visited Order</div>
          <div className="text-emerald-300 truncate">
            [{visitedIds.join(' -> ') || 'none'}]
          </div>
        </div>
      </div>
    </div>
  );
}
