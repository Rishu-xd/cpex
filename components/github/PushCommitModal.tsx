'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  GitBranch,
  Upload,
  X,
} from 'lucide-react';
import { githubBridge } from '@/lib/github/bridge';
import type {
  GitHubPushResponse,
  GitHubTargetConfig,
  GitHubTransport,
} from '@/lib/github/types';
import type { FileTab } from '@/types/workspace';

interface PushCommitModalProps {
  transport: GitHubTransport;
  files: FileTab[];
  activeFile: string;
  target: GitHubTargetConfig;
  onTargetChange: (next: GitHubTargetConfig) => void;
  onPushSuccess: (res: GitHubPushResponse) => void;
  onClose: () => void;
}

export function PushCommitModal({
  transport,
  files,
  activeFile,
  target,
  onTargetChange,
  onPushSuccess,
  onClose,
}: PushCommitModalProps) {
  const [selectedFile, setSelectedFile] = useState(activeFile);
  const [filePath, setFilePath] = useState(
    target.filePath.trim() || activeFile
  );
  const [commitMessage, setCommitMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pushResult, setPushResult] = useState<GitHubPushResponse | null>(null);

  const fileContent =
    files.find((f) => f.name === selectedFile)?.content ?? '';

  const handleConfirmPush = async () => {
    const msg = commitMessage.trim();
    const cleanPath = filePath.trim();
    if (!msg || !cleanPath) return;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const data = await githubBridge.pushFile(transport, {
        owner: target.owner,
        repo: target.repo,
        branch: target.branch,
        path: cleanPath,
        content: fileContent,
        message: msg,
      });
      onTargetChange({ ...target, filePath: data.path });
      setPushResult(data);
      onPushSuccess(data);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unexpected push error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Push C++ file to GitHub"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px] p-4"
    >
      <div className="w-full max-w-lg rounded-lg bg-[#121218] border border-white/[0.12] shadow-2xl overflow-hidden text-xs">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#16161e]">
          <div className="flex items-center gap-2 font-semibold text-sm text-zinc-100">
            <Upload className="w-4 h-4 text-sky-400" />
            <span>Push Commit to GitHub</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="rounded-md bg-[#0b0b0f] border border-white/[0.08] p-2.5 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
            <span className="text-zinc-200">
              {target.owner}/{target.repo}
            </span>
            <span className="flex items-center gap-1 text-sky-300">
              <GitBranch className="w-3 h-3" />
              {target.branch}
            </span>
          </div>

          {pushResult ? (
            <div className="rounded-md bg-emerald-500/10 border border-emerald-500/30 p-3 space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Commit {pushResult.action === 'created' ? 'created' : 'pushed'} ({pushResult.commitSha.slice(0, 7)})
                </span>
              </div>
              <div className="font-mono text-[11px] text-zinc-300">
                Path: {pushResult.path}
              </div>
              <div className="flex flex-wrap gap-3 pt-1">
                <a
                  href={pushResult.commitUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sky-300 hover:text-sky-200"
                >
                  <span>View Commit</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={pushResult.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sky-300 hover:text-sky-200"
                >
                  <span>View File</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label className="block space-y-1">
                  <span className="text-zinc-400">Source File Tab</span>
                  <select
                    value={selectedFile}
                    onChange={(e) => {
                      const next = e.target.value;
                      setSelectedFile(next);
                      if (!target.filePath.trim()) setFilePath(next);
                    }}
                    className="w-full h-8 rounded bg-[#0b0b0f] border border-white/[0.1] px-2 font-mono text-zinc-200 outline-none"
                  >
                    {files.map((f) => (
                      <option key={f.name} value={f.name}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-zinc-400">Repository File Path</span>
                  <input
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    placeholder="dsa/main.cpp"
                    className="w-full h-8 rounded bg-[#0b0b0f] border border-white/[0.1] px-2 font-mono text-zinc-200 outline-none focus:border-sky-500/50"
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-zinc-400">Commit Message (required)</span>
                <input
                  autoFocus
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === 'Enter' &&
                      commitMessage.trim() &&
                      filePath.trim() &&
                      !submitting
                    ) {
                      void handleConfirmPush();
                    }
                  }}
                  placeholder="feat: implement iterative binary search in C++17"
                  className="w-full h-8 rounded bg-[#0b0b0f] border border-white/[0.1] px-2.5 text-zinc-100 outline-none focus:border-sky-500/50"
                />
              </label>

              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Local <strong className="text-zinc-200">Save</strong> keeps changes in your browser only. Confirming below creates an actual Git commit on branch{' '}
                <code className="text-sky-300">{target.branch}</code>.
              </p>

              {errorMsg && (
                <div className="flex items-start gap-2 rounded bg-rose-500/15 border border-rose-500/30 p-2.5 text-rose-200">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-white/[0.08] bg-[#14141b]">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 rounded bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200"
          >
            {pushResult ? 'Done' : 'Cancel'}
          </button>
          {!pushResult && (
            <button
              type="button"
              disabled={submitting || !commitMessage.trim() || !filePath.trim()}
              onClick={() => void handleConfirmPush()}
              className="flex items-center gap-1.5 h-8 px-3.5 rounded bg-sky-500 hover:bg-sky-400 text-zinc-950 font-semibold disabled:opacity-40 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{submitting ? 'Pushing...' : 'Confirm & Push'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
