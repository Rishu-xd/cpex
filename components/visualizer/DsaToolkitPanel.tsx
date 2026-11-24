'use client';

import React from 'react';
import {
  Boxes,
  Maximize2,
  Minimize2,
  Workflow,
  X,
} from 'lucide-react';
import {
  ALGORITHMS_CATALOG,
  DATA_STRUCTURES_CATALOG,
  type AlgorithmId,
  type DataStructureId,
} from '@/lib/dsa/types';
import { DataStructureLab } from './DataStructureLab';
import { AlgorithmLab } from './AlgorithmLab';

interface DsaToolkitPanelProps {
  mode: 'structures' | 'algorithms';
  structureId: DataStructureId;
  algorithmId: AlgorithmId;
  expanded: boolean;
  onModeChange: (mode: 'structures' | 'algorithms') => void;
  onSelectStructure: (id: DataStructureId) => void;
  onSelectAlgorithm: (id: AlgorithmId) => void;
  onToggleExpand: () => void;
  onClose?: () => void;
  onCopyToStdin: (stdinText: string) => void;
}

export function DsaToolkitPanel({
  mode,
  structureId,
  algorithmId,
  expanded,
  onModeChange,
  onSelectStructure,
  onSelectAlgorithm,
  onToggleExpand,
  onClose,
  onCopyToStdin,
}: DsaToolkitPanelProps) {
  const activeStruct =
    DATA_STRUCTURES_CATALOG.find((s) => s.id === structureId) ??
    DATA_STRUCTURES_CATALOG[0];
  const activeAlgo =
    ALGORITHMS_CATALOG.find((a) => a.id === algorithmId) ??
    ALGORITHMS_CATALOG[0];

  return (
    <div className="flex flex-col h-full bg-[#101014]">
      {/* Mode + Expand Bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-1 bg-[#0b0b0f] p-0.5 rounded border border-white/[0.07] text-[11px]">
          <button
            type="button"
            onClick={() => onModeChange('structures')}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              mode === 'structures'
                ? 'bg-sky-500/20 text-sky-200 font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Boxes className="w-3 h-3" />
            <span>Structures</span>
          </button>
          <button
            type="button"
            onClick={() => onModeChange('algorithms')}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              mode === 'algorithms'
                ? 'bg-sky-500/20 text-sky-200 font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Workflow className="w-3 h-3" />
            <span>Algorithms</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleExpand}
            className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]"
            title={expanded ? 'Dock to right panel' : 'Expand to center pane'}
          >
            {expanded ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]"
              title="Close expanded DSA Lab"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Selector + Description */}
      <div className="px-3 py-2 border-b border-white/[0.06] space-y-1.5 shrink-0">
        {mode === 'structures' ? (
          <>
            <select
              aria-label="Select data structure"
              value={structureId}
              onChange={(e) =>
                onSelectStructure(e.target.value as DataStructureId)
              }
              className="w-full h-8 rounded bg-[#15151c] border border-white/[0.1] px-2 text-xs font-medium text-zinc-100 outline-none focus:border-sky-500/50"
            >
              {DATA_STRUCTURES_CATALOG.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-zinc-400 leading-snug">
              {activeStruct.description}
            </p>
          </>
        ) : (
          <>
            <select
              aria-label="Select algorithm"
              value={algorithmId}
              onChange={(e) => onSelectAlgorithm(e.target.value as AlgorithmId)}
              className="w-full h-8 rounded bg-[#15151c] border border-white/[0.1] px-2 text-xs font-medium text-zinc-100 outline-none focus:border-sky-500/50"
            >
              {(['Searching', 'Sorting', 'Techniques', 'Graph'] as const).map(
                (cat) => (
                  <optgroup key={cat} label={cat}>
                    {ALGORITHMS_CATALOG.filter((a) => a.category === cat).map(
                      (item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      )
                    )}
                  </optgroup>
                )
              )}
            </select>
            <p className="text-[11px] text-zinc-400 leading-snug">
              {activeAlgo.description}
            </p>
          </>
        )}
      </div>

      {/* Interactive Lab Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {mode === 'structures' ? (
          <DataStructureLab
            key={structureId}
            structureId={structureId}
            onCopyToStdin={onCopyToStdin}
          />
        ) : (
          <AlgorithmLab
            key={algorithmId}
            algorithmId={algorithmId}
            onCopyToStdin={onCopyToStdin}
          />
        )}
      </div>
    </div>
  );
}
