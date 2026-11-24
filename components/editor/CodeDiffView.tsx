'use client';

import React, { useMemo, useState } from 'react';
import { DiffEditor, type DiffBeforeMount } from '@monaco-editor/react';
import {
  ArrowLeftRight,
  Columns2,
  GitCompare,
  RotateCcw,
  Rows2,
  X,
} from 'lucide-react';
import type { EditorSettings, Experiment, FileTab } from '@/types/workspace';

interface CodeDiffViewProps {
  activeExperiment: Experiment;
  allExperiments: Experiment[];
  initialLeftKey: string;
  initialRightKey: string;
  initialFile: string;
  editorSettings: EditorSettings;
  onRestoreVersion: (versionId: string) => void;
  onClose: () => void;
}

interface CompareSource {
  key: string;
  label: string;
  group: 'current' | 'versions' | 'history' | 'experiments';
  files: FileTab[];
  versionId?: string;
}

function buildSources(
  activeExperiment: Experiment,
  allExperiments: Experiment[]
): CompareSource[] {
  const sources: CompareSource[] = [
    {
      key: 'current',
      label: `Current — ${activeExperiment.name}`,
      group: 'current',
      files: activeExperiment.files,
    },
  ];

  for (const ver of activeExperiment.versions) {
    sources.push({
      key: `version:${ver.id}`,
      label: `v${ver.versionNumber}: ${ver.label}`,
      group: 'versions',
      files: ver.files,
      versionId: ver.id,
    });
  }

  for (const rec of activeExperiment.history) {
    const recFiles: FileTab[] = Object.entries(rec.filesSnapshot).map(
      ([name, content]) => ({ name, content })
    );
    sources.push({
      key: `history:${rec.id}`,
      label: `Run ${rec.timestamp} (${rec.result.status})`,
      group: 'history',
      files: recFiles,
    });
  }

  for (const exp of allExperiments) {
    if (exp.id === activeExperiment.id) continue;
    sources.push({
      key: `experiment:${exp.id}`,
      label: `Experiment: ${exp.name}`,
      group: 'experiments',
      files: exp.files,
    });
  }

  return sources;
}

export default function CodeDiffView({
  activeExperiment,
  allExperiments,
  initialLeftKey,
  initialRightKey,
  initialFile,
  editorSettings,
  onRestoreVersion,
  onClose,
}: CodeDiffViewProps) {
  const sources = useMemo(
    () => buildSources(activeExperiment, allExperiments),
    [activeExperiment, allExperiments]
  );

  const [leftKey, setLeftKey] = useState(initialLeftKey);
  const [rightKey, setRightKey] = useState(initialRightKey);
  const [selectedFile, setSelectedFile] = useState(initialFile);
  const [sideBySide, setSideBySide] = useState(true);

  const leftSource = useMemo(
    () => sources.find((s) => s.key === leftKey) ?? sources[0],
    [sources, leftKey]
  );

  const rightSource = useMemo(
    () => sources.find((s) => s.key === rightKey) ?? sources[0],
    [sources, rightKey]
  );

  const availableFiles = useMemo(() => {
    const names = new Set<string>();
    for (const f of leftSource.files) names.add(f.name);
    for (const f of rightSource.files) names.add(f.name);
    return Array.from(names);
  }, [leftSource, rightSource]);

  const effectiveFile = availableFiles.includes(selectedFile)
    ? selectedFile
    : (availableFiles[0] ?? 'main.cpp');

  const originalCode =
    leftSource.files.find((f) => f.name === effectiveFile)?.content ??
    '// (file not present in this snapshot)\n';
  const modifiedCode =
    rightSource.files.find((f) => f.name === effectiveFile)?.content ??
    '// (file not present in this snapshot)\n';

  const handleBeforeMount: DiffBeforeMount = (monaco) => {
    monaco.editor.defineTheme('cpex-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
        { token: 'keyword', foreground: '7dd3fc' },
        { token: 'keyword.directive', foreground: 'c4b5fd' },
        { token: 'string', foreground: '86efac' },
        { token: 'number', foreground: 'fdba74' },
        { token: 'type', foreground: '93c5fd' },
        { token: 'identifier', foreground: 'e4e4e7' },
      ],
      colors: {
        'editor.background': '#0c0c0f',
        'editor.foreground': '#e4e4e7',
        'editor.lineHighlightBackground': '#14141a',
        'editor.selectionBackground': '#264f7866',
        'editorLineNumber.foreground': '#52525b',
        'editorLineNumber.activeForeground': '#a1a1aa',
        'editorGutter.background': '#0c0c0f',
      },
    });
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0c0c0f]">
      {/* Diff Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#111116] border-b border-white/[0.08] shrink-0 text-xs">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 text-sky-300 font-medium">
            <GitCompare className="w-3.5 h-3.5" />
            <span>Compare</span>
          </div>

          <select
            aria-label="Original (left) comparison source"
            value={leftSource.key}
            onChange={(e) => setLeftKey(e.target.value)}
            className="h-7 max-w-[200px] rounded bg-[#18181f] border border-white/[0.1] px-2 text-zinc-200 outline-none focus:border-sky-500/50"
          >
            {sources.map((src) => (
              <option key={src.key} value={src.key}>
                {src.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              const prevLeft = leftSource.key;
              setLeftKey(rightSource.key);
              setRightKey(prevLeft);
            }}
            className="p-1.5 rounded bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300"
            title="Swap left and right"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>

          <select
            aria-label="Modified (right) comparison source"
            value={rightSource.key}
            onChange={(e) => setRightKey(e.target.value)}
            className="h-7 max-w-[200px] rounded bg-[#18181f] border border-white/[0.1] px-2 text-zinc-200 outline-none focus:border-sky-500/50"
          >
            {sources.map((src) => (
              <option key={src.key} value={src.key}>
                {src.label}
              </option>
            ))}
          </select>

          <select
            aria-label="File to compare"
            value={effectiveFile}
            onChange={(e) => setSelectedFile(e.target.value)}
            className="h-7 rounded bg-[#18181f] border border-white/[0.1] px-2 font-mono text-zinc-200 outline-none focus:border-sky-500/50"
          >
            {availableFiles.map((fname) => (
              <option key={fname} value={fname}>
                {fname}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {leftSource.versionId && (
            <button
              type="button"
              onClick={() => {
                if (leftSource.versionId) onRestoreVersion(leftSource.versionId);
              }}
              className="flex items-center gap-1 h-7 px-2.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/30 transition-colors"
              title="Restore this version as current code (auto-backs up current)"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restore Left</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setSideBySide((v) => !v)}
            className="flex items-center gap-1 h-7 px-2.5 rounded bg-white/[0.06] hover:bg-white/[0.11] text-zinc-200 border border-white/[0.08] transition-colors"
            title={sideBySide ? 'Switch to inline diff' : 'Switch to side-by-side diff'}
          >
            {sideBySide ? (
              <>
                <Rows2 className="w-3.5 h-3.5" />
                <span>Inline</span>
              </>
            ) : (
              <>
                <Columns2 className="w-3.5 h-3.5" />
                <span>Side-by-Side</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 h-7 px-2.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* Diff Editor */}
      <div className="flex-1 min-h-0">
        <DiffEditor
          height="100%"
          language="cpp"
          theme="cpex-dark"
          original={originalCode}
          modified={modifiedCode}
          originalModelPath={`diff-orig://${leftSource.key}/${effectiveFile}`}
          modifiedModelPath={`diff-mod://${rightSource.key}/${effectiveFile}`}
          keepCurrentOriginalModel
          keepCurrentModifiedModel
          beforeMount={handleBeforeMount}
          loading={
            <div className="flex h-full items-center justify-center text-xs font-mono text-zinc-500">
              Loading Monaco Diff Viewer...
            </div>
          }
          options={{
            readOnly: true,
            renderSideBySide: sideBySide,
            fontFamily: 'var(--font-geist-mono), Consolas, monospace',
            fontSize: editorSettings.fontSize,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: editorSettings.wordWrap ? 'on' : 'off',
            diffWordWrap: editorSettings.wordWrap ? 'on' : 'off',
          }}
        />
      </div>
    </div>
  );
}
