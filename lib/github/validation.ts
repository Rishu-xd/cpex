import type { GitHubPushRequest } from './types';

const IDENTIFIER_RE = /^[A-Za-z0-9._-]{1,100}$/;
const MAX_CONTENT_BYTES = 1024 * 1024; // 1 MB

export function isValidGitHubIdentifier(value: string): boolean {
  if (!IDENTIFIER_RE.test(value)) return false;
  if (value === '.' || value === '..' || value.includes('..')) return false;
  return true;
}

export function isValidBranchName(value: string): boolean {
  if (!value || value.length > 200) return false;
  if (/[\s~^:?*\[\\\x00-\x1f\x7f]/.test(value)) return false;
  if (value.includes('..') || value.includes('@{') || value.includes('//')) return false;
  if (value.startsWith('/') || value.endsWith('/') || value.startsWith('.')) return false;
  if (value.endsWith('.') || value.endsWith('.lock')) return false;
  return true;
}

export function normalizeRepoFilePath(rawPath: string): string | null {
  if (typeof rawPath !== 'string') return null;
  if (rawPath.includes('\0')) return null;

  const trimmed = rawPath.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!trimmed || trimmed.length > 500) return null;

  const segments = trimmed.split('/');
  for (const seg of segments) {
    if (!seg || seg === '.' || seg === '..') return null;
    if (/[\x00-\x1f\x7f]/.test(seg)) return null;
  }

  return segments.join('/');
}

export function validatePushPayload(
  input: unknown
): { ok: true; data: GitHubPushRequest } | { ok: false; error: string } {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: 'Request body must be a JSON object.' };
  }

  const raw = input as Record<string, unknown>;
  const owner = typeof raw.owner === 'string' ? raw.owner.trim() : '';
  const repo = typeof raw.repo === 'string' ? raw.repo.trim() : '';
  const branch = typeof raw.branch === 'string' ? raw.branch.trim() : '';
  const pathRaw = typeof raw.path === 'string' ? raw.path : '';
  const content = typeof raw.content === 'string' ? raw.content : null;
  const message = typeof raw.message === 'string' ? raw.message.trim() : '';

  if (!isValidGitHubIdentifier(owner)) {
    return { ok: false, error: 'Invalid repository owner.' };
  }
  if (!isValidGitHubIdentifier(repo)) {
    return { ok: false, error: 'Invalid repository name.' };
  }
  if (!isValidBranchName(branch)) {
    return { ok: false, error: 'Invalid branch name.' };
  }

  const normalizedPath = normalizeRepoFilePath(pathRaw);
  if (!normalizedPath) {
    return { ok: false, error: 'Invalid repository file path.' };
  }

  if (content === null) {
    return { ok: false, error: 'File content must be a string.' };
  }
  if (new TextEncoder().encode(content).byteLength > MAX_CONTENT_BYTES) {
    return { ok: false, error: 'File content exceeds 1 MB limit.' };
  }
  if (message.length < 1 || message.length > 500) {
    return {
      ok: false,
      error: 'Commit message must be between 1 and 500 characters.',
    };
  }

  return {
    ok: true,
    data: {
      owner,
      repo,
      branch,
      path: normalizedPath,
      content,
      message,
    },
  };
}
