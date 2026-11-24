'use client';

import React, { useMemo, useState } from 'react';
import { ArrowRight, RotateCcw, Send } from 'lucide-react';
import {
  arrayDeleteAt,
  arrayInsertAt,
  arrayPopBack,
  arrayPushBack,
  arraySearch,
  arrayUpdateAt,
  bstDelete,
  bstFindMinMax,
  bstInorder,
  bstInsert,
  bstSearch,
  btDeleteValue,
  btInsertLevelOrder,
  btSearch,
  btTraverse,
  btUpdateValue,
  buildAdjacencyList,
  buildAdjacencyMatrix,
  computeGraphCircularLayout,
  computeTreeLayout,
  getHashTableMetrics,
  getTreeMetrics,
  graphAddEdge,
  graphAddNode,
  graphRemoveEdge,
  graphRemoveNode,
  graphSearchNode,
  graphUpdateEdgeWeight,
  hashDelete,
  hashInsertOrUpdate,
  hashRehash,
  hashSearch,
  heapBuildFromArray,
  heapPop,
  heapPush,
  heapSearch,
  heapToTreeLayout,
  initArray,
  initBinaryTree,
  initBst,
  initGraph,
  initHashTable,
  initHeap,
  initLinkedList,
  initQueue,
  initStack,
  initString,
  isValidBst,
  llDeleteValue,
  llInsertAt,
  llInsertHead,
  llInsertTail,
  llReverse,
  llSearch,
  llUpdateAt,
  parseEdgeListToGraph,
  queueDequeue,
  queueEnqueue,
  queuePeek,
  queueSearch,
  stackPeek,
  stackPop,
  stackPush,
  stackSearch,
  stringDeleteRange,
  stringInsertAt,
  stringReverse,
  stringSearchSubstring,
  stringUpdateChar,
} from '@/lib/dsa/structures';
import type {
  ArrayState,
  BinaryTreeState,
  DataStructureId,
  GraphState,
  HashTableState,
  HeapState,
  LinkedListState,
  PlaybackFrame,
  QueueState,
  StackState,
  StringState,
} from '@/lib/dsa/types';
import { PlaybackBar } from './PlaybackBar';

interface DataStructureLabProps {
  structureId: DataStructureId;
  onCopyToStdin: (stdinText: string) => void;
}

function parseNumberList(raw: string): number[] {
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isFinite(n));
}

function parseNullableNumberList(raw: string): Array<number | null> {
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      if (s.toLowerCase() === 'null' || s === '#') return null;
      const n = Number.parseInt(s, 10);
      return Number.isFinite(n) ? n : null;
    });
}

function createInitialFrames(id: DataStructureId): PlaybackFrame<unknown>[] {
  switch (id) {
    case 'array':
      return [
        {
          step: 0,
          title: 'Vector initialized',
          detail: 'size=5, capacity=8',
          state: initArray(),
        },
      ];
    case 'string':
      return [
        {
          step: 0,
          title: 'String initialized',
          detail: '"ALGORITHMS" (length 10)',
          state: initString(),
        },
      ];
    case 'linked-list':
      return [
        {
          step: 0,
          title: 'Singly Linked List initialized',
          detail: '4 nodes: 12 -> 25 -> 38 -> 51',
          state: initLinkedList(),
        },
      ];
    case 'stack':
      return [
        {
          step: 0,
          title: 'Stack initialized (LIFO)',
          detail: 'Top = 30, size = 3',
          state: initStack(),
        },
      ];
    case 'queue':
      return [
        {
          step: 0,
          title: 'Queue initialized (FIFO)',
          detail: 'Front = 14, Back = 42',
          state: initQueue(),
        },
      ];
    case 'hash-table':
      return [
        {
          step: 0,
          title: 'Hash Table initialized (7 buckets)',
          detail: 'Separate chaining with FNV-1a hash.',
          state: initHashTable(),
        },
      ];
    case 'binary-tree':
      return [
        {
          step: 0,
          title: 'Binary Tree initialized',
          detail: 'Level-order tree with 6 nodes.',
          state: initBinaryTree(),
        },
      ];
    case 'bst':
      return [
        {
          step: 0,
          title: 'Binary Search Tree initialized',
          detail: 'Inorder: [20, 30, 40, 50, 60, 70, 80]',
          state: initBst(),
        },
      ];
    case 'heap':
      return [
        {
          step: 0,
          title: 'Min-Heap initialized',
          detail: 'Root = 15, size = 6',
          state: initHeap(),
        },
      ];
    case 'graph':
      return [
        {
          step: 0,
          title: 'Graph initialized',
          detail: '6 vertices, 6 undirected edges.',
          state: initGraph(false),
        },
      ];
  }
}

export function DataStructureLab({
  structureId,
  onCopyToStdin,
}: DataStructureLabProps) {
  const [frames, setFrames] = useState<PlaybackFrame<unknown>[]>(() =>
    createInitialFrames(structureId)
  );
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  // Common inputs
  const [valInput, setValInput] = useState('42');
  const [idxInput, setIdxInput] = useState('1');
  const [extraInput, setExtraInput] = useState('99');
  const [customInput, setCustomInput] = useState(() => {
    switch (structureId) {
      case 'array':
        return '10 24 7 19 35';
      case 'string':
        return 'ALGORITHMS';
      case 'linked-list':
        return '12 25 38 51';
      case 'stack':
        return '10 20 30';
      case 'queue':
        return '14 28 42';
      case 'hash-table':
        return 'cat:10, dog:25, map:42, set:7';
      case 'binary-tree':
        return '10 20 30 40 50 null 70';
      case 'bst':
        return '50 30 70 20 40 60 80';
      case 'heap':
        return '15 22 18 40 31 27';
      case 'graph':
        return '0-1, 0-2, 1-3, 2-4, 3-5, 4-5';
    }
  });
  const [keyInput, setKeyInput] = useState('vec');
  const [edgeFrom, setEdgeFrom] = useState('1');
  const [edgeTo, setEdgeTo] = useState('4');
  const [edgeWeight, setEdgeWeight] = useState('3');
  const [graphView, setGraphView] = useState<'list' | 'matrix'>('list');

  const safeStep = Math.min(step, Math.max(0, frames.length - 1));
  const currentFrame = frames[safeStep];
  const latestState = frames[frames.length - 1].state;

  const commitFrames = (nextFrames: PlaybackFrame<unknown>[]) => {
    setFrames(nextFrames);
    setStep(0);
    setPlaying(nextFrames.length > 1);
  };

  const handleReset = () => {
    setPlaying(false);
    setFrames(createInitialFrames(structureId));
    setStep(0);
  };

  const handleSendStdin = () => {
    const st = currentFrame.state;
    if (structureId === 'array') {
      const s = st as ArrayState;
      onCopyToStdin(`${s.items.length}\n${s.items.join(' ')}\n`);
    } else if (structureId === 'string') {
      const s = st as StringState;
      onCopyToStdin(`${s.chars.join('')}\n`);
    } else if (structureId === 'linked-list') {
      const s = st as LinkedListState;
      onCopyToStdin(`${s.nodes.length}\n${s.nodes.map((n) => n.value).join(' ')}\n`);
    } else if (structureId === 'stack') {
      const s = st as StackState;
      onCopyToStdin(`${s.items.length}\n${s.items.join(' ')}\n`);
    } else if (structureId === 'queue') {
      const s = st as QueueState;
      onCopyToStdin(`${s.items.length}\n${s.items.join(' ')}\n`);
    } else if (structureId === 'hash-table') {
      const s = st as HashTableState;
      const entries = s.buckets.flat();
      onCopyToStdin(
        `${entries.length}\n${entries.map((e) => `${e.key} ${e.value}`).join('\n')}\n`
      );
    } else if (structureId === 'binary-tree' || structureId === 'bst') {
      const s = st as BinaryTreeState;
      const vals = bstInorder(s.root);
      onCopyToStdin(`${vals.length}\n${vals.join(' ')}\n`);
    } else if (structureId === 'heap') {
      const s = st as HeapState;
      onCopyToStdin(`${s.items.length}\n${s.items.join(' ')}\n`);
    } else if (structureId === 'graph') {
      const s = st as GraphState;
      const lines = s.edges.map((e) => `${e.from} ${e.to} ${e.weight}`);
      onCopyToStdin(`${s.nodes.length} ${s.edges.length}\n${lines.join('\n')}\n`);
    }
  };

  const parsedNum = Number.parseInt(valInput, 10) || 0;
  const parsedIdx = Number.parseInt(idxInput, 10) || 0;
  const parsedExtra = Number.parseInt(extraInput, 10) || 0;

  return (
    <div className="space-y-3 text-xs">
      {/* Custom Input & Reset Bar */}
      <div className="rounded-md bg-[#121218] border border-white/[0.08] p-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-zinc-400">
            Custom Input
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSendStdin}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.11] text-[11px] text-zinc-200"
              title="Copy current dataset into stdin"
            >
              <Send className="w-3 h-3 text-sky-400" />
              To stdin
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.11] text-[11px] text-zinc-300"
              title="Reset to default dataset"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>
        </div>

        <div className="flex gap-1.5">
          <input
            aria-label="Custom structure dataset"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            className="flex-1 h-7 px-2 rounded bg-[#0b0b0f] border border-white/[0.08] focus:border-sky-500/40 font-mono text-[11px] text-zinc-200 outline-none"
          />
          <button
            type="button"
            onClick={() => {
              if (structureId === 'array') {
                const nums = parseNumberList(customInput);
                const st = initArray(nums);
                commitFrames([
                  {
                    step: 0,
                    title: 'Loaded custom vector',
                    detail: `size=${st.items.length}, capacity=${st.capacity}`,
                    state: st,
                  },
                ]);
              } else if (structureId === 'string') {
                const st = initString(customInput);
                commitFrames([
                  {
                    step: 0,
                    title: 'Loaded custom string',
                    detail: `"${customInput}" (length ${st.chars.length})`,
                    state: st,
                  },
                ]);
              } else if (structureId === 'linked-list') {
                const cur = latestState as LinkedListState;
                const st = initLinkedList(parseNumberList(customInput), cur.doubly);
                commitFrames([
                  {
                    step: 0,
                    title: 'Loaded custom linked list',
                    detail: `${st.nodes.length} nodes`,
                    state: st,
                  },
                ]);
              } else if (structureId === 'stack') {
                const st = initStack(parseNumberList(customInput));
                commitFrames([
                  {
                    step: 0,
                    title: 'Loaded custom stack',
                    detail: `size=${st.items.length}`,
                    state: st,
                  },
                ]);
              } else if (structureId === 'queue') {
                const st = initQueue(parseNumberList(customInput));
                commitFrames([
                  {
                    step: 0,
                    title: 'Loaded custom queue',
                    detail: `size=${st.items.length}`,
                    state: st,
                  },
                ]);
              } else if (structureId === 'hash-table') {
                const pairs: Array<[string, number]> = customInput
                  .split(/[,;]+/)
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((pair) => {
                    const [k, v] = pair.split(/[:=]/);
                    return [
                      (k ?? '').trim(),
                      Number.parseInt((v ?? '0').trim(), 10) || 0,
                    ];
                  });
                const cur = latestState as HashTableState;
                const st = initHashTable(cur.bucketCount, pairs);
                commitFrames([
                  {
                    step: 0,
                    title: 'Loaded custom hash table',
                    detail: `${pairs.length} key-value entries`,
                    state: st,
                  },
                ]);
              } else if (structureId === 'binary-tree') {
                const st = initBinaryTree(parseNullableNumberList(customInput));
                commitFrames([
                  {
                    step: 0,
                    title: 'Loaded custom binary tree',
                    detail: `${getTreeMetrics(st.root).nodeCount} nodes`,
                    state: st,
                  },
                ]);
              } else if (structureId === 'bst') {
                const st = initBst(parseNumberList(customInput));
                commitFrames([
                  {
                    step: 0,
                    title: 'Loaded custom BST',
                    detail: `Inorder: [${bstInorder(st.root).join(', ')}]`,
                    state: st,
                  },
                ]);
              } else if (structureId === 'heap') {
                const cur = latestState as HeapState;
                commitFrames(
                  heapBuildFromArray(parseNumberList(customInput), cur.kind)
                );
              } else if (structureId === 'graph') {
                const cur = latestState as GraphState;
                const st = parseEdgeListToGraph(customInput, cur.directed);
                commitFrames([
                  {
                    step: 0,
                    title: 'Loaded custom graph',
                    detail: `${st.nodes.length} vertices, ${st.edges.length} edges`,
                    state: st,
                  },
                ]);
              }
            }}
            className="h-7 px-2.5 rounded bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-200 font-medium"
          >
            Load
          </button>
        </div>
      </div>

      {/* Structure-Specific Operation Controls */}
      <div className="rounded-md bg-[#121218] border border-white/[0.08] p-2.5 space-y-2">
        {structureId === 'array' && (
          <>
            <div className="grid grid-cols-3 gap-1.5">
              <label className="space-y-0.5">
                <span className="text-[10px] text-zinc-500">Value</span>
                <input
                  value={valInput}
                  onChange={(e) => setValInput(e.target.value)}
                  className="w-full h-7 px-2 rounded bg-[#0b0b0f] border border-white/[0.08] font-mono text-zinc-200 outline-none"
                />
              </label>
              <label className="space-y-0.5">
                <span className="text-[10px] text-zinc-500">Index</span>
                <input
                  value={idxInput}
                  onChange={(e) => setIdxInput(e.target.value)}
                  className="w-full h-7 px-2 rounded bg-[#0b0b0f] border border-white/[0.08] font-mono text-zinc-200 outline-none"
                />
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() =>
                    commitFrames(arrayPushBack(latestState as ArrayState, parsedNum))
                  }
                  className="w-full h-7 rounded bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-200 font-medium"
                >
                  push_back
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  commitFrames(
                    arrayInsertAt(latestState as ArrayState, parsedIdx, parsedNum)
                  )
                }
                className="px-2 h-6 rounded bg-white/[0.06] hover:bg-white/[0.11] text-zinc-200"
              >
                Insert @idx
              </button>
              <button
                type="button"
                onClick={() =>
                  commitFrames(
                    arrayUpdateAt(latestState as ArrayState, parsedIdx, parsedNum)
                  )
                }
                className="px-2 h-6 rounded bg-white/[0.06] hover:bg-white/[0.11] text-zinc-200"
              >
                Update @idx
              </button>
              <button
                type="button"
                onClick={() =>
                  commitFrames(arrayDeleteAt(latestState as ArrayState, parsedIdx))
                }
                className="px-2 h-6 rounded bg-white/[0.06] hover:bg-rose-500/20 text-zinc-200"
              >
                Delete @idx
              </button>
              <button
                type="button"
                onClick={() =>
                  commitFrames(arrayPopBack(latestState as ArrayState))
                }
                className="px-2 h-6 rounded bg-white/[0.06] hover:bg-rose-500/20 text-zinc-200"
              >
                pop_back
              </button>
              <button
                type="button"
                onClick={() =>
                  commitFrames(arraySearch(latestState as ArrayState, parsedNum))
                }
                className="px-2 h-6 rounded bg-white/[0.06] hover:bg-emerald-500/20 text-zinc-200"
              >
                Search val
              </button>
            </div>
          </>
        )}

        {structureId === 'string' && (
          <>
            <div className="grid grid-cols-2 gap-1.5">
              <label className="space-y-0.5">
                <span className="text-[10px] text-zinc-500">Text / Pattern</span>
                <input
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="w-full h-7 px-2 rounded bg-[#0b0b0f] border border-white/[0.08] font-mono text-zinc-200 outline-none"
                />
              </label>
              <label className="space-y-0.5">
                <span className="text-[10px] text-zinc-500">Index</span>
                <input
                  value={idxInput}
                  onChange={(e) => setIdxInput(e.target.value)}
                  className="w-full h-7 px-2 rounded bg-[#0b0b0f] border border-white/[0.08] font-mono text-zinc-200 outline-none"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  commitFrames(
                    stringInsertAt(latestState as StringState, parsedIdx, keyInput)
                  )
                }
                className="px-2 h-6 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-200"
              >
                Insert @idx
              </button>
              <button
                type="button"
                onClick={() =>
                  commitFrames(
                    stringUpdateChar(latestState as StringState, parsedIdx, keyInput)
                  )
                }
                className="px-2 h-6 rounded bg-white/[0.06] hover:bg-white/[0.11] text-zinc-200"
              >
                Update char
              </button>
              <button
                type="button"
                onClick={() =>
                  commitFrames(
                    stringDeleteRange(latestState as StringState, parsedIdx, 1)
                  )
                }
                className="px-2 h-6 rounded bg-white/[0.06] hover:bg-rose-500/20 text-zinc-200"
              >
                Delete @idx
              </button>
              <button
                type="button"
                onClick={() =>
                  commitFrames(
                    stringSearchSubstring(latestState as StringState, keyInput)
                  )
                }
                className="px-2 h-6 rounded bg-white/[0.06] hover:bg-emerald-500/20 text-zinc-200"
              >
                Find Substring
              </button>
              <button
                type="button"
                onClick={() =>
                  commitFrames(stringReverse(latestState as StringState))
                }
                className="px-2 h-6 rounded bg-white/[0.06] hover:bg-white/[0.11] text-zinc-200"
              >
                Reverse
              </button>
            </div>
          </>
        )}

        {structureId === 'linked-list' && (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1.5 flex-1">
                <input
                  value={valInput}
                  onChange={(e) => setValInput(e.target.value)}
                  placeholder="val"
                  className="w-20 h-7 px-2 rounded bg-[#0b0b0f] border border-white/[0.08] font-mono text-zinc-200 outline-none"
                />
                <input
                  value={idxInput}
                  onChange={(e) => setIdxInput(e.target.value)}
                  placeholder="idx"
                  className="w-16 h-7 px-2 rounded bg-[#0b0b0f] border border-white/[0.08] font-mono text-zinc-200 outline-none"
                />
              </div>
              <label className="flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(latestState as LinkedListState).doubly}
                  onChange={(e) => {
                    const st = latestState as LinkedListState;
                    commitFrames([
                      {
                        step: 0,
                        title: e.target.checked
                          ? 'Switched to Doubly Linked List'
                          : 'Switched to Singly Linked List',
                        detail: 'Pointer links updated.',
                        state: { ...st, doubly: e.target.checked },
                      },
                    ]);
                  }}
                  className="accent-sky-400"
                />
                Doubly
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  commitFrames(llInsertHead(latestState as LinkedListState, parsedNum))
                }
                className="px-2 h-6 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-200"
              >
                Insert Head
              </button>
              <button
                type="button"
                onClick={() =>
                  commitFrames(llInsertTail(latestState as LinkedListState, parsedNum))
                }
                className="px-2 h-6 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-200"
              >
                Insert Tail
              </button>
              <button
                type="button"
                onClick={() =>
                  commitFrames(
                    llInsertAt(latestState as LinkedListState, parsedIdx, parsedNum)
                  )
                }
                className="px-2 h-6 rounded bg-white/[0.06] hover:bg-white/[0.11] text-zinc-200"
              >
                Insert @idx
              </button>
              <button
                type="button"
                onClick={() =>
                  commitFrames(
                    llUpdateAt(latestState as LinkedListState, parsedIdx, parsedNum)
                  )
                }
                className="px-2 h-6 rounded bg-white/[0.06] hover:bg-white/[0.11] text-zinc-200"
              >
                Update @idx
              </button>
              <button
                type="button"
                onClick={() =>
                  commitFrames(llDeleteValue(latestState as LinkedListState, parsedNum))
                }
                className="px-2 h-6 rounded bg-white/[0.06] hover:bg-rose-500/20 text-zinc-200"
              >
                Delete val
              </button>
              <button
                type="button"
                onClick={() =>
                  commitFrames(llSearch(latestState as LinkedListState, parsedNum))
                }
                className="px-2 h-6 rounded bg-white/[0.06] hover:bg-emerald-500/20 text-zinc-200"
              >
                Search val
              </button>
              <button
                type="button"
                onClick={() =>
                  commitFrames(llReverse(latestState as LinkedListState))
                }
                className="px-2 h-6 rounded bg-white/[0.06] hover:bg-white/[0.11] text-zinc-200"
              >
                Reverse
              </button>
            </div>
          </>
        )}

        {(structureId === 'stack' || structureId === 'queue') && (
          <div className="flex flex-wrap items-center gap-1.5">
            <input
              value={valInput}
              onChange={(e) => setValInput(e.target.value)}
              className="w-20 h-7 px-2 rounded bg-[#0b0b0f] border border-white/[0.08] font-mono text-zinc-200 outline-none"
            />
            <button
              type="button"
              onClick={() =>
                commitFrames(
                  structureId === 'stack'
                    ? stackPush(latestState as StackState, parsedNum)
                    : queueEnqueue(latestState as QueueState, parsedNum)
                )
              }
              className="px-2.5 h-7 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 font-medium"
            >
              {structureId === 'stack' ? 'Push' : 'Enqueue'}
            </button>
            <button
              type="button"
              onClick={() =>
                commitFrames(
                  structureId === 'stack'
                    ? stackPop(latestState as StackState)
                    : queueDequeue(latestState as QueueState)
                )
              }
              className="px-2.5 h-7 rounded bg-white/[0.06] hover:bg-rose-500/20 text-zinc-200"
            >
              {structureId === 'stack' ? 'Pop' : 'Dequeue'}
            </button>
            <button
              type="button"
              onClick={() =>
                commitFrames(
                  structureId === 'stack'
                    ? stackPeek(latestState as StackState)
                    : queuePeek(latestState as QueueState)
                )
              }
              className="px-2.5 h-7 rounded bg-white/[0.06] hover:bg-white/[0.11] text-zinc-200"
            >
              Peek
            </button>
            <button
              type="button"
              onClick={() =>
                commitFrames(
                  structureId === 'stack'
                    ? stackSearch(latestState as StackState, parsedNum)
                    : queueSearch(latestState as QueueState, parsedNum)
                )
              }
              className="px-2.5 h-7 rounded bg-white/[0.06] hover:bg-emerald-500/20 text-zinc-200"
            >
              Search
            </button>
          </div>
        )}

        {structureId === 'hash-table' && (
          <>
            <div className="grid grid-cols-2 gap-1.5">
              <label className="space-y-0.5">
                <span className="text-[10px] text-zinc-500">Key</span>
                <input
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="w-full h-7 px-2 rounded bg-[#0b0b0f] border border-white/[0.08] font-mono text-zinc-200 outline-none"
                />
              </label>
              <label className="space-y-0.5">
                <span className="text-[10px] text-zinc-500">Value</span>
                <input
                  value={valInput}
                  onChange={(e) => setValInput(e.target.value)}
                  className="w-full h-7 px-2 rounded bg-[#0b0b0f] border border-white/[0.08] font-mono text-zinc-200 outline-none"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  commitFrames(
                    hashInsertOrUpdate(
                      latestState as HashTableState,
                      keyInput,
                      parsedNum
                    )
                  )
                }
                className="px-2 h-6 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-200"
              >
                Insert / Update
              </button>
              <button
                type="button"
                onClick={() =>
                  commitFrames(hashSearch(latestState as HashTableState, keyInput))
                }
                className="px-2 h-6 rounded bg-white/[0.06] hover:bg-emerald-500/20 text-zinc-200"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() =>
                  commitFrames(hashDelete(latestState as HashTableState, keyInput))
                }
                className="px-2 h-6 rounded bg-white/[0.06] hover:bg-rose-500/20 text-zinc-200"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => {
                  const cur = latestState as HashTableState;
                  commitFrames(hashRehash(cur, cur.bucketCount === 7 ? 11 : 7));
                }}
                className="px-2 h-6 rounded bg-white/[0.06] hover:bg-white/[0.11] text-zinc-200"
              >
                Rehash ({(latestState as HashTableState).bucketCount === 7 ? '11' : '7'})
              </button>
            </div>
          </>
        )}

        {structureId === 'binary-tree' && (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                value={valInput}
                onChange={(e) => setValInput(e.target.value)}
                placeholder="val"
                className="w-16 h-7 px-2 rounded bg-[#0b0b0f] border border-white/[0.08] font-mono text-zinc-200 outline-none"
              />
              <input
                value={extraInput}
                onChange={(e) => setExtraInput(e.target.value)}
                placeholder="new val"
                className="w-16 h-7 px-2 rounded bg-[#0b0b0f] border border-white/[0.08] font-mono text-zinc-200 outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  commitFrames(
                    btInsertLevelOrder(latestState as BinaryTreeState, parsedNum)
                  )
                }
                className="px-2 h-7 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-200"
              >
                Insert
              </button>
              <button
                type="button"
                onClick={() =>
                  commitFrames(
                    btUpdateValue(
                      latestState as BinaryTreeState,
                      parsedNum,
                      parsedExtra
                    )
                  )
                }
                className="px-2 h-7 rounded bg-white/[0.06] hover:bg-white/[0.11] text-zinc-200"
              >
                Update
              </button>
              <button
                type="button"
                onClick={() =>
                  commitFrames(
                    btDeleteValue(latestState as BinaryTreeState, parsedNum)
                  )
                }
                className="px-2 h-7 rounded bg-white/[0.06] hover:bg-rose-500/20 text-zinc-200"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() =>
                  commitFrames(btSearch(latestState as BinaryTreeState, parsedNum))
                }
                className="px-2 h-7 rounded bg-white/[0.06] hover:bg-emerald-500/20 text-zinc-200"
              >
                Search
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['inorder', 'preorder', 'postorder', 'levelorder'] as const).map(
                (mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      commitFrames(btTraverse(latestState as BinaryTreeState, mode))
                    }
                    className="px-2 h-6 rounded bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 capitalize"
                  >
                    {mode}
                  </button>
                )
              )}
            </div>
          </>
        )}

        {structureId === 'bst' && (
          <div className="flex flex-wrap items-center gap-1.5">
            <input
              value={valInput}
              onChange={(e) => setValInput(e.target.value)}
              className="w-20 h-7 px-2 rounded bg-[#0b0b0f] border border-white/[0.08] font-mono text-zinc-200 outline-none"
            />
            <button
              type="button"
              onClick={() =>
                commitFrames(bstInsert(latestState as BinaryTreeState, parsedNum))
              }
              className="px-2 h-7 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-200"
            >
              Insert
            </button>
            <button
              type="button"
              onClick={() =>
                commitFrames(bstDelete(latestState as BinaryTreeState, parsedNum))
              }
              className="px-2 h-7 rounded bg-white/[0.06] hover:bg-rose-500/20 text-zinc-200"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() =>
                commitFrames(bstSearch(latestState as BinaryTreeState, parsedNum))
              }
              className="px-2 h-7 rounded bg-white/[0.06] hover:bg-emerald-500/20 text-zinc-200"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() =>
                commitFrames(bstFindMinMax(latestState as BinaryTreeState, 'min'))
              }
              className="px-2 h-7 rounded bg-white/[0.06] hover:bg-white/[0.11] text-zinc-200"
            >
              Min
            </button>
            <button
              type="button"
              onClick={() =>
                commitFrames(bstFindMinMax(latestState as BinaryTreeState, 'max'))
              }
              className="px-2 h-7 rounded bg-white/[0.06] hover:bg-white/[0.11] text-zinc-200"
            >
              Max
            </button>
          </div>
        )}

        {structureId === 'heap' && (
          <div className="flex flex-wrap items-center gap-1.5">
            <input
              value={valInput}
              onChange={(e) => setValInput(e.target.value)}
              className="w-20 h-7 px-2 rounded bg-[#0b0b0f] border border-white/[0.08] font-mono text-zinc-200 outline-none"
            />
            <button
              type="button"
              onClick={() =>
                commitFrames(heapPush(latestState as HeapState, parsedNum))
              }
              className="px-2 h-7 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-200"
            >
              Push
            </button>
            <button
              type="button"
              onClick={() => commitFrames(heapPop(latestState as HeapState))}
              className="px-2 h-7 rounded bg-white/[0.06] hover:bg-rose-500/20 text-zinc-200"
            >
              Pop Top
            </button>
            <button
              type="button"
              onClick={() =>
                commitFrames(heapSearch(latestState as HeapState, parsedNum))
              }
              className="px-2 h-7 rounded bg-white/[0.06] hover:bg-emerald-500/20 text-zinc-200"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                const cur = latestState as HeapState;
                const nextKind = cur.kind === 'min' ? 'max' : 'min';
                commitFrames(heapBuildFromArray(cur.items, nextKind));
              }}
              className="px-2 h-7 rounded bg-white/[0.06] hover:bg-white/[0.11] text-amber-300 font-mono"
            >
              {(latestState as HeapState).kind === 'min' ? 'Min -> Max' : 'Max -> Min'}
            </button>
          </div>
        )}

        {structureId === 'graph' && (
          <>
            <div className="grid grid-cols-3 gap-1.5">
              <input
                value={edgeFrom}
                onChange={(e) => setEdgeFrom(e.target.value)}
                placeholder="from"
                className="h-7 px-2 rounded bg-[#0b0b0f] border border-white/[0.08] font-mono text-zinc-200 outline-none"
              />
              <input
                value={edgeTo}
                onChange={(e) => setEdgeTo(e.target.value)}
                placeholder="to"
                className="h-7 px-2 rounded bg-[#0b0b0f] border border-white/[0.08] font-mono text-zinc-200 outline-none"
              />
              <input
                value={edgeWeight}
                onChange={(e) => setEdgeWeight(e.target.value)}
                placeholder="weight"
                className="h-7 px-2 rounded bg-[#0b0b0f] border border-white/[0.08] font-mono text-zinc-200 outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  commitFrames(graphAddNode(latestState as GraphState, edgeFrom))
                }
                className="px-2 h-6 rounded bg-white/[0.06] hover:bg-white/[0.11] text-zinc-200"
              >
                +Node ({edgeFrom})
              </button>
              <button
                type="button"
                onClick={() =>
                  commitFrames(graphRemoveNode(latestState as GraphState, edgeFrom))
                }
                className="px-2 h-6 rounded bg-white/[0.06] hover:bg-rose-500/20 text-zinc-200"
              >
                -Node ({edgeFrom})
              </button>
              <button
                type="button"
                onClick={() =>
                  commitFrames(
                    graphAddEdge(
                      latestState as GraphState,
                      edgeFrom,
                      edgeTo,
                      Number.parseInt(edgeWeight, 10) || 1
                    )
                  )
                }
                className="px-2 h-6 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-200"
              >
                +Edge
              </button>
              <button
                type="button"
                onClick={() =>
                  commitFrames(
                    graphRemoveEdge(latestState as GraphState, edgeFrom, edgeTo)
                  )
                }
                className="px-2 h-6 rounded bg-white/[0.06] hover:bg-rose-500/20 text-zinc-200"
              >
                -Edge
              </button>
              <button
                type="button"
                onClick={() =>
                  commitFrames(graphSearchNode(latestState as GraphState, edgeFrom))
                }
                className="px-2 h-6 rounded bg-white/[0.06] hover:bg-emerald-500/20 text-zinc-200"
              >
                Find ({edgeFrom})
              </button>
              <label className="ml-auto flex items-center gap-1 text-[11px] text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(latestState as GraphState).directed}
                  onChange={(e) => {
                    const cur = latestState as GraphState;
                    commitFrames([
                      {
                        step: 0,
                        title: e.target.checked ? 'Directed graph' : 'Undirected graph',
                        detail: 'Edge orientation updated.',
                        state: { ...cur, directed: e.target.checked },
                      },
                    ]);
                  }}
                  className="accent-sky-400"
                />
                Directed
              </label>
            </div>
          </>
        )}
      </div>

      {/* Visual Canvas */}
      <div className="rounded-md bg-[#0b0b0f] border border-white/[0.08] p-3 min-h-[150px] overflow-x-auto">
        {structureId === 'array' && (
          <ArrayCanvas
            state={currentFrame.state as ArrayState}
            highlightedIndices={currentFrame.highlightedIndices ?? []}
            secondaryIndices={currentFrame.secondaryIndices ?? []}
          />
        )}
        {structureId === 'string' && (
          <StringCanvas
            state={currentFrame.state as StringState}
            highlightedIndices={currentFrame.highlightedIndices ?? []}
          />
        )}
        {structureId === 'linked-list' && (
          <LinkedListCanvas
            state={currentFrame.state as LinkedListState}
            highlightedIds={currentFrame.highlightedIds ?? []}
          />
        )}
        {structureId === 'stack' && (
          <StackCanvas
            state={currentFrame.state as StackState}
            highlightedIndices={currentFrame.highlightedIndices ?? []}
          />
        )}
        {structureId === 'queue' && (
          <QueueCanvas
            state={currentFrame.state as QueueState}
            highlightedIndices={currentFrame.highlightedIndices ?? []}
          />
        )}
        {structureId === 'hash-table' && (
          <HashTableCanvas
            state={currentFrame.state as HashTableState}
            highlightedIndices={currentFrame.highlightedIndices ?? []}
          />
        )}
        {(structureId === 'binary-tree' || structureId === 'bst') && (
          <TreeCanvas
            state={currentFrame.state as BinaryTreeState}
            highlightedIds={currentFrame.highlightedIds ?? []}
          />
        )}
        {structureId === 'heap' && (
          <HeapCanvas
            state={currentFrame.state as HeapState}
            highlightedIndices={currentFrame.highlightedIndices ?? []}
          />
        )}
        {structureId === 'graph' && (
          <GraphCanvas
            state={currentFrame.state as GraphState}
            highlightedIds={currentFrame.highlightedIds ?? []}
            onUpdateEdgeWeight={(edgeId, w) =>
              commitFrames(
                graphUpdateEdgeWeight(latestState as GraphState, edgeId, w)
              )
            }
          />
        )}
      </div>

      {/* Playback Controls */}
      <PlaybackBar
        step={safeStep}
        totalSteps={frames.length}
        playing={playing}
        speed={speed}
        title={currentFrame.title}
        detail={currentFrame.detail}
        resultSummary={currentFrame.resultSummary}
        onStepChange={setStep}
        onTogglePlay={() => setPlaying((p) => !p)}
        onPause={() => setPlaying(false)}
        onSpeedChange={setSpeed}
      />

      {/* Internal State Inspector */}
      <div className="rounded-md bg-[#121218] border border-white/[0.08] p-2.5 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Internal State Inspector
          </span>
          {structureId === 'graph' && (
            <div className="flex gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => setGraphView('list')}
                className={`px-1.5 py-0.5 rounded ${
                  graphView === 'list' ? 'bg-white/[0.1] text-zinc-100' : 'text-zinc-500'
                }`}
              >
                Adj List
              </button>
              <button
                type="button"
                onClick={() => setGraphView('matrix')}
                className={`px-1.5 py-0.5 rounded ${
                  graphView === 'matrix' ? 'bg-white/[0.1] text-zinc-100' : 'text-zinc-500'
                }`}
              >
                Matrix
              </button>
            </div>
          )}
        </div>
        <InternalStateInspector
          structureId={structureId}
          state={currentFrame.state}
          graphView={graphView}
        />
      </div>
    </div>
  );
}

function ArrayCanvas({
  state,
  highlightedIndices,
  secondaryIndices,
}: {
  state: ArrayState;
  highlightedIndices: number[];
  secondaryIndices: number[];
}) {
  const slots = Array.from({ length: state.capacity }, (_, i) => i);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {slots.map((idx) => {
          const occupied = idx < state.items.length;
          const isHi = highlightedIndices.includes(idx);
          const isSec = secondaryIndices.includes(idx);
          return (
            <div key={idx} className="flex flex-col items-center gap-1">
              <div
                className={`w-10 h-10 rounded flex items-center justify-center font-mono text-xs border transition-colors ${
                  !occupied
                    ? 'border-dashed border-white/[0.08] text-zinc-700 bg-transparent'
                    : isHi
                      ? 'bg-sky-500/25 border-sky-400 text-sky-100 font-semibold'
                      : isSec
                        ? 'bg-zinc-800/70 border-zinc-600 text-zinc-400'
                        : 'bg-[#16161e] border-white/[0.12] text-zinc-200'
                }`}
              >
                {occupied ? state.items[idx] : '·'}
              </div>
              <span className="font-mono text-[10px] text-zinc-500">[{idx}]</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StringCanvas({
  state,
  highlightedIndices,
}: {
  state: StringState;
  highlightedIndices: number[];
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {state.chars.map((ch, idx) => {
        const isHi = highlightedIndices.includes(idx);
        return (
          <div key={`${idx}-${ch}`} className="flex flex-col items-center gap-0.5">
            <div
              className={`w-8 h-9 rounded flex items-center justify-center font-mono text-xs border ${
                isHi
                  ? 'bg-sky-500/25 border-sky-400 text-sky-100 font-semibold'
                  : 'bg-[#16161e] border-white/[0.12] text-zinc-200'
              }`}
            >
              {ch === ' ' ? '␣' : ch}
            </div>
            <span className="font-mono text-[9px] text-zinc-500">{idx}</span>
          </div>
        );
      })}
    </div>
  );
}

function LinkedListCanvas({
  state,
  highlightedIds,
}: {
  state: LinkedListState;
  highlightedIds: string[];
}) {
  if (state.nodes.length === 0) {
    return <div className="font-mono text-xs text-zinc-500">head -&gt; nullptr</div>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {state.nodes.map((node, idx) => {
        const isHi = highlightedIds.includes(node.id);
        return (
          <React.Fragment key={node.id}>
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={`px-2.5 py-2 rounded border font-mono text-xs flex items-center gap-2 ${
                  isHi
                    ? 'bg-sky-500/25 border-sky-400 text-sky-100 font-semibold'
                    : 'bg-[#16161e] border-white/[0.12] text-zinc-200'
                }`}
              >
                <span>{node.value}</span>
                <span className="text-[9px] text-zinc-500 border-l border-white/[0.08] pl-1.5">
                  {state.doubly ? '⇄' : '→'}
                </span>
              </div>
              <span className="text-[9px] font-mono text-zinc-500">
                {idx === 0 ? 'HEAD' : idx === state.nodes.length - 1 ? 'TAIL' : `[${idx}]`}
              </span>
            </div>
            {idx < state.nodes.length - 1 ? (
              <span className="font-mono text-zinc-500 text-xs">
                {state.doubly ? '⇄' : '→'}
              </span>
            ) : (
              <span className="font-mono text-[11px] text-zinc-500 flex items-center gap-1">
                <ArrowRight className="w-3 h-3" />
                nullptr
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function StackCanvas({
  state,
  highlightedIndices,
}: {
  state: StackState;
  highlightedIndices: number[];
}) {
  if (state.items.length === 0) {
    return <div className="font-mono text-xs text-zinc-500">(empty stack)</div>;
  }
  const reversed = state.items
    .map((v, i) => ({ v, i }))
    .reverse();
  return (
    <div className="flex flex-col items-center gap-1">
      {reversed.map(({ v, i }) => {
        const isHi = highlightedIndices.includes(i);
        const isTop = i === state.items.length - 1;
        return (
          <div
            key={i}
            className={`w-36 h-8 rounded border px-3 flex items-center justify-between font-mono text-xs ${
              isHi
                ? 'bg-sky-500/25 border-sky-400 text-sky-100 font-semibold'
                : 'bg-[#16161e] border-white/[0.12] text-zinc-200'
            }`}
          >
            <span>{v}</span>
            <span className="text-[10px] text-zinc-500">
              {isTop ? 'TOP' : `[${i}]`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function QueueCanvas({
  state,
  highlightedIndices,
}: {
  state: QueueState;
  highlightedIndices: number[];
}) {
  if (state.items.length === 0) {
    return <div className="font-mono text-xs text-zinc-500">(empty queue)</div>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-mono text-emerald-400">FRONT →</span>
      {state.items.map((v, idx) => {
        const isHi = highlightedIndices.includes(idx);
        return (
          <div
            key={idx}
            className={`w-11 h-9 rounded border flex items-center justify-center font-mono text-xs ${
              isHi
                ? 'bg-sky-500/25 border-sky-400 text-sky-100 font-semibold'
                : 'bg-[#16161e] border-white/[0.12] text-zinc-200'
            }`}
          >
            {v}
          </div>
        );
      })}
      <span className="text-[10px] font-mono text-amber-400">← BACK</span>
    </div>
  );
}

function HashTableCanvas({
  state,
  highlightedIndices,
}: {
  state: HashTableState;
  highlightedIndices: number[];
}) {
  return (
    <div className="space-y-1.5">
      {state.buckets.map((bucket, idx) => {
        const isHi = highlightedIndices.includes(idx);
        return (
          <div key={idx} className="flex items-center gap-2 font-mono text-[11px]">
            <div
              className={`w-8 h-6 rounded flex items-center justify-center border shrink-0 ${
                isHi
                  ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                  : 'bg-[#16161e] border-white/[0.1] text-zinc-400'
              }`}
            >
              {idx}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {bucket.length === 0 ? (
                <span className="text-zinc-600">∅</span>
              ) : (
                bucket.map((entry, eIdx) => (
                  <React.Fragment key={entry.key}>
                    <span className="px-2 py-0.5 rounded bg-[#16161e] border border-white/[0.1] text-zinc-200">
                      {entry.key}: <span className="text-sky-300">{entry.value}</span>
                    </span>
                    {eIdx < bucket.length - 1 && (
                      <span className="text-zinc-600">→</span>
                    )}
                  </React.Fragment>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TreeCanvas({
  state,
  highlightedIds,
}: {
  state: BinaryTreeState;
  highlightedIds: string[];
}) {
  const layout = useMemo(() => computeTreeLayout(state.root), [state.root]);
  if (layout.nodes.length === 0) {
    return <div className="font-mono text-xs text-zinc-500">(empty tree)</div>;
  }
  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="w-full max-h-60"
      >
        {layout.edges.map((e) => (
          <line
            key={`${e.fromId}-${e.toId}`}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={1.6}
          />
        ))}
        {layout.nodes.map((n) => {
          const isHi = highlightedIds.includes(n.id);
          return (
            <g key={n.id}>
              <circle
                cx={n.x}
                cy={n.y}
                r={17}
                fill={isHi ? 'rgba(56,189,248,0.28)' : '#16161e'}
                stroke={isHi ? '#38bdf8' : 'rgba(255,255,255,0.2)'}
                strokeWidth={isHi ? 2 : 1.2}
              />
              <text
                x={n.x}
                y={n.y + 4}
                textAnchor="middle"
                className="fill-zinc-100 font-mono text-[11px]"
              >
                {n.value}
              </text>
            </g>
          );
        })}
      </svg>
      {state.traversalOrder && state.traversalOrder.length > 0 && (
        <div className="font-mono text-[11px] text-emerald-300">
          Traversal: [{state.traversalOrder.join(', ')}]
        </div>
      )}
    </div>
  );
}

function HeapCanvas({
  state,
  highlightedIndices,
}: {
  state: HeapState;
  highlightedIndices: number[];
}) {
  const layout = useMemo(() => heapToTreeLayout(state.items), [state.items]);
  if (state.items.length === 0) {
    return <div className="font-mono text-xs text-zinc-500">(empty heap)</div>;
  }
  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="w-full max-h-52"
      >
        {layout.edges.map((e) => (
          <line
            key={`${e.fromId}-${e.toId}`}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={1.6}
          />
        ))}
        {layout.nodes.map((n) => {
          const idx = Number.parseInt(n.id.replace('h-', ''), 10);
          const isHi = highlightedIndices.includes(idx);
          return (
            <g key={n.id}>
              <circle
                cx={n.x}
                cy={n.y}
                r={17}
                fill={isHi ? 'rgba(56,189,248,0.28)' : '#16161e'}
                stroke={isHi ? '#38bdf8' : 'rgba(255,255,255,0.2)'}
                strokeWidth={isHi ? 2 : 1.2}
              />
              <text
                x={n.x}
                y={n.y + 4}
                textAnchor="middle"
                className="fill-zinc-100 font-mono text-[11px]"
              >
                {n.value}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-1">
        {state.items.map((v, i) => {
          const isHi = highlightedIndices.includes(i);
          return (
            <div
              key={i}
              className={`px-2 py-1 rounded border font-mono text-[11px] ${
                isHi
                  ? 'bg-sky-500/25 border-sky-400 text-sky-100'
                  : 'bg-[#16161e] border-white/[0.1] text-zinc-300'
              }`}
            >
              [{i}] {v}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GraphCanvas({
  state,
  highlightedIds,
  onUpdateEdgeWeight,
}: {
  state: GraphState;
  highlightedIds: string[];
  onUpdateEdgeWeight: (edgeId: string, weight: number) => void;
}) {
  const positioned = useMemo(
    () => computeGraphCircularLayout(state.nodes, 380, 210),
    [state.nodes]
  );
  const posMap = useMemo(
    () => new Map(positioned.map((n) => [n.id, n])),
    [positioned]
  );

  if (state.nodes.length === 0) {
    return <div className="font-mono text-xs text-zinc-500">(empty graph)</div>;
  }

  return (
    <svg viewBox="0 0 380 210" className="w-full max-h-56">
      {state.directed && (
        <defs>
          <marker
            id="cpex-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="21"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L0,6 L7,3 z" fill="rgba(148,163,184,0.8)" />
          </marker>
        </defs>
      )}
      {state.edges.map((e) => {
        const u = posMap.get(e.from);
        const v = posMap.get(e.to);
        if (!u || !v) return null;
        const mx = (u.x + v.x) / 2;
        const my = (u.y + v.y) / 2;
        return (
          <g key={e.id}>
            <line
              x1={u.x}
              y1={u.y}
              x2={v.x}
              y2={v.y}
              stroke="rgba(255,255,255,0.22)"
              strokeWidth={1.6}
              markerEnd={state.directed ? 'url(#cpex-arrow)' : undefined}
            />
            {e.weight !== 1 && (
              <g
                onClick={() => onUpdateEdgeWeight(e.id, e.weight + 1)}
                className="cursor-pointer"
              >
                <rect
                  x={mx - 10}
                  y={my - 9}
                  width={20}
                  height={16}
                  rx={4}
                  fill="#0b0b0f"
                  stroke="rgba(255,255,255,0.16)"
                />
                <text
                  x={mx}
                  y={my + 3}
                  textAnchor="middle"
                  className="fill-amber-300 font-mono text-[10px]"
                >
                  {e.weight}
                </text>
              </g>
            )}
          </g>
        );
      })}
      {positioned.map((n) => {
        const isHi = highlightedIds.includes(n.id);
        return (
          <g key={n.id}>
            <circle
              cx={n.x}
              cy={n.y}
              r={16}
              fill={isHi ? 'rgba(56,189,248,0.28)' : '#16161e'}
              stroke={isHi ? '#38bdf8' : 'rgba(255,255,255,0.24)'}
              strokeWidth={isHi ? 2 : 1.2}
            />
            <text
              x={n.x}
              y={n.y + 4}
              textAnchor="middle"
              className="fill-zinc-100 font-mono text-[11px]"
            >
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function InternalStateInspector({
  structureId,
  state,
  graphView,
}: {
  structureId: DataStructureId;
  state: unknown;
  graphView: 'list' | 'matrix';
}) {
  if (structureId === 'array') {
    const s = state as ArrayState;
    return (
      <div className="font-mono text-[11px] text-zinc-300 space-y-0.5">
        <div>
          size={s.items.length} · capacity={s.capacity} · free={s.capacity - s.items.length}
        </div>
        <div className="text-zinc-400">[{s.items.join(', ')}]</div>
      </div>
    );
  }
  if (structureId === 'string') {
    const s = state as StringState;
    return (
      <div className="font-mono text-[11px] text-zinc-300">
        length={s.chars.length} · &quot;{s.chars.join('')}&quot;
      </div>
    );
  }
  if (structureId === 'linked-list') {
    const s = state as LinkedListState;
    return (
      <div className="font-mono text-[11px] text-zinc-300">
        mode={s.doubly ? 'doubly' : 'singly'} · length={s.nodes.length} · head=
        {s.nodes[0]?.value ?? 'nullptr'} · tail=
        {s.nodes[s.nodes.length - 1]?.value ?? 'nullptr'}
      </div>
    );
  }
  if (structureId === 'stack') {
    const s = state as StackState;
    return (
      <div className="font-mono text-[11px] text-zinc-300">
        size={s.items.length} · top={s.items[s.items.length - 1] ?? 'empty'}
      </div>
    );
  }
  if (structureId === 'queue') {
    const s = state as QueueState;
    return (
      <div className="font-mono text-[11px] text-zinc-300">
        size={s.items.length} · front={s.items[0] ?? 'empty'} · back=
        {s.items[s.items.length - 1] ?? 'empty'}
      </div>
    );
  }
  if (structureId === 'hash-table') {
    const s = state as HashTableState;
    const m = getHashTableMetrics(s);
    return (
      <div className="font-mono text-[11px] text-zinc-300">
        buckets={s.bucketCount} · items={m.itemCount} · load={m.loadFactor} · collisions=
        {m.collisions} · maxChain={m.maxChain}
      </div>
    );
  }
  if (structureId === 'binary-tree' || structureId === 'bst') {
    const s = state as BinaryTreeState;
    const m = getTreeMetrics(s.root);
    return (
      <div className="font-mono text-[11px] text-zinc-300 space-y-0.5">
        <div>
          nodes={m.nodeCount} · height={m.height} · leaves={m.leafCount}
          {structureId === 'bst'
            ? ` · validBST=${isValidBst(s.root) ? 'true' : 'false'}`
            : ''}
        </div>
        <div className="text-zinc-400">
          inorder=[{bstInorder(s.root).join(', ')}]
        </div>
      </div>
    );
  }
  if (structureId === 'heap') {
    const s = state as HeapState;
    return (
      <div className="font-mono text-[11px] text-zinc-300">
        kind={s.kind}-heap · size={s.items.length} · top={s.items[0] ?? 'empty'}
      </div>
    );
  }
  const g = state as GraphState;
  if (graphView === 'list') {
    const adj = buildAdjacencyList(g);
    return (
      <div className="font-mono text-[11px] text-zinc-300 space-y-0.5 max-h-28 overflow-auto">
        {Object.entries(adj).map(([u, nbrs]) => (
          <div key={u}>
            {u}: [{nbrs.map((x) => `${x.to}(w:${x.weight})`).join(', ')}]
          </div>
        ))}
      </div>
    );
  }
  const { labels, matrix } = buildAdjacencyMatrix(g);
  return (
    <div className="font-mono text-[10px] text-zinc-300 overflow-auto max-h-28">
      <div>  {labels.join(' ')}</div>
      {matrix.map((row, i) => (
        <div key={labels[i]}>
          {labels[i]} {row.map((cell) => (cell === null ? '·' : cell)).join(' ')}
        </div>
      ))}
    </div>
  );
}
