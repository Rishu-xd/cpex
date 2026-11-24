'use client';

import React, { useState } from 'react';
import { FileCode2, Plus, X, Check } from 'lucide-react';
import type { CompilerDiagnostic } from '@/lib/compiler/types';
import type { FileTab } from '@/types/workspace';

interface EditorTabsProps {
  files: FileTab[];
  activeFile: string;
  entryFile: string;
  diagnostics: CompilerDiagnostic[];
  onSelectFile: (name: string) => void;
  onCreateFile: (name: string) => void;
  onDeleteFile: (name: string) => void;
  onRenameFile: (oldName: string, newName: string) => void;
}

export function EditorTabs({
  files,
  activeFile,
  entryFile,
  diagnostics,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
}: EditorTabsProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const submitCreate = () => {
    const trimmed = newName.trim().replace(/\s+/g, '_');
    if (!trimmed) {
      setCreating(false);
      return;
    }
    const normalized = /\.(cpp|cc|cxx|hpp|h)$/i.test(trimmed)
      ? trimmed
      : `${trimmed}.hpp`;
    onCreateFile(normalized);
    setNewName('');
    setCreating(false);
  };

  const submitRename = () => {
    if (!renamingFile) return;
    const trimmed = renameValue.trim().replace(/\s+/g, '_');
    if (trimmed && trimmed !== renamingFile) {
      onRenameFile(renamingFile, trimmed);
    }
    setRenamingFile(null);
    setRenameValue('');
  };

  return (
    <div className="flex items-center h-9 bg-[#0e0e12] border-b border-white/[0.08] px-2 gap-1 overflow-x-auto shrink-0">
      {files.map((file) => {
        const isActive = file.name === activeFile;
        const isEntry = file.name === entryFile;
        const fileDiags = diagnostics.filter((d) => d.file === file.name);
        const hasError = fileDiags.some((d) => d.severity === 'error');
        const hasWarning = !hasError && fileDiags.some((d) => d.severity === 'warning');

        if (renamingFile === file.name) {
          return (
            <div
              key={file.name}
              className="flex items-center gap-1 bg-zinc-800 border border-sky-500/50 rounded px-2 py-0.5 text-xs"
            >
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitRename();
                  if (e.key === 'Escape') setRenamingFile(null);
                }}
                onBlur={submitRename}
                className="bg-transparent text-zinc-100 outline-none font-mono w-28"
              />
              <button
                type="button"
                onClick={submitRename}
                className="text-sky-400 hover:text-sky-300"
                title="Confirm rename"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          );
        }

        return (
          <div
            key={file.name}
            onClick={() => onSelectFile(file.name)}
            onDoubleClick={() => {
              setRenamingFile(file.name);
              setRenameValue(file.name);
            }}
            className={`group flex items-center gap-1.5 h-7 px-2.5 rounded-t border-b-2 text-xs font-mono cursor-pointer transition-colors shrink-0 ${
              isActive
                ? 'bg-[#15151b] text-zinc-100 border-sky-400'
                : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
            title="Double-click to rename"
          >
            <FileCode2
              className={`w-3.5 h-3.5 ${
                isActive ? 'text-sky-400' : 'text-zinc-500'
              }`}
            />
            <span>{file.name}</span>
            {isEntry && (
              <span className="text-[10px] font-sans uppercase tracking-wider px-1 py-0 rounded bg-white/[0.07] text-zinc-400">
                entry
              </span>
            )}
            {hasError && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-rose-500"
                title="Has compilation errors"
              />
            )}
            {hasWarning && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-amber-400"
                title="Has compiler warnings"
              />
            )}
            {files.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFile(file.name);
                }}
                className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-200 transition-opacity ml-0.5"
                title={`Close ${file.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}

      {creating ? (
        <div className="flex items-center gap-1 bg-zinc-900 border border-white/15 rounded px-2 py-0.5 text-xs ml-1">
          <input
            autoFocus
            placeholder="helper.hpp"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitCreate();
              if (e.key === 'Escape') {
                setCreating(false);
                setNewName('');
              }
            }}
            onBlur={submitCreate}
            className="bg-transparent text-zinc-100 outline-none font-mono w-28 placeholder:text-zinc-600"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 h-6 px-2 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors ml-1 shrink-0"
          title="Add C++ source or header file"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New File</span>
        </button>
      )}
    </div>
  );
}
