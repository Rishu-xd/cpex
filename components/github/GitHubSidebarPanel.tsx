'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequestDraft,
  Lock,
  LogOut,
  Plus,
  Puzzle,
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react';
import { githubBridge } from '@/lib/github/bridge';
import type {
  GitHubBranch,
  GitHubCommit,
  GitHubFileLookup,
  GitHubRepo,
  GitHubSessionInfo,
  GitHubTargetConfig,
  GitHubTransport,
} from '@/lib/github/types';

interface GitHubSidebarPanelProps {
  session: GitHubSessionInfo | null;
  sessionLoading: boolean;
  target: GitHubTargetConfig;
  activeFileName: string;
  onTargetChange: (next: GitHubTargetConfig) => void;
  onOpenPushModal: () => void;
  onPullFileContent: (fileName: string, content: string) => void;
  onRefreshSession: () => Promise<void>;
  onDisconnect: () => Promise<void>;
}

function formatCommitDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function GitHubSidebarPanel({
  session,
  sessionLoading,
  target,
  activeFileName,
  onTargetChange,
  onOpenPushModal,
  onPullFileContent,
  onRefreshSession,
  onDisconnect,
}: GitHubSidebarPanelProps) {
  const transport: GitHubTransport = session?.transport ?? 'server';

  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [repoFilter, setRepoFilter] = useState('');
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [commitScope, setCommitScope] = useState<'branch' | 'file'>('branch');
  const [fileLookup, setFileLookup] = useState<GitHubFileLookup | null>(null);

  const [loadingRepos, setLoadingRepos] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);

  const [creatingBranch, setCreatingBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [confirmPull, setConfirmPull] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadRepos = useCallback(async () => {
    setLoadingRepos(true);
    setErrorMsg(null);
    try {
      const list = await githubBridge.listRepos(transport);
      setRepos(list);
      if (list.length > 0 && (!target.owner || !target.repo)) {
        const first = list[0];
        onTargetChange({
          owner: first.owner,
          repo: first.name,
          branch: first.defaultBranch,
          filePath: target.filePath || activeFileName,
        });
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to load repositories'
      );
    } finally {
      setLoadingRepos(false);
    }
  }, [
    transport,
    target.owner,
    target.repo,
    target.filePath,
    activeFileName,
    onTargetChange,
  ]);

  const loadBranches = useCallback(
    async (owner: string, repo: string) => {
      if (!owner || !repo) return;
      setLoadingBranches(true);
      try {
        const list = await githubBridge.listBranches(transport, owner, repo);
        setBranches(list);
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : 'Failed to load branches'
        );
      } finally {
        setLoadingBranches(false);
      }
    },
    [transport]
  );

  const loadCommits = useCallback(
    async (owner: string, repo: string, branch: string, filePath?: string) => {
      if (!owner || !repo || !branch) return;
      setLoadingCommits(true);
      try {
        const list = await githubBridge.listCommits(
          transport,
          owner,
          repo,
          branch,
          filePath
        );
        setCommits(list);
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : 'Failed to load commits'
        );
      } finally {
        setLoadingCommits(false);
      }
    },
    [transport]
  );

  const checkTargetFile = useCallback(
    async (owner: string, repo: string, branch: string, path: string) => {
      if (!owner || !repo || !branch || !path.trim()) {
        setFileLookup(null);
        return;
      }
      setLoadingFile(true);
      try {
        const data = await githubBridge.getFile(
          transport,
          owner,
          repo,
          branch,
          path.trim()
        );
        setFileLookup(data);
      } catch {
        setFileLookup(null);
      } finally {
        setLoadingFile(false);
      }
    },
    [transport]
  );

  // Load repositories when connected
  useEffect(() => {
    if (!session?.connected) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadRepos();
    });
    return () => {
      cancelled = true;
    };
  }, [session?.connected, loadRepos]);

  // Load branches when repo changes
  useEffect(() => {
    if (!session?.connected || !target.owner || !target.repo) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadBranches(target.owner, target.repo);
    });
    return () => {
      cancelled = true;
    };
  }, [session?.connected, target.owner, target.repo, loadBranches]);

  // Load commits when repo/branch/scope changes
  useEffect(() => {
    if (!session?.connected || !target.owner || !target.repo || !target.branch) {
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        void loadCommits(
          target.owner,
          target.repo,
          target.branch,
          commitScope === 'file' ? target.filePath : undefined
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    session?.connected,
    target.owner,
    target.repo,
    target.branch,
    target.filePath,
    commitScope,
    loadCommits,
  ]);

  // Debounced remote file existence check
  useEffect(() => {
    if (
      !session?.connected ||
      !target.owner ||
      !target.repo ||
      !target.branch ||
      !target.filePath.trim()
    ) {
      return;
    }
    const timer = setTimeout(() => {
      void checkTargetFile(
        target.owner,
        target.repo,
        target.branch,
        target.filePath
      );
    }, 350);
    return () => clearTimeout(timer);
  }, [
    session?.connected,
    target.owner,
    target.repo,
    target.branch,
    target.filePath,
    checkTargetFile,
  ]);

  const filteredRepos = useMemo(() => {
    const q = repoFilter.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter((r) => r.fullName.toLowerCase().includes(q));
  }, [repos, repoFilter]);

  const handleCreateBranch = async () => {
    const name = newBranchName.trim();
    if (!name || !target.owner || !target.repo) return;
    const base =
      branches.find((b) => b.name === target.branch) ?? branches[0];
    if (!base) {
      setErrorMsg('No base branch SHA available.');
      return;
    }

    setErrorMsg(null);
    try {
      const branch = await githubBridge.createBranch(
        transport,
        target.owner,
        target.repo,
        name,
        base.commitSha
      );
      setBranches((prev) => [...prev, branch]);
      onTargetChange({ ...target, branch: branch.name });
      setNewBranchName('');
      setCreatingBranch(false);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to create branch'
      );
    }
  };

  if (sessionLoading || !session) {
    return (
      <div className="p-2 text-xs text-zinc-500">
        Checking GitHub bridge &amp; session...
      </div>
    );
  }

  if (!session.connected || !session.user) {
    return (
      <div className="space-y-3 text-xs">
        <div className="rounded-md bg-[#14141a] border border-white/[0.08] p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-medium text-zinc-100">
              <Puzzle className="w-3.5 h-3.5 text-sky-400" />
              <span>CPex Browser Extension</span>
            </div>
            <span
              className={`text-[10px] font-mono px-1.5 py-0 rounded ${
                session.extensionInstalled
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {session.extensionInstalled ? 'Detected' : 'Not detected'}
            </span>
          </div>

          {session.extensionInstalled && !session.extensionOriginAllowed ? (
            <p className="text-[11px] text-amber-300 leading-relaxed">
              Extension detected, but this origin is not in its Allowed Origins list. Open the extension popup to allow this URL.
            </p>
          ) : session.extensionInstalled ? (
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Open the <strong className="text-zinc-200">CPex GitHub Bridge</strong> extension popup in your browser toolbar and paste your <code className="text-zinc-200">.env</code> or GitHub Token, then click refresh below.
            </p>
          ) : (
            <div className="space-y-1.5 text-[11px] text-zinc-400 leading-relaxed">
              <p>
                Load the <code className="text-zinc-200">extension/</code> folder unpacked in Chrome/Edge (<code className="text-zinc-200">chrome://extensions</code>) to store your <code className="text-zinc-200">.env</code> or GitHub Token locally in the browser without server env vars.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => void onRefreshSession()}
            className="w-full flex items-center justify-center gap-1.5 h-7 rounded bg-white/[0.06] hover:bg-white/[0.11] text-zinc-200 text-xs"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Re-check Extension</span>
          </button>
        </div>

        {session.configured && session.transport === 'server' && (
          <div className="rounded-md bg-[#14141a] border border-white/[0.08] p-2.5 space-y-2">
            <div className="font-medium text-zinc-100">
              Server OAuth Available
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Or sign in using the server&apos;s configured GitHub OAuth App.
            </p>
            <a
              href="/api/github/login"
              className="flex items-center justify-center gap-1.5 w-full h-8 rounded-md bg-sky-500 hover:bg-sky-400 text-zinc-950 font-semibold transition-colors"
            >
              <GitPullRequestDraft className="w-3.5 h-3.5" />
              <span>Connect via Server OAuth</span>
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 text-xs">
      {/* Connected Profile */}
      <div className="rounded-md bg-[#14141a] border border-white/[0.07] p-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <a
            href={session.user.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-medium text-zinc-100 hover:text-sky-300 truncate"
          >
            <span>@{session.user.login}</span>
            <ExternalLink className="w-3 h-3 shrink-0 text-zinc-500" />
          </a>
          <div className="text-[10px] text-emerald-400">
            {transport === 'extension' ? 'Extension Bridge' : 'Server OAuth'}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              void loadRepos();
              if (target.owner && target.repo) {
                void loadBranches(target.owner, target.repo);
                if (target.branch) {
                  void loadCommits(
                    target.owner,
                    target.repo,
                    target.branch,
                    commitScope === 'file' ? target.filePath : undefined
                  );
                }
              }
            }}
            title="Refresh GitHub data"
            className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loadingRepos ? 'animate-spin' : ''}`}
            />
          </button>
          <button
            type="button"
            onClick={() => void onDisconnect()}
            title="Disconnect GitHub"
            className="p-1.5 rounded text-zinc-400 hover:text-rose-300 hover:bg-rose-500/15"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded bg-rose-500/15 border border-rose-500/30 p-2 text-[11px] text-rose-200 break-words">
          {errorMsg}
        </div>
      )}

      {/* Repository Selection */}
      <div className="rounded-md bg-[#14141a] border border-white/[0.07] p-2.5 space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Repository &amp; Branch
        </div>

        <div className="relative">
          <Search className="w-3 h-3 text-zinc-500 absolute left-2 top-2" />
          <input
            value={repoFilter}
            onChange={(e) => setRepoFilter(e.target.value)}
            placeholder="Filter repositories..."
            className="w-full h-7 pl-6 pr-2 rounded bg-[#0b0b0e] border border-white/[0.08] text-[11px] text-zinc-200 outline-none focus:border-sky-500/40"
          />
        </div>

        <select
          aria-label="Select GitHub repository"
          value={target.owner && target.repo ? `${target.owner}/${target.repo}` : ''}
          onChange={(e) => {
            const selected = repos.find((r) => r.fullName === e.target.value);
            if (!selected) return;
            setCommits([]);
            onTargetChange({
              owner: selected.owner,
              repo: selected.name,
              branch: selected.defaultBranch,
              filePath: target.filePath || activeFileName,
            });
          }}
          className="w-full h-7 rounded bg-[#0b0b0e] border border-white/[0.08] px-2 text-xs text-zinc-200 outline-none focus:border-sky-500/40"
        >
          {filteredRepos.length === 0 ? (
            <option value="">
              {loadingRepos ? 'Loading repositories...' : 'No repositories found'}
            </option>
          ) : (
            filteredRepos.map((r) => (
              <option key={r.id} value={r.fullName}>
                {r.private ? '🔒 ' : ''}
                {r.fullName}
              </option>
            ))
          )}
        </select>

        {/* Branch selector + New Branch */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <GitBranch className="w-3 h-3 text-zinc-500 absolute left-2 top-2 pointer-events-none" />
            <select
              aria-label="Select branch"
              value={target.branch}
              disabled={loadingBranches || branches.length === 0}
              onChange={(e) =>
                onTargetChange({ ...target, branch: e.target.value })
              }
              className="w-full h-7 pl-6 pr-2 rounded bg-[#0b0b0e] border border-white/[0.08] text-xs font-mono text-zinc-200 outline-none focus:border-sky-500/40"
            >
              {branches.length === 0 ? (
                <option value={target.branch}>{target.branch || 'main'}</option>
              ) : (
                branches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setCreatingBranch((v) => !v)}
            disabled={!target.owner || !target.repo}
            title="Create new branch"
            className="h-7 px-2 rounded bg-white/[0.06] hover:bg-white/[0.11] text-zinc-200 disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {creatingBranch && (
          <div className="flex gap-1.5 pt-1">
            <input
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleCreateBranch();
              }}
              placeholder="feature/two-pointers"
              className="flex-1 h-7 px-2 rounded bg-[#0b0b0e] border border-sky-500/40 font-mono text-[11px] text-zinc-200 outline-none"
            />
            <button
              type="button"
              onClick={() => void handleCreateBranch()}
              className="h-7 px-2 rounded bg-sky-500/20 text-sky-200 border border-sky-500/30 text-[11px]"
            >
              Create
            </button>
          </div>
        )}

        {/* Target File Path */}
        <label className="block space-y-1 pt-1">
          <div className="flex items-center justify-between text-[10px] text-zinc-500">
            <span>Target File Path</span>
            {loadingFile ? (
              <span>Checking...</span>
            ) : fileLookup?.exists ? (
              <span className="text-sky-300 flex items-center gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Exists
              </span>
            ) : target.filePath.trim() ? (
              <span className="text-emerald-300">New file</span>
            ) : null}
          </div>
          <input
            value={target.filePath}
            onChange={(e) =>
              onTargetChange({ ...target, filePath: e.target.value })
            }
            placeholder={`dsa/${activeFileName}`}
            className="w-full h-7 px-2 rounded bg-[#0b0b0e] border border-white/[0.08] focus:border-sky-500/40 font-mono text-[11px] text-zinc-200 outline-none"
          />
        </label>

        {/* Actions */}
        <div className="space-y-1.5 pt-1">
          <button
            type="button"
            onClick={onOpenPushModal}
            disabled={!target.owner || !target.repo || !target.branch}
            className="w-full flex items-center justify-center gap-1.5 h-8 rounded bg-sky-500 hover:bg-sky-400 text-zinc-950 font-semibold disabled:opacity-40 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Push to GitHub...</span>
          </button>

          {fileLookup?.exists && fileLookup.content !== null && (
            confirmPull ? (
              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    onPullFileContent(
                      target.filePath.split('/').pop() || activeFileName,
                      fileLookup.content ?? ''
                    );
                    setConfirmPull(false);
                  }}
                  className="flex-1 h-7 rounded bg-amber-500/20 border border-amber-500/30 text-amber-200 text-[11px]"
                >
                  Overwrite Active Tab
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmPull(false)}
                  className="px-2 h-7 text-[11px] text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmPull(true)}
                className="w-full flex items-center justify-center gap-1.5 h-7 rounded bg-white/[0.06] hover:bg-white/[0.11] text-zinc-200 text-[11px]"
              >
                <Download className="w-3 h-3" />
                <span>Load Remote File</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Commit History */}
      <div className="rounded-md bg-[#14141a] border border-white/[0.07] p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Previous Commits
          </span>
          <div className="flex gap-1 text-[10px]">
            <button
              type="button"
              onClick={() => setCommitScope('branch')}
              className={`px-1.5 py-0.5 rounded ${
                commitScope === 'branch'
                  ? 'bg-white/[0.1] text-zinc-100'
                  : 'text-zinc-500'
              }`}
            >
              Branch
            </button>
            <button
              type="button"
              onClick={() => setCommitScope('file')}
              className={`px-1.5 py-0.5 rounded ${
                commitScope === 'file'
                  ? 'bg-white/[0.1] text-zinc-100'
                  : 'text-zinc-500'
              }`}
            >
              File
            </button>
          </div>
        </div>

        {loadingCommits ? (
          <div className="text-[11px] text-zinc-500">Loading commits...</div>
        ) : commits.length === 0 ? (
          <div className="text-[11px] text-zinc-500 flex items-center gap-1">
            <Lock className="w-3 h-3 opacity-60" />
            <span>No commits found for this scope.</span>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {commits.map((c) => (
              <a
                key={c.sha}
                href={c.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="block rounded bg-[#0c0c10] hover:bg-[#16161e] border border-white/[0.06] p-2 space-y-1 transition-colors"
              >
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="flex items-center gap-1 text-sky-300">
                    <GitCommitHorizontal className="w-3 h-3" />
                    {c.shortSha}
                  </span>
                  <span className="text-zinc-500">
                    {formatCommitDate(c.authorDate)}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-200 line-clamp-2">
                  {c.message}
                </div>
                <div className="text-[10px] text-zinc-500">{c.authorName}</div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
