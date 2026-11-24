'use client';

import React, { useMemo, useState } from 'react';
import {
  Beaker,
  BookmarkCheck,
  Boxes,
  Check,
  Copy,
  Eye,
  FileCode2,
  FolderCode,
  GitBranch,
  GitCompare,
  GitPullRequestDraft,
  History,
  PanelLeftClose,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Workflow,
} from 'lucide-react';
import { CPP_TEMPLATES, type CppTemplate } from '@/lib/compiler/templates';
import type { CompilerConfig, CompilerRuntimeStatus } from '@/lib/compiler/types';
import {
  ALGORITHMS_CATALOG,
  DATA_STRUCTURES_CATALOG,
  type AlgorithmId,
  type DataStructureId,
} from '@/lib/dsa/types';
import type {
  GitHubSessionInfo,
  GitHubTargetConfig,
} from '@/lib/github/types';
import { GitHubSidebarPanel } from '../github/GitHubSidebarPanel';
import type {
  EditorSettings,
  ExecutionRecord,
  Experiment,
  FileTab,
} from '@/types/workspace';

export type SidebarSection =
  | 'experiments'
  | 'files'
  | 'structures'
  | 'algorithms'
  | 'github'
  | 'versions'
  | 'history'
  | 'settings';

interface LeftSidebarProps {
  section: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
  onCollapse: () => void;
  experiments: Experiment[];
  activeExperiment: Experiment;
  onSelectExperiment: (id: string) => void;
  onCreateBlankExperiment: (isTemporary: boolean) => void;
  onRenameExperiment: (id: string, name: string) => void;
  onDuplicateExperiment: (id: string) => void;
  onPromoteExperiment: (id: string) => void;
  onDeleteExperiment: (id: string) => void;
  files: FileTab[];
  activeFile: string;
  entryFile: string;
  onSelectFile: (name: string) => void;
  onSetEntryFile: (name: string) => void;
  onLoadTemplate: (template: CppTemplate, mode: 'new' | 'replace') => void;
  onCreateVersion: (label: string) => void;
  onRestoreVersion: (versionId: string, autoBackup: boolean) => void;
  onDeleteVersion: (versionId: string) => void;
  onCompareSources: (leftKey: string, rightKey: string) => void;
  history: ExecutionRecord[];
  onInspectHistoryRecord: (record: ExecutionRecord) => void;
  onRestoreHistoryRecord: (record: ExecutionRecord) => void;
  onClearHistory: () => void;
  compilerConfig: CompilerConfig;
  onUpdateCompilerConfig: (patch: Partial<CompilerConfig>) => void;
  editorSettings: EditorSettings;
  onUpdateEditorSettings: (patch: Partial<EditorSettings>) => void;
  runtimeStatus: CompilerRuntimeStatus;
  onPreloadCompiler: () => void;
  onResetCompiler: () => void;
  activeStructureId: DataStructureId;
  activeAlgorithmId: AlgorithmId;
  onSelectStructure: (id: DataStructureId) => void;
  onSelectAlgorithm: (id: AlgorithmId) => void;
  githubSession: GitHubSessionInfo | null;
  githubSessionLoading: boolean;
  githubTarget: GitHubTargetConfig;
  onGitHubTargetChange: (next: GitHubTargetConfig) => void;
  onOpenPushModal: () => void;
  onPullFileFromGitHub: (fileName: string, content: string) => void;
  onRefreshGitHubSession: () => Promise<void>;
  onDisconnectGitHub: () => Promise<void>;
}

function formatShortTime(iso: string): string {
  if (!iso) return 'Starter';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function LeftSidebar({
  section,
  onSectionChange,
  onCollapse,
  experiments,
  activeExperiment,
  onSelectExperiment,
  onCreateBlankExperiment,
  onRenameExperiment,
  onDuplicateExperiment,
  onPromoteExperiment,
  onDeleteExperiment,
  files,
  activeFile,
  entryFile,
  onSelectFile,
  onSetEntryFile,
  onLoadTemplate,
  onCreateVersion,
  onRestoreVersion,
  onDeleteVersion,
  onCompareSources,
  history,
  onInspectHistoryRecord,
  onRestoreHistoryRecord,
  onClearHistory,
  compilerConfig,
  onUpdateCompilerConfig,
  editorSettings,
  onUpdateEditorSettings,
  runtimeStatus,
  onPreloadCompiler,
  onResetCompiler,
  activeStructureId,
  activeAlgorithmId,
  onSelectStructure,
  onSelectAlgorithm,
  githubSession,
  githubSessionLoading,
  githubTarget,
  onGitHubTargetChange,
  onOpenPushModal,
  onPullFileFromGitHub,
  onRefreshGitHubSession,
  onDisconnectGitHub,
}: LeftSidebarProps) {
  // Experiments state
  const [expSearch, setExpSearch] = useState('');
  const [expFilter, setExpFilter] = useState<'all' | 'saved' | 'scratch'>('all');
  const [renamingExpId, setRenamingExpId] = useState<string | null>(null);
  const [renameExpVal, setRenameExpVal] = useState('');
  const [confirmDeleteExpId, setConfirmDeleteExpId] = useState<string | null>(null);

  // Templates state
  const [confirmTemplateId, setConfirmTemplateId] = useState<string | null>(null);

  // Versions state
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [autoBackupOnRestore, setAutoBackupOnRestore] = useState(true);
  const [confirmRestoreVerId, setConfirmRestoreVerId] = useState<string | null>(null);
  const [confirmDeleteVerId, setConfirmDeleteVerId] = useState<string | null>(null);

  // History state
  const [historyFilter, setHistoryFilter] = useState<'all' | 'success' | 'errors'>('all');

  const filteredExperiments = useMemo(() => {
    const q = expSearch.trim().toLowerCase();
    return experiments.filter((exp) => {
      if (expFilter === 'saved' && exp.isTemporary) return false;
      if (expFilter === 'scratch' && !exp.isTemporary) return false;
      if (q && !exp.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [experiments, expSearch, expFilter]);

  const filteredHistory = useMemo(() => {
    return history.filter((rec) => {
      if (historyFilter === 'success') return rec.result.status === 'success';
      if (historyFilter === 'errors') return rec.result.status !== 'success';
      return true;
    });
  }, [history, historyFilter]);

  const navItems: Array<{
    id: SidebarSection;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    {
      id: 'experiments',
      label: 'Experiments',
      icon: <Beaker className="w-4 h-4" />,
      badge: experiments.length,
    },
    {
      id: 'files',
      label: 'Files & Templates',
      icon: <FolderCode className="w-4 h-4" />,
    },
    {
      id: 'structures',
      label: 'Data Structures',
      icon: <Boxes className="w-4 h-4" />,
      badge: DATA_STRUCTURES_CATALOG.length,
    },
    {
      id: 'algorithms',
      label: 'Algorithms',
      icon: <Workflow className="w-4 h-4" />,
      badge: ALGORITHMS_CATALOG.length,
    },
    {
      id: 'github',
      label: 'GitHub Repos',
      icon: <GitPullRequestDraft className="w-4 h-4" />,
    },
    {
      id: 'versions',
      label: 'Code Versions',
      icon: <GitBranch className="w-4 h-4" />,
      badge: activeExperiment.versions.length || undefined,
    },
    {
      id: 'history',
      label: 'Run History',
      icon: <History className="w-4 h-4" />,
      badge: history.length || undefined,
    },
    {
      id: 'settings',
      label: 'Compiler & Editor',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const handleSaveSnapshot = () => {
    onCreateVersion(snapshotLabel);
    setSnapshotLabel('');
  };

  return (
    <div className="flex h-full bg-[#101014] border-r border-white/[0.08] select-none">
      {/* Narrow Icon Rail */}
      <div className="w-11 flex flex-col items-center py-2 gap-1.5 border-r border-white/[0.06] bg-[#0d0d10] shrink-0">
        {navItems.map((item) => {
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSectionChange(item.id)}
              title={item.label}
              className={`relative w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                active
                  ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05]'
              }`}
            >
              {item.icon}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-zinc-800 border border-white/10 text-[9px] font-mono text-zinc-300 flex items-center justify-center">
                  {item.badge > 99 ? '99' : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Drawer Body */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center justify-between h-9 px-3 border-b border-white/[0.06] shrink-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 truncate">
            {navItems.find((n) => n.id === section)?.label}
          </span>
          <button
            type="button"
            onClick={onCollapse}
            className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06]"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-3">
          {section === 'experiments' && (
            <>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => onCreateBlankExperiment(false)}
                  className="flex-1 flex items-center justify-center gap-1 h-7 rounded bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-xs font-medium text-sky-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New
                </button>
                <button
                  type="button"
                  onClick={() => onCreateBlankExperiment(true)}
                  className="flex-1 flex items-center justify-center gap-1 h-7 rounded bg-white/[0.06] hover:bg-white/[0.11] border border-white/[0.08] text-xs font-medium text-zinc-200 transition-colors"
                  title="Create temporary scratch experiment"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Scratch
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2 top-2" />
                <input
                  value={expSearch}
                  onChange={(e) => setExpSearch(e.target.value)}
                  placeholder="Filter experiments..."
                  className="w-full h-7 pl-7 pr-2 rounded bg-[#0c0c0f] border border-white/[0.08] focus:border-sky-500/40 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none"
                />
              </div>

              <div className="flex gap-1 text-[11px]">
                {(['all', 'saved', 'scratch'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setExpFilter(f)}
                    className={`flex-1 h-6 rounded capitalize transition-colors ${
                      expFilter === f
                        ? 'bg-white/[0.1] text-zinc-100 font-medium'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                {filteredExperiments.length === 0 ? (
                  <div className="text-xs text-zinc-500 px-1 py-3 text-center">
                    No matching experiments.
                  </div>
                ) : (
                  filteredExperiments.map((exp) => {
                    const isActive = exp.id === activeExperiment.id;
                    const isRenaming = renamingExpId === exp.id;
                    const isConfirmDelete = confirmDeleteExpId === exp.id;

                    return (
                      <div
                        key={exp.id}
                        onClick={() => {
                          if (!isRenaming) onSelectExperiment(exp.id);
                        }}
                        className={`rounded-md border p-2 transition-colors cursor-pointer space-y-1.5 ${
                          isActive
                            ? 'bg-[#171821] border-sky-500/40'
                            : 'bg-[#131318] border-white/[0.06] hover:border-white/[0.12]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          {isRenaming ? (
                            <div
                              className="flex items-center gap-1 flex-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                autoFocus
                                value={renameExpVal}
                                onChange={(e) => setRenameExpVal(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    if (renameExpVal.trim()) {
                                      onRenameExperiment(exp.id, renameExpVal.trim());
                                    }
                                    setRenamingExpId(null);
                                  }
                                  if (e.key === 'Escape') setRenamingExpId(null);
                                }}
                                onBlur={() => {
                                  if (renameExpVal.trim()) {
                                    onRenameExperiment(exp.id, renameExpVal.trim());
                                  }
                                  setRenamingExpId(null);
                                }}
                                className="flex-1 bg-[#0b0b0e] border border-sky-500/50 rounded px-1.5 py-0.5 text-xs text-zinc-100 outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (renameExpVal.trim()) {
                                    onRenameExperiment(exp.id, renameExpVal.trim());
                                  }
                                  setRenamingExpId(null);
                                }}
                                className="text-sky-400"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-xs font-medium truncate ${
                                    isActive ? 'text-zinc-100' : 'text-zinc-300'
                                  }`}
                                >
                                  {exp.name}
                                </span>
                                {exp.isTemporary && (
                                  <span className="shrink-0 px-1 py-0 rounded bg-amber-500/15 border border-amber-500/30 text-[9px] uppercase tracking-wider text-amber-300">
                                    Scratch
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                {exp.files.length} {exp.files.length === 1 ? 'file' : 'files'} ·{' '}
                                {exp.versions.length}v · {exp.history.length} runs
                              </div>
                            </div>
                          )}
                        </div>

                        {isConfirmDelete ? (
                          <div
                            className="flex items-center gap-1.5 pt-1 border-t border-white/[0.06]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteExperiment(exp.id);
                                setConfirmDeleteExpId(null);
                              }}
                              className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-200 border border-rose-500/30 text-[10px]"
                            >
                              Confirm Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteExpId(null)}
                              className="px-2 py-0.5 rounded text-[10px] text-zinc-400 hover:text-zinc-200"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div
                            className="flex items-center justify-between pt-1 border-t border-white/[0.05] text-zinc-500"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setRenamingExpId(exp.id);
                                  setRenameExpVal(exp.name);
                                }}
                                title="Rename experiment"
                                className="p-1 rounded hover:bg-white/[0.07] hover:text-zinc-200"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDuplicateExperiment(exp.id)}
                                title="Duplicate experiment"
                                className="p-1 rounded hover:bg-white/[0.07] hover:text-zinc-200"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              {!isActive && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onCompareSources(`experiment:${exp.id}`, 'current')
                                  }
                                  title="Compare with active experiment"
                                  className="p-1 rounded hover:bg-white/[0.07] hover:text-sky-300"
                                >
                                  <GitCompare className="w-3 h-3" />
                                </button>
                              )}
                              {exp.isTemporary && (
                                <button
                                  type="button"
                                  onClick={() => onPromoteExperiment(exp.id)}
                                  title="Save scratch experiment permanently"
                                  className="p-1 rounded hover:bg-white/[0.07] hover:text-emerald-300"
                                >
                                  <BookmarkCheck className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            {experiments.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteExpId(exp.id)}
                                title="Delete experiment"
                                className="p-1 rounded hover:bg-rose-500/15 hover:text-rose-300"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {section === 'files' && (
            <>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 px-1.5 mb-1.5">
                  Virtual Filesystem
                </div>
                <div className="space-y-0.5">
                  {files.map((f) => {
                    const isActive = f.name === activeFile;
                    const isEntry = f.name === entryFile;
                    const isSource = /\.(cpp|cc|cxx|c)$/i.test(f.name);
                    return (
                      <div
                        key={f.name}
                        onClick={() => onSelectFile(f.name)}
                        className={`flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                          isActive
                            ? 'bg-white/[0.08] text-zinc-100'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileCode2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span className="font-mono truncate">{f.name}</span>
                        </div>
                        {isSource && !isEntry && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSetEntryFile(f.name);
                            }}
                            className="text-[10px] text-zinc-500 hover:text-sky-300 px-1"
                            title="Set as entry file"
                          >
                            set entry
                          </button>
                        )}
                        {isEntry && (
                          <span className="text-[10px] text-sky-400/90 font-mono">
                            entry
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 px-1.5 mb-1.5">
                  <Sparkles className="w-3 h-3 text-sky-400" />
                  C++17 Templates
                </div>
                <div className="space-y-1.5">
                  {CPP_TEMPLATES.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="rounded-md bg-[#14141a] border border-white/[0.06] p-2 space-y-1.5"
                    >
                      <div className="text-xs font-medium text-zinc-200">
                        {tpl.name}
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-snug">
                        {tpl.description}
                      </p>
                      {confirmTemplateId === tpl.id ? (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              onLoadTemplate(tpl, 'new');
                              setConfirmTemplateId(null);
                            }}
                            className="px-2 py-0.5 rounded text-[11px] bg-sky-500/20 text-sky-200 border border-sky-500/30 hover:bg-sky-500/30"
                          >
                            New Experiment
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onLoadTemplate(tpl, 'replace');
                              setConfirmTemplateId(null);
                            }}
                            className="px-2 py-0.5 rounded text-[11px] bg-white/[0.08] text-zinc-200 hover:bg-white/[0.14]"
                          >
                            Replace Current
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmTemplateId(null)}
                            className="px-1.5 py-0.5 rounded text-[11px] text-zinc-400 hover:text-zinc-200"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmTemplateId(tpl.id)}
                          className="text-[11px] text-sky-400 hover:text-sky-300 font-medium"
                        >
                          Use Template →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {section === 'structures' && (
            <div className="space-y-1.5">
              {DATA_STRUCTURES_CATALOG.map((item) => {
                const isActive = activeStructureId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectStructure(item.id)}
                    className={`w-full text-left rounded-md border p-2 transition-colors ${
                      isActive
                        ? 'bg-[#171821] border-sky-500/40'
                        : 'bg-[#14141a] border-white/[0.06] hover:border-white/[0.14]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-100">
                        {item.name}
                      </span>
                      <span className="font-mono text-[10px] text-sky-300">
                        {item.shortName}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
                      {item.description}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {section === 'algorithms' && (
            <div className="space-y-3">
              {(['Searching', 'Sorting', 'Techniques', 'Graph'] as const).map(
                (cat) => (
                  <div key={cat} className="space-y-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 px-1">
                      {cat}
                    </div>
                    <div className="space-y-1">
                      {ALGORITHMS_CATALOG.filter((a) => a.category === cat).map(
                        (item) => {
                          const isActive = activeAlgorithmId === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => onSelectAlgorithm(item.id)}
                              className={`w-full text-left rounded-md border p-2 transition-colors ${
                                isActive
                                  ? 'bg-[#171821] border-sky-500/40'
                                  : 'bg-[#14141a] border-white/[0.06] hover:border-white/[0.14]'
                              }`}
                            >
                              <div className="text-xs font-medium text-zinc-100">
                                {item.name}
                              </div>
                              <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
                                {item.description}
                              </p>
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {section === 'github' && (
            <GitHubSidebarPanel
              session={githubSession}
              sessionLoading={githubSessionLoading}
              target={githubTarget}
              activeFileName={activeFile}
              onTargetChange={onGitHubTargetChange}
              onOpenPushModal={onOpenPushModal}
              onPullFileContent={onPullFileFromGitHub}
              onRefreshSession={onRefreshGitHubSession}
              onDisconnect={onDisconnectGitHub}
            />
          )}

          {section === 'versions' && (
            <div className="space-y-3">
              <div className="rounded-md bg-[#14141a] border border-white/[0.07] p-2 space-y-2">
                <div className="text-[11px] font-medium text-zinc-300">
                  Save Code Snapshot
                </div>
                <input
                  value={snapshotLabel}
                  onChange={(e) => setSnapshotLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveSnapshot();
                  }}
                  placeholder="e.g. O(n log n) approach"
                  className="w-full h-7 px-2 rounded bg-[#0b0b0e] border border-white/[0.08] focus:border-sky-500/40 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none"
                />
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleSaveSnapshot}
                    className="flex-1 h-7 rounded bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-xs font-medium text-sky-200 transition-colors"
                  >
                    Create Snapshot
                  </button>
                  {activeExperiment.versions.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        onCompareSources(
                          `version:${activeExperiment.versions[0].id}`,
                          'current'
                        )
                      }
                      className="h-7 px-2 rounded bg-white/[0.06] hover:bg-white/[0.11] text-zinc-200 text-xs"
                      title="Compare latest snapshot vs current code"
                    >
                      Diff
                    </button>
                  )}
                </div>
              </div>

              <label className="flex items-center justify-between px-1 text-[11px] text-zinc-400 cursor-pointer">
                <span>Auto-backup current on restore</span>
                <input
                  type="checkbox"
                  checked={autoBackupOnRestore}
                  onChange={(e) => setAutoBackupOnRestore(e.target.checked)}
                  className="accent-sky-400"
                />
              </label>

              {activeExperiment.versions.length === 0 ? (
                <p className="text-xs text-zinc-500 px-1">
                  No saved snapshots yet. Capture versions as you iterate on approaches.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {activeExperiment.versions.map((ver) => {
                    const isRestoreConfirm = confirmRestoreVerId === ver.id;
                    const isDeleteConfirm = confirmDeleteVerId === ver.id;

                    return (
                      <div
                        key={ver.id}
                        className="rounded-md bg-[#14141a] border border-white/[0.06] p-2 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] px-1.5 py-0 rounded bg-sky-500/15 text-sky-300 border border-sky-500/25">
                            v{ver.versionNumber}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {formatShortTime(ver.createdAt)}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-200 font-medium break-words">
                          {ver.label}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500">
                          {ver.files.length} {ver.files.length === 1 ? 'file' : 'files'} ·{' '}
                          {ver.testCases.length} tests
                          {ver.metrics
                            ? ` · ${ver.metrics.status}${
                                ver.metrics.executionTimeMs !== null
                                  ? ` (${ver.metrics.executionTimeMs}ms)`
                                  : ''
                              }`
                            : ''}
                        </div>

                        {isRestoreConfirm ? (
                          <div className="flex items-center gap-1.5 pt-1 border-t border-white/[0.06]">
                            <button
                              type="button"
                              onClick={() => {
                                onRestoreVersion(ver.id, autoBackupOnRestore);
                                setConfirmRestoreVerId(null);
                              }}
                              className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30 text-[10px]"
                            >
                              Confirm Restore
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRestoreVerId(null)}
                              className="px-1.5 py-0.5 text-[10px] text-zinc-400 hover:text-zinc-200"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : isDeleteConfirm ? (
                          <div className="flex items-center gap-1.5 pt-1 border-t border-white/[0.06]">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteVersion(ver.id);
                                setConfirmDeleteVerId(null);
                              }}
                              className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-200 border border-rose-500/30 text-[10px]"
                            >
                              Delete Snapshot
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteVerId(null)}
                              className="px-1.5 py-0.5 text-[10px] text-zinc-400 hover:text-zinc-200"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between pt-1 border-t border-white/[0.05] text-[11px]">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  onCompareSources(`version:${ver.id}`, 'current')
                                }
                                className="flex items-center gap-1 text-sky-400 hover:text-sky-300"
                              >
                                <GitCompare className="w-3 h-3" />
                                Compare
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmRestoreVerId(ver.id)}
                                className="flex items-center gap-1 text-amber-300 hover:text-amber-200"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Restore
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteVerId(ver.id)}
                              className="text-zinc-500 hover:text-rose-300 p-0.5"
                              title="Delete snapshot"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {section === 'history' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] text-zinc-500">
                  {filteredHistory.length} / {history.length} runs
                </span>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearHistory}
                    className="text-[11px] text-zinc-400 hover:text-rose-300"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex gap-1 text-[11px]">
                {(['all', 'success', 'errors'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setHistoryFilter(f)}
                    className={`flex-1 h-6 rounded capitalize transition-colors ${
                      historyFilter === f
                        ? 'bg-white/[0.1] text-zinc-100 font-medium'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {filteredHistory.length === 0 ? (
                <p className="text-xs text-zinc-500 px-1">
                  Run your C++ code to record execution history for this experiment.
                </p>
              ) : (
                filteredHistory.map((rec) => (
                  <div
                    key={rec.id}
                    className="rounded-md bg-[#14141a] border border-white/[0.06] p-2 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span
                        className={`font-mono px-1.5 py-0 rounded ${
                          rec.result.status === 'success'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : rec.result.status === 'compile-error'
                              ? 'bg-rose-500/15 text-rose-300'
                              : 'bg-orange-500/15 text-orange-300'
                        }`}
                      >
                        {rec.result.status}
                      </span>
                      <span className="text-zinc-500 font-mono">
                        {rec.timestamp}
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-zinc-400 truncate">
                      {rec.result.stdout
                        ? rec.result.stdout.slice(0, 80)
                        : rec.result.errorMessage ?? '(no stdout)'}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {rec.result.cachedCompile
                        ? '0ms compile'
                        : `${rec.result.compileTimeMs}ms compile`}
                      {rec.result.executionTimeMs !== null
                        ? ` · ${rec.result.executionTimeMs}ms run`
                        : ''}
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.05] text-[11px]">
                      <button
                        type="button"
                        onClick={() => onInspectHistoryRecord(rec)}
                        className="flex items-center gap-1 text-zinc-300 hover:text-zinc-100"
                        title="Inspect output without changing editor code"
                      >
                        <Eye className="w-3 h-3" />
                        Inspect
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onCompareSources(`history:${rec.id}`, 'current')
                        }
                        className="flex items-center gap-1 text-sky-400 hover:text-sky-300"
                        title="Diff historical code vs current"
                      >
                        <GitCompare className="w-3 h-3" />
                        Diff
                      </button>
                      <button
                        type="button"
                        onClick={() => onRestoreHistoryRecord(rec)}
                        className="flex items-center gap-1 text-amber-300 hover:text-amber-200"
                        title="Restore code snapshot into editor"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restore
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {section === 'settings' && (
            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  C++ Compiler
                </div>

                <label className="block space-y-1">
                  <span className="text-zinc-400">Language Standard</span>
                  <select
                    value={compilerConfig.std}
                    onChange={(e) =>
                      onUpdateCompilerConfig({
                        std: e.target.value as CompilerConfig['std'],
                      })
                    }
                    className="w-full h-8 rounded bg-[#14141a] border border-white/[0.08] px-2 text-zinc-200 outline-none"
                  >
                    <option value="c++17">C++17 (-std=c++17)</option>
                    <option value="c++20">C++20 (-std=c++20)</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-zinc-400">Optimization Level</span>
                  <select
                    value={compilerConfig.optLevel}
                    onChange={(e) =>
                      onUpdateCompilerConfig({
                        optLevel: e.target.value as CompilerConfig['optLevel'],
                      })
                    }
                    className="w-full h-8 rounded bg-[#14141a] border border-white/[0.08] px-2 text-zinc-200 outline-none"
                  >
                    <option value="-O0">-O0 (Fast compile)</option>
                    <option value="-O1">-O1 (Balanced)</option>
                    <option value="-O2">-O2 (Optimized)</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-zinc-400">Execution Timeout</span>
                  <select
                    value={compilerConfig.timeoutMs}
                    onChange={(e) =>
                      onUpdateCompilerConfig({
                        timeoutMs: Number(e.target.value),
                      })
                    }
                    className="w-full h-8 rounded bg-[#14141a] border border-white/[0.08] px-2 text-zinc-200 outline-none"
                  >
                    <option value={1000}>1 second</option>
                    <option value={3000}>3 seconds</option>
                    <option value={5000}>5 seconds</option>
                    <option value={10000}>10 seconds</option>
                    <option value={20000}>20 seconds</option>
                    <option value={30000}>30 seconds</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-zinc-400">WASM Memory Limit</span>
                  <select
                    value={compilerConfig.memoryLimitMb}
                    onChange={(e) =>
                      onUpdateCompilerConfig({
                        memoryLimitMb: Number(
                          e.target.value
                        ) as CompilerConfig['memoryLimitMb'],
                      })
                    }
                    className="w-full h-8 rounded bg-[#14141a] border border-white/[0.08] px-2 text-zinc-200 outline-none"
                  >
                    <option value={32}>32 MB</option>
                    <option value={64}>64 MB</option>
                    <option value={128}>128 MB</option>
                    <option value={256}>256 MB</option>
                  </select>
                </label>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Monaco Editor
                </div>

                <label className="block space-y-1">
                  <span className="text-zinc-400">
                    Font Size ({editorSettings.fontSize}px)
                  </span>
                  <input
                    type="range"
                    min={12}
                    max={18}
                    value={editorSettings.fontSize}
                    onChange={(e) =>
                      onUpdateEditorSettings({
                        fontSize: Number(e.target.value),
                      })
                    }
                    className="w-full accent-sky-400"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-zinc-400">Indent Width</span>
                  <select
                    value={editorSettings.tabSize}
                    onChange={(e) =>
                      onUpdateEditorSettings({
                        tabSize: Number(e.target.value) as 2 | 4,
                      })
                    }
                    className="w-full h-8 rounded bg-[#14141a] border border-white/[0.08] px-2 text-zinc-200 outline-none"
                  >
                    <option value={2}>2 spaces</option>
                    <option value={4}>4 spaces</option>
                  </select>
                </label>

                <label className="flex items-center justify-between py-1 cursor-pointer">
                  <span className="text-zinc-300">Show Minimap</span>
                  <input
                    type="checkbox"
                    checked={editorSettings.minimap}
                    onChange={(e) =>
                      onUpdateEditorSettings({ minimap: e.target.checked })
                    }
                    className="accent-sky-400"
                  />
                </label>

                <label className="flex items-center justify-between py-1 cursor-pointer">
                  <span className="text-zinc-300">Word Wrap</span>
                  <input
                    type="checkbox"
                    checked={editorSettings.wordWrap}
                    onChange={(e) =>
                      onUpdateEditorSettings({ wordWrap: e.target.checked })
                    }
                    className="accent-sky-400"
                  />
                </label>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  WASM Compiler Worker
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onPreloadCompiler}
                    disabled={
                      runtimeStatus.loaded ||
                      runtimeStatus.phase === 'loading-compiler'
                    }
                    className="flex-1 h-7 rounded bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 disabled:opacity-40"
                  >
                    Preload
                  </button>
                  <button
                    type="button"
                    onClick={onResetCompiler}
                    disabled={!runtimeStatus.loaded}
                    className="flex-1 h-7 rounded bg-white/[0.06] hover:bg-rose-500/20 text-zinc-300 hover:text-rose-200 disabled:opacity-40"
                  >
                    Unload
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
