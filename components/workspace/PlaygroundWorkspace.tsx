'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { cppRuntime } from '@/lib/compiler/runtime';
import { type CppTemplate } from '@/lib/compiler/templates';
import {
  type CompilerConfig,
  type CompilerRuntimeStatus,
  type ExecutionResult,
} from '@/lib/compiler/types';
import {
  addVersionSnapshot,
  createBlankExperiment,
  createExperimentFromTemplate,
  createInitialStoreState,
  duplicateExperiment,
  loadStoreFromLocalStorage,
  restoreVersionInExperiment,
  saveStoreToLocalStorage,
} from '@/lib/experiments/store';
import type {
  EditorSettings,
  ExecutionRecord,
  Experiment,
  ExperimentsStoreState,
  FileTab,
  JumpTarget,
  TestCaseRunResult,
} from '@/types/workspace';
import { TopBar } from './TopBar';
import { LeftSidebar, type SidebarSection } from './LeftSidebar';
import { RightPanel } from './RightPanel';
import { ResizeHandle } from './ResizeHandle';
import { EditorTabs } from '../editor/EditorTabs';
import { BottomPanel, type BottomTabId } from '../terminal/BottomPanel';
import { DsaToolkitPanel } from '../visualizer/DsaToolkitPanel';
import type { AlgorithmId, DataStructureId } from '@/lib/dsa/types';
import { PushCommitModal } from '../github/PushCommitModal';
import { githubBridge } from '@/lib/github/bridge';
import type { GitHubSessionInfo, GitHubTargetConfig } from '@/lib/github/types';

const CppEditor = dynamic(() => import('../editor/CppEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[#0c0c0f] text-xs font-mono text-zinc-500">
      Loading Monaco Editor...
    </div>
  ),
});

const CodeDiffView = dynamic(() => import('../editor/CodeDiffView'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[#0c0c0f] text-xs font-mono text-zinc-500">
      Loading Monaco Diff Viewer...
    </div>
  ),
});

function formatClockTime(): string {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function PlaygroundWorkspace() {
  const [store, setStore] = useState<ExperimentsStoreState>(createInitialStoreState);
  const [hydrated, setHydrated] = useState(false);

  const [runtimeStatus, setRuntimeStatus] = useState<CompilerRuntimeStatus>({
    phase: 'idle',
    loaded: false,
    progressPercent: null,
    clangVersion: null,
    message: 'Compiler idle (lazy-loaded on first run)',
  });

  const [isBusy, setIsBusy] = useState(false);
  const [lastResult, setLastResult] = useState<ExecutionResult | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestCaseRunResult>>({});
  const [jumpTarget, setJumpTarget] = useState<JumpTarget | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Comparison view state
  const [compareState, setCompareState] = useState<{
    open: boolean;
    leftKey: string;
    rightKey: string;
    file: string;
    nonce: number;
  }>({
    open: false,
    leftKey: 'current',
    rightKey: 'current',
    file: 'main.cpp',
    nonce: 0,
  });

  // Panel visibility & dimensions
  const [leftOpen, setLeftOpen] = useState(true);
  const [leftWidth, setLeftWidth] = useState(268);
  const [sidebarSection, setSidebarSection] = useState<SidebarSection>('experiments');

  const [rightOpen, setRightOpen] = useState(true);
  const [rightWidth, setRightWidth] = useState(290);
  const [rightPanelMode, setRightPanelMode] = useState<'inspector' | 'dsa'>('inspector');

  // DSA Toolkit state
  const [dsaMode, setDsaMode] = useState<'structures' | 'algorithms'>('structures');
  const [activeStructureId, setActiveStructureId] = useState<DataStructureId>('array');
  const [activeAlgorithmId, setActiveAlgorithmId] = useState<AlgorithmId>('binary-search');
  const [dsaExpanded, setDsaExpanded] = useState(false);

  // GitHub OAuth & Push state
  const [githubSession, setGithubSession] = useState<GitHubSessionInfo | null>(null);
  const [githubSessionLoading, setGithubSessionLoading] = useState(true);
  const [pushModalOpen, setPushModalOpen] = useState(false);
  const [oauthNotice, setOauthNotice] = useState<{
    tone: 'success' | 'error';
    text: string;
  } | null>(null);

  const [bottomCollapsed, setBottomCollapsed] = useState(false);
  const [bottomHeight, setBottomHeight] = useState(250);
  const [bottomTab, setBottomTab] = useState<BottomTabId>('terminal');

  const idCounterRef = useRef(1);
  const makeId = (prefix: string) => {
    idCounterRef.current += 1;
    return `${prefix}-${Date.now()}-${idCounterRef.current}`;
  };

  // Subscribe to compiler runtime status
  useEffect(() => {
    return cppRuntime.subscribeStatus(setRuntimeStatus);
  }, []);

  // Hydrate persisted v2 store (or migrate v1) safely on client
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const loaded = loadStoreFromLocalStorage();
      if (loaded) {
        setStore(loaded);
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Autosave store to localStorage after hydration
  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => {
      saveStoreToLocalStorage(store);
    }, 500);
    return () => clearTimeout(timer);
  }, [hydrated, store]);

  const refreshGitHubSession = useCallback(async () => {
    try {
      const data = await githubBridge.getSession();
      setGithubSession(data);
    } catch {
      // Ignore network failure
    } finally {
      setGithubSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      void refreshGitHubSession();
      try {
        const url = new URL(window.location.href);
        const ghStatus = url.searchParams.get('github');
        if (ghStatus === 'connected') {
          setOauthNotice({
            tone: 'success',
            text: 'GitHub account connected. Select a repository and branch to push.',
          });
          setLeftOpen(true);
          setSidebarSection('github');
          url.searchParams.delete('github');
          url.searchParams.delete('reason');
          window.history.replaceState({}, '', url.pathname + url.search);
        } else if (ghStatus === 'error') {
          const reason = url.searchParams.get('reason') ?? 'oauth_failed';
          setOauthNotice({
            tone: 'error',
            text: `GitHub connection failed (${reason}).`,
          });
          setLeftOpen(true);
          setSidebarSection('github');
          url.searchParams.delete('github');
          url.searchParams.delete('reason');
          window.history.replaceState({}, '', url.pathname + url.search);
        }
      } catch {
        // Ignore URL parsing errors
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refreshGitHubSession]);

  const activeExperiment: Experiment = useMemo(() => {
    return (
      store.experiments.find((e) => e.id === store.activeExperimentId) ??
      store.experiments[0]
    );
  }, [store.experiments, store.activeExperimentId]);

  const updateActiveExperiment = useCallback(
    (updater: (exp: Experiment) => Experiment) => {
      const nowIso = new Date().toISOString();
      setStore((prev) => ({
        ...prev,
        experiments: prev.experiments.map((exp) =>
          exp.id === prev.activeExperimentId
            ? { ...updater(exp), updatedAt: nowIso }
            : exp
        ),
      }));
    },
    []
  );

  const activeFileObj: FileTab = useMemo(() => {
    return (
      activeExperiment.files.find((f) => f.name === activeExperiment.activeFile) ??
      activeExperiment.files[0]
    );
  }, [activeExperiment.files, activeExperiment.activeFile]);

  const filesMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of activeExperiment.files) {
      map[f.name] = f.content;
    }
    return map;
  }, [activeExperiment.files]);

  const testPassSummary = useMemo(() => {
    const entries = Object.values(testResults);
    if (entries.length === 0) return null;
    const passed = entries.filter((e) => e.passed === true).length;
    return { passed, total: activeExperiment.testCases.length };
  }, [testResults, activeExperiment.testCases.length]);

  const appendHistoryToExperiment = useCallback(
    (
      targetExpId: string,
      entryFile: string,
      result: ExecutionResult,
      usedStdin: string,
      snapshot: Record<string, string>
    ) => {
      const rec: ExecutionRecord = {
        id: makeId('run'),
        timestamp: formatClockTime(),
        entryFile,
        stdinPreview: usedStdin.slice(0, 60),
        filesSnapshot: snapshot,
        result,
      };
      setStore((prev) => ({
        ...prev,
        experiments: prev.experiments.map((exp) =>
          exp.id === targetExpId
            ? {
              ...exp,
              history: [rec, ...exp.history].slice(0, 30),
            }
            : exp
        ),
      }));
    },
    []
  );

  const handleSave = useCallback(() => {
    const nowLabel = formatClockTime();
    const nowIso = new Date().toISOString();
    setStore((prev) => {
      const next: ExperimentsStoreState = {
        ...prev,
        experiments: prev.experiments.map((exp) =>
          exp.id === prev.activeExperimentId
            ? {
              ...exp,
              isTemporary: false,
              lastSavedAt: nowLabel,
              updatedAt: nowIso,
            }
            : exp
        ),
      };
      saveStoreToLocalStorage(next);
      return next;
    });
    setIsDirty(false);
  }, []);

  const handleRun = useCallback(async () => {
    if (isBusy) return;
    setIsBusy(true);
    setBottomCollapsed(false);

    const targetExpId = activeExperiment.id;
    const entry = activeExperiment.entryFile;
    const usedStdin = activeExperiment.stdin;
    const snapshot = { ...filesMap };

    const res = await cppRuntime.run(
      snapshot,
      entry,
      usedStdin,
      store.compilerConfig
    );
    setLastResult(res);
    appendHistoryToExperiment(targetExpId, entry, res, usedStdin, snapshot);

    if (res.status === 'compile-error') {
      setBottomTab('errors');
    } else if (res.status === 'runtime-error' || res.status === 'timeout') {
      setBottomTab('terminal');
    } else if (res.status === 'success') {
      setBottomTab((curr) => (curr === 'terminal' ? 'terminal' : 'output'));
    }

    setIsBusy(false);
  }, [
    isBusy,
    activeExperiment.id,
    activeExperiment.entryFile,
    activeExperiment.stdin,
    filesMap,
    store.compilerConfig,
    appendHistoryToExperiment,
  ]);

  const handleStop = useCallback(() => {
    cppRuntime.cancel();
  }, []);

  const handleRunAllTests = useCallback(async () => {
    if (isBusy || activeExperiment.testCases.length === 0) return;
    setIsBusy(true);
    setBottomCollapsed(false);
    setBottomTab('test-cases');
    setTestResults({});

    const snapshot = { ...filesMap };
    const outcomes = await cppRuntime.runTestCases(
      snapshot,
      activeExperiment.entryFile,
      activeExperiment.testCases,
      store.compilerConfig,
      (outcome) => {
        setTestResults((prev) => ({
          ...prev,
          [outcome.testCaseId]: outcome,
        }));
      }
    );

    if (outcomes.length > 0) {
      const last = outcomes[outcomes.length - 1].result;
      setLastResult(last);
      if (last.status === 'compile-error') {
        setBottomTab('errors');
      }
    }
    setIsBusy(false);
  }, [
    isBusy,
    activeExperiment.testCases,
    activeExperiment.entryFile,
    filesMap,
    store.compilerConfig,
  ]);

  const handleRunSingleTest = useCallback(
    async (testCaseId: string) => {
      if (isBusy) return;
      const tc = activeExperiment.testCases.find((t) => t.id === testCaseId);
      if (!tc) return;

      setIsBusy(true);
      setBottomCollapsed(false);
      setBottomTab('test-cases');

      const outcomes = await cppRuntime.runTestCases(
        { ...filesMap },
        activeExperiment.entryFile,
        [tc],
        store.compilerConfig,
        (outcome) => {
          setTestResults((prev) => ({
            ...prev,
            [outcome.testCaseId]: outcome,
          }));
        }
      );

      if (outcomes[0]) {
        setLastResult(outcomes[0].result);
        if (outcomes[0].result.status === 'compile-error') {
          setBottomTab('errors');
        }
      }
      setIsBusy(false);
    },
    [
      isBusy,
      activeExperiment.testCases,
      activeExperiment.entryFile,
      filesMap,
      store.compilerConfig,
    ]
  );

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        void handleRunAllTests();
      } else if (mod && e.key === 'Enter') {
        e.preventDefault();
        void handleRun();
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape' && isBusy) {
        e.preventDefault();
        handleStop();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleRun, handleRunAllTests, handleSave, handleStop, isBusy]);

  // Experiment management handlers
  const handleSelectExperiment = (id: string) => {
    if (id === activeExperiment.id) return;
    setStore((prev) => ({ ...prev, activeExperimentId: id }));
    setLastResult(null);
    setTestResults({});
    setCompareState((prev) => ({ ...prev, open: false }));
    setIsDirty(false);
  };

  const handleCreateBlankExperiment = (isTemporary: boolean) => {
    const count = store.experiments.length + 1;
    const id = makeId('exp');
    const nowIso = new Date().toISOString();
    const label = isTemporary ? `Scratch ${count}` : `Experiment ${count}`;
    const nextExp = createBlankExperiment(label, id, nowIso, isTemporary);

    setStore((prev) => ({
      ...prev,
      experiments: [nextExp, ...prev.experiments],
      activeExperimentId: nextExp.id,
    }));
    setLastResult(null);
    setTestResults({});
    setCompareState((prev) => ({ ...prev, open: false }));
    setIsDirty(false);
  };

  const handleDuplicateExperiment = (id: string) => {
    const source = store.experiments.find((e) => e.id === id);
    if (!source) return;
    const copyId = makeId('exp');
    const nowIso = new Date().toISOString();
    const copy = duplicateExperiment(source, copyId, nowIso);

    setStore((prev) => ({
      ...prev,
      experiments: [copy, ...prev.experiments],
      activeExperimentId: copy.id,
    }));
    setLastResult(null);
    setTestResults({});
    setCompareState((prev) => ({ ...prev, open: false }));
    setIsDirty(false);
  };

  const handleRenameExperiment = (id: string, name: string) => {
    setStore((prev) => ({
      ...prev,
      experiments: prev.experiments.map((e) =>
        e.id === id ? { ...e, name, updatedAt: new Date().toISOString() } : e
      ),
    }));
  };

  const handlePromoteExperiment = (id: string) => {
    const nowIso = new Date().toISOString();
    const nowClock = formatClockTime();
    setStore((prev) => ({
      ...prev,
      experiments: prev.experiments.map((e) =>
        e.id === id
          ? {
            ...e,
            isTemporary: false,
            lastSavedAt: nowClock,
            updatedAt: nowIso,
          }
          : e
      ),
    }));
  };

  const handleDeleteExperiment = (id: string) => {
    if (store.experiments.length <= 1) return;
    setStore((prev) => {
      const remaining = prev.experiments.filter((e) => e.id !== id);
      const nextActiveId =
        prev.activeExperimentId === id ? remaining[0].id : prev.activeExperimentId;
      return {
        ...prev,
        experiments: remaining,
        activeExperimentId: nextActiveId,
      };
    });
    if (activeExperiment.id === id) {
      setLastResult(null);
      setTestResults({});
      setCompareState((prev) => ({ ...prev, open: false }));
    }
  };

  // Version handlers
  const handleCreateVersion = (label: string) => {
    const versionId = makeId('ver');
    const nowIso = new Date().toISOString();
    const metrics = lastResult
      ? {
        status: lastResult.status,
        compileTimeMs: lastResult.compileTimeMs,
        executionTimeMs: lastResult.executionTimeMs,
      }
      : undefined;

    updateActiveExperiment((exp) =>
      addVersionSnapshot(exp, label, versionId, nowIso, metrics)
    );
    setLeftOpen(true);
    setSidebarSection('versions');
  };

  const handleRestoreVersion = (versionId: string, autoBackup: boolean) => {
    const backupId = makeId('ver');
    const nowIso = new Date().toISOString();
    updateActiveExperiment((exp) =>
      restoreVersionInExperiment(exp, versionId, backupId, nowIso, autoBackup)
    );
    setCompareState((prev) => ({ ...prev, open: false }));
    setIsDirty(true);
  };

  const handleDeleteVersion = (versionId: string) => {
    updateActiveExperiment((exp) => ({
      ...exp,
      versions: exp.versions.filter((v) => v.id !== versionId),
    }));
  };

  // Comparison handlers
  const handleOpenCompare = (leftKey?: string, rightKey?: string) => {
    const defaultLeft =
      leftKey ??
      (activeExperiment.versions[0]
        ? `version:${activeExperiment.versions[0].id}`
        : activeExperiment.history[0]
          ? `history:${activeExperiment.history[0].id}`
          : 'current');
    setDsaExpanded(false);
    setCompareState((prev) => ({
      open: true,
      leftKey: defaultLeft,
      rightKey: rightKey ?? 'current',
      file: activeFileObj.name,
      nonce: prev.nonce + 1,
    }));
  };

  const handleToggleCompare = () => {
    if (compareState.open) {
      setCompareState((prev) => ({ ...prev, open: false }));
    } else {
      handleOpenCompare();
    }
  };

  // File handlers
  const handleFileContentChange = (nextContent: string) => {
    updateActiveExperiment((exp) => ({
      ...exp,
      files: exp.files.map((f) =>
        f.name === activeFileObj.name ? { ...f, content: nextContent } : f
      ),
    }));
    setIsDirty(true);
  };

  const handleCreateFile = (name: string) => {
    if (activeExperiment.files.some((f) => f.name === name)) {
      updateActiveExperiment((exp) => ({ ...exp, activeFile: name }));
      return;
    }
    const starterContent =
      name.endsWith('.hpp') || name.endsWith('.h')
        ? '#pragma once\n\n'
        : '#include <iostream>\n\n';
    updateActiveExperiment((exp) => ({
      ...exp,
      files: [...exp.files, { name, content: starterContent }],
      activeFile: name,
    }));
    setIsDirty(true);
  };

  const handleDeleteFile = (name: string) => {
    if (activeExperiment.files.length <= 1) return;
    updateActiveExperiment((exp) => {
      const remaining = exp.files.filter((f) => f.name !== name);
      const nextActive = exp.activeFile === name ? remaining[0].name : exp.activeFile;
      let nextEntry = exp.entryFile;
      if (exp.entryFile === name) {
        const nextSrc = remaining.find((f) => /\.(cpp|cc|cxx|c)$/i.test(f.name));
        nextEntry = (nextSrc ?? remaining[0]).name;
      }
      return {
        ...exp,
        files: remaining,
        activeFile: nextActive,
        entryFile: nextEntry,
      };
    });
    setIsDirty(true);
  };

  const handleRenameFile = (oldName: string, newName: string) => {
    if (activeExperiment.files.some((f) => f.name === newName)) return;
    updateActiveExperiment((exp) => ({
      ...exp,
      files: exp.files.map((f) =>
        f.name === oldName ? { ...f, name: newName } : f
      ),
      activeFile: exp.activeFile === oldName ? newName : exp.activeFile,
      entryFile: exp.entryFile === oldName ? newName : exp.entryFile,
    }));
    setIsDirty(true);
  };

  const handleLoadTemplate = (tpl: CppTemplate, mode: 'new' | 'replace') => {
    if (mode === 'new') {
      const id = makeId('exp');
      const nowIso = new Date().toISOString();
      const nextExp = createExperimentFromTemplate(tpl, id, nowIso, false);
      setStore((prev) => ({
        ...prev,
        experiments: [nextExp, ...prev.experiments],
        activeExperimentId: nextExp.id,
      }));
      setLastResult(null);
      setTestResults({});
      setCompareState((prev) => ({ ...prev, open: false }));
      setIsDirty(false);
      return;
    }

    const nextFiles = Object.entries(tpl.files).map(([name, content]) => ({
      name,
      content,
    }));
    updateActiveExperiment((exp) => ({
      ...exp,
      name: tpl.name,
      files: nextFiles,
      activeFile: tpl.entryFile,
      entryFile: tpl.entryFile,
      stdin: tpl.sampleInput,
    }));
    setLastResult(null);
    setTestResults({});
    setCompareState((prev) => ({ ...prev, open: false }));
    setIsDirty(true);
  };

  // History handlers
  const handleInspectHistoryRecord = (rec: ExecutionRecord) => {
    setLastResult(rec.result);
    setBottomCollapsed(false);
    setBottomTab(
      rec.result.status === 'compile-error' ? 'errors' : 'terminal'
    );
  };

  const handleRestoreHistoryRecord = (rec: ExecutionRecord) => {
    const restoredFiles = Object.entries(rec.filesSnapshot).map(
      ([name, content]) => ({ name, content })
    );
    if (restoredFiles.length === 0) return;

    updateActiveExperiment((exp) => ({
      ...exp,
      files: restoredFiles,
      activeFile: rec.entryFile,
      entryFile: rec.entryFile,
    }));
    setLastResult(rec.result);
    setCompareState((prev) => ({ ...prev, open: false }));
    setIsDirty(true);
  };

  const handleJumpToLocation = (file: string, line: number, column: number) => {
    if (activeExperiment.files.some((f) => f.name === file)) {
      updateActiveExperiment((exp) => ({ ...exp, activeFile: file }));
    }
    setCompareState((prev) => ({ ...prev, open: false }));
    setJumpTarget({
      file,
      line,
      column,
      nonce: Date.now(),
    });
  };

  // Test case handlers
  const handleSaveStdinAsTestCase = () => {
    const idx = activeExperiment.testCases.length + 1;
    const expected =
      lastResult && lastResult.status === 'success' ? lastResult.stdout : '';
    updateActiveExperiment((exp) => ({
      ...exp,
      testCases: [
        ...exp.testCases,
        {
          id: makeId('tc'),
          name: `Case ${idx}`,
          stdin: exp.stdin,
          expectedOutput: expected,
        },
      ],
    }));
    setBottomCollapsed(false);
    setBottomTab('test-cases');
    setIsDirty(true);
  };

  // DSA Toolkit handlers
  const handleSelectStructure = (id: DataStructureId) => {
    setActiveStructureId(id);
    setDsaMode('structures');
    setRightOpen(true);
    setRightPanelMode('dsa');
    setRightWidth((w) => Math.max(w, 420));
  };

  const handleSelectAlgorithm = (id: AlgorithmId) => {
    setActiveAlgorithmId(id);
    setDsaMode('algorithms');
    setRightOpen(true);
    setRightPanelMode('dsa');
    setRightWidth((w) => Math.max(w, 420));
  };

  const handleToggleDsa = () => {
    if (rightOpen && rightPanelMode === 'dsa') {
      setRightPanelMode('inspector');
      setDsaExpanded(false);
    } else {
      setRightOpen(true);
      setRightPanelMode('dsa');
      setRightWidth((w) => Math.max(w, 420));
    }
  };

  const handleCopyToStdin = (stdinText: string) => {
    updateActiveExperiment((exp) => ({ ...exp, stdin: stdinText }));
    setBottomCollapsed(false);
    setBottomTab('input');
    setIsDirty(true);
  };

  // GitHub handlers
  const githubTarget: GitHubTargetConfig = activeExperiment.githubTarget ?? {
    owner: '',
    repo: '',
    branch: '',
    filePath: activeFileObj.name,
  };

  const handleGitHubTargetChange = (next: GitHubTargetConfig) => {
    updateActiveExperiment((exp) => ({ ...exp, githubTarget: next }));
  };

  const handleOpenPushModal = () => {
    if (
      !githubSession?.connected ||
      !githubTarget.owner ||
      !githubTarget.repo ||
      !githubTarget.branch
    ) {
      setLeftOpen(true);
      setSidebarSection('github');
      return;
    }
    setPushModalOpen(true);
  };

  const handlePullFileFromGitHub = (fileName: string, content: string) => {
    updateActiveExperiment((exp) => {
      const exists = exp.files.some((f) => f.name === fileName);
      const nextFiles = exists
        ? exp.files.map((f) => (f.name === fileName ? { ...f, content } : f))
        : [...exp.files, { name: fileName, content }];
      return {
        ...exp,
        files: nextFiles,
        activeFile: fileName,
      };
    });
    setCompareState((prev) => ({ ...prev, open: false }));
    setDsaExpanded(false);
    setIsDirty(true);
  };

  const handleDisconnectGitHub = async () => {
    await githubBridge.disconnect(githubSession?.transport ?? 'server');
    await refreshGitHubSession();
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#09090b] text-zinc-100">
      <TopBar
        experimentName={activeExperiment.name}
        isTemporary={activeExperiment.isTemporary}
        onExperimentNameChange={(name) => {
          updateActiveExperiment((exp) => ({ ...exp, name }));
          setIsDirty(true);
        }}
        cppStandard={store.compilerConfig.std}
        onToggleStandard={() =>
          setStore((prev) => ({
            ...prev,
            compilerConfig: {
              ...prev.compilerConfig,
              std: prev.compilerConfig.std === 'c++17' ? 'c++20' : 'c++17',
            },
          }))
        }
        runtimeStatus={runtimeStatus}
        isBusy={isBusy}
        isDirty={isDirty}
        savedAt={activeExperiment.lastSavedAt}
        compareOpen={compareState.open}
        dsaOpen={(rightOpen && rightPanelMode === 'dsa') || dsaExpanded}
        githubLogin={githubSession?.connected ? (githubSession.user?.login ?? null) : null}
        onRun={() => void handleRun()}
        onStop={handleStop}
        onRunTests={() => void handleRunAllTests()}
        onSave={handleSave}
        onPushGitHub={handleOpenPushModal}
        onCreateSnapshot={() => handleCreateVersion('')}
        onToggleCompare={handleToggleCompare}
        onToggleDsa={handleToggleDsa}
        leftOpen={leftOpen}
        bottomOpen={!bottomCollapsed}
        rightOpen={rightOpen}
        onToggleLeft={() => setLeftOpen((v) => !v)}
        onToggleBottom={() => setBottomCollapsed((v) => !v)}
        onToggleRight={() => setRightOpen((v) => !v)}
      />

      {oauthNotice && (
        <div
          className={`px-3 py-1.5 text-xs flex items-center justify-between border-b ${
            oauthNotice.tone === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200'
              : 'bg-rose-500/10 border-rose-500/25 text-rose-200'
          }`}
        >
          <span>{oauthNotice.text}</span>
          <button
            type="button"
            onClick={() => setOauthNotice(null)}
            className="text-[11px] opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left Sidebar */}
        {leftOpen && (
          <motion.aside
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            style={{ width: leftWidth }}
            className="shrink-0 h-full overflow-hidden hidden md:block"
          >
            <LeftSidebar
              section={sidebarSection}
              onSectionChange={setSidebarSection}
              onCollapse={() => setLeftOpen(false)}
              experiments={store.experiments}
              activeExperiment={activeExperiment}
              onSelectExperiment={handleSelectExperiment}
              onCreateBlankExperiment={handleCreateBlankExperiment}
              onRenameExperiment={handleRenameExperiment}
              onDuplicateExperiment={handleDuplicateExperiment}
              onPromoteExperiment={handlePromoteExperiment}
              onDeleteExperiment={handleDeleteExperiment}
              files={activeExperiment.files}
              activeFile={activeFileObj.name}
              entryFile={activeExperiment.entryFile}
              onSelectFile={(name) =>
                updateActiveExperiment((exp) => ({ ...exp, activeFile: name }))
              }
              onSetEntryFile={(name) =>
                updateActiveExperiment((exp) => ({ ...exp, entryFile: name }))
              }
              onLoadTemplate={handleLoadTemplate}
              onCreateVersion={handleCreateVersion}
              onRestoreVersion={handleRestoreVersion}
              onDeleteVersion={handleDeleteVersion}
              onCompareSources={handleOpenCompare}
              history={activeExperiment.history}
              onInspectHistoryRecord={handleInspectHistoryRecord}
              onRestoreHistoryRecord={handleRestoreHistoryRecord}
              onClearHistory={() =>
                updateActiveExperiment((exp) => ({ ...exp, history: [] }))
              }
              compilerConfig={store.compilerConfig}
              onUpdateCompilerConfig={(patch: Partial<CompilerConfig>) =>
                setStore((prev) => ({
                  ...prev,
                  compilerConfig: { ...prev.compilerConfig, ...patch },
                }))
              }
              editorSettings={store.editorSettings}
              onUpdateEditorSettings={(patch: Partial<EditorSettings>) =>
                setStore((prev) => ({
                  ...prev,
                  editorSettings: { ...prev.editorSettings, ...patch },
                }))
              }
              runtimeStatus={runtimeStatus}
              onPreloadCompiler={() => void cppRuntime.preload()}
              onResetCompiler={() => cppRuntime.resetCompiler()}
              activeStructureId={activeStructureId}
              activeAlgorithmId={activeAlgorithmId}
              onSelectStructure={handleSelectStructure}
              onSelectAlgorithm={handleSelectAlgorithm}
              githubSession={githubSession}
              githubSessionLoading={githubSessionLoading}
              githubTarget={githubTarget}
              onGitHubTargetChange={handleGitHubTargetChange}
              onOpenPushModal={handleOpenPushModal}
              onPullFileFromGitHub={handlePullFileFromGitHub}
              onRefreshGitHubSession={refreshGitHubSession}
              onDisconnectGitHub={handleDisconnectGitHub}
            />
          </motion.aside>
        )}

        {leftOpen && (
          <div className="hidden md:flex">
            <ResizeHandle
              direction="horizontal"
              ariaLabel="Resize left sidebar"
              onDelta={(delta) =>
                setLeftWidth((w) => Math.min(440, Math.max(210, w + delta)))
              }
            />
          </div>
        )}

        {/* Center Editor / Compare View / Expanded DSA Lab + Bottom Terminal/IO */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {!compareState.open && !dsaExpanded && (
            <EditorTabs
              files={activeExperiment.files}
              activeFile={activeFileObj.name}
              entryFile={activeExperiment.entryFile}
              diagnostics={lastResult?.diagnostics ?? []}
              onSelectFile={(name) =>
                updateActiveExperiment((exp) => ({ ...exp, activeFile: name }))
              }
              onCreateFile={handleCreateFile}
              onDeleteFile={handleDeleteFile}
              onRenameFile={handleRenameFile}
            />
          )}

          <div className="flex-1 min-h-0 relative">
            {dsaExpanded ? (
              <DsaToolkitPanel
                mode={dsaMode}
                structureId={activeStructureId}
                algorithmId={activeAlgorithmId}
                expanded
                onModeChange={setDsaMode}
                onSelectStructure={setActiveStructureId}
                onSelectAlgorithm={setActiveAlgorithmId}
                onToggleExpand={() => setDsaExpanded(false)}
                onClose={() => setDsaExpanded(false)}
                onCopyToStdin={handleCopyToStdin}
              />
            ) : compareState.open ? (
              <CodeDiffView
                key={compareState.nonce}
                activeExperiment={activeExperiment}
                allExperiments={store.experiments}
                initialLeftKey={compareState.leftKey}
                initialRightKey={compareState.rightKey}
                initialFile={compareState.file}
                editorSettings={store.editorSettings}
                onRestoreVersion={(verId) => handleRestoreVersion(verId, true)}
                onClose={() =>
                  setCompareState((prev) => ({ ...prev, open: false }))
                }
              />
            ) : (
              <CppEditor
                value={activeFileObj.content}
                fileName={activeFileObj.name}
                diagnostics={lastResult?.diagnostics ?? []}
                settings={store.editorSettings}
                jumpTarget={jumpTarget}
                onChange={handleFileContentChange}
                onRun={() => void handleRun()}
                onSave={handleSave}
              />
            )}
          </div>

          {!bottomCollapsed && (
            <ResizeHandle
              direction="vertical"
              ariaLabel="Resize bottom panel"
              onDelta={(delta) =>
                setBottomHeight((h) => Math.min(520, Math.max(140, h - delta)))
              }
            />
          )}

          <div
            style={{ height: bottomCollapsed ? 36 : bottomHeight }}
            className="shrink-0 overflow-hidden"
          >
            <BottomPanel
              activeTab={bottomTab}
              onTabChange={setBottomTab}
              collapsed={bottomCollapsed}
              onToggleCollapse={() => setBottomCollapsed((v) => !v)}
              stdin={activeExperiment.stdin}
              onStdinChange={(val) => {
                updateActiveExperiment((exp) => ({ ...exp, stdin: val }));
                setIsDirty(true);
              }}
              onSaveStdinAsTestCase={handleSaveStdinAsTestCase}
              result={lastResult}
              runtimeStatus={runtimeStatus}
              compilerConfig={store.compilerConfig}
              isBusy={isBusy}
              testCases={activeExperiment.testCases}
              testResults={testResults}
              onAddTestCase={() => {
                const idx = activeExperiment.testCases.length + 1;
                updateActiveExperiment((exp) => ({
                  ...exp,
                  testCases: [
                    ...exp.testCases,
                    {
                      id: makeId('tc'),
                      name: `Case ${idx}`,
                      stdin: '',
                      expectedOutput: '',
                    },
                  ],
                }));
                setIsDirty(true);
              }}
              onDuplicateTestCase={(id) => {
                const source = activeExperiment.testCases.find(
                  (t) => t.id === id
                );
                if (!source) return;
                updateActiveExperiment((exp) => ({
                  ...exp,
                  testCases: [
                    ...exp.testCases,
                    {
                      ...source,
                      id: makeId('tc'),
                      name: `${source.name} (Copy)`,
                    },
                  ],
                }));
                setIsDirty(true);
              }}
              onUpdateTestCase={(id, patch) => {
                updateActiveExperiment((exp) => ({
                  ...exp,
                  testCases: exp.testCases.map((tc) =>
                    tc.id === id ? { ...tc, ...patch } : tc
                  ),
                }));
                setIsDirty(true);
              }}
              onDeleteTestCase={(id) => {
                updateActiveExperiment((exp) => ({
                  ...exp,
                  testCases: exp.testCases.filter((tc) => tc.id !== id),
                }));
                setIsDirty(true);
              }}
              onLoadTestCaseToStdin={(id) => {
                const tc = activeExperiment.testCases.find((t) => t.id === id);
                if (!tc) return;
                updateActiveExperiment((exp) => ({ ...exp, stdin: tc.stdin }));
                setBottomTab('input');
                setIsDirty(true);
              }}
              onAcceptActualOutput={(id) => {
                const outcome = testResults[id];
                if (!outcome || outcome.result.status !== 'success') return;
                const actual = outcome.result.stdout;
                updateActiveExperiment((exp) => ({
                  ...exp,
                  testCases: exp.testCases.map((tc) =>
                    tc.id === id ? { ...tc, expectedOutput: actual } : tc
                  ),
                }));
                setTestResults((prev) => ({
                  ...prev,
                  [id]: { ...outcome, passed: true },
                }));
                setIsDirty(true);
              }}
              onRunSingleTestCase={(id) => void handleRunSingleTest(id)}
              onRunAllTestCases={() => void handleRunAllTests()}
              onClearOutput={() => setLastResult(null)}
              onJumpToLocation={handleJumpToLocation}
            />
          </div>
        </main>

        {rightOpen && (
          <div className="hidden lg:flex">
            <ResizeHandle
              direction="horizontal"
              ariaLabel="Resize right inspector"
              onDelta={(delta) =>
                setRightWidth((w) => Math.min(760, Math.max(220, w - delta)))
              }
            />
          </div>
        )}

        {/* Right Contextual Inspector / DSA Lab */}
        {rightOpen && (
          <motion.aside
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            style={{ width: rightWidth }}
            className="shrink-0 h-full overflow-hidden hidden lg:block"
          >
            <RightPanel
              onCollapse={() => setRightOpen(false)}
              panelMode={rightPanelMode}
              onPanelModeChange={(m) => {
                setRightPanelMode(m);
                if (m === 'dsa') {
                  setRightWidth((w) => Math.max(w, 420));
                }
              }}
              dsaMode={dsaMode}
              structureId={activeStructureId}
              algorithmId={activeAlgorithmId}
              onDsaModeChange={setDsaMode}
              onSelectStructure={setActiveStructureId}
              onSelectAlgorithm={setActiveAlgorithmId}
              onExpandDsa={() => setDsaExpanded(true)}
              onCopyToStdin={handleCopyToStdin}
              runtimeStatus={runtimeStatus}
              compilerConfig={store.compilerConfig}
              lastResult={lastResult}
              isBusy={isBusy}
              notes={activeExperiment.notes}
              onNotesChange={(notes) => {
                updateActiveExperiment((exp) => ({ ...exp, notes }));
                setIsDirty(true);
              }}
              versionsCount={activeExperiment.versions.length}
              testPassSummary={testPassSummary}
              onCreateSnapshot={() => handleCreateVersion('')}
              onOpenCompare={() => handleOpenCompare()}
              onPreloadCompiler={() => void cppRuntime.preload()}
              onResetCompiler={() => cppRuntime.resetCompiler()}
              onRun={() => void handleRun()}
              onStop={handleStop}
              onRunAllTests={() => void handleRunAllTests()}
              onSave={handleSave}
            />
          </motion.aside>
        )}
      </div>

      {pushModalOpen &&
        githubTarget.owner &&
        githubTarget.repo &&
        githubTarget.branch && (
          <PushCommitModal
            transport={githubSession?.transport ?? 'server'}
            files={activeExperiment.files}
            activeFile={activeFileObj.name}
            target={githubTarget}
            onTargetChange={handleGitHubTargetChange}
            onPushSuccess={(res) => {
              setOauthNotice({
                tone: 'success',
                text: `Pushed ${res.path} (${res.commitSha.slice(0, 7)}) to ${githubTarget.owner}/${githubTarget.repo}@${githubTarget.branch}`,
              });
            }}
            onClose={() => setPushModalOpen(false)}
          />
        )}
    </div>
  );
}
