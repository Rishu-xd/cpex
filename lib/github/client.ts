import 'server-only';

import type {
  GitHubBranch,
  GitHubCommit,
  GitHubFileLookup,
  GitHubPushRequest,
  GitHubPushResponse,
  GitHubRepo,
  GitHubUser,
} from './types';

const GITHUB_API_BASE = 'https://api.github.com';

export class GitHubApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function encodeRepoPath(path: string): string {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

async function githubFetch<T>(
  token: string,
  endpoint: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    ...init,
    cache: 'no-store',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'CPex-DSA-Lab',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let apiMsg = `GitHub API returned status ${res.status}`;
    try {
      const payload = (await res.json()) as { message?: string };
      if (payload.message) apiMsg = payload.message;
    } catch {
      // Ignore parse errors
    }
    throw new GitHubApiError(res.status, apiMsg);
  }

  return (await res.json()) as T;
}

export async function fetchAuthenticatedUser(
  token: string
): Promise<GitHubUser> {
  const data = await githubFetch<{
    login: string;
    name: string | null;
    avatar_url: string;
    html_url: string;
  }>(token, '/user');

  return {
    login: data.login,
    name: data.name,
    avatarUrl: data.avatar_url,
    htmlUrl: data.html_url,
  };
}

export async function listUserRepositories(
  token: string
): Promise<GitHubRepo[]> {
  const data = await githubFetch<
    Array<{
      id: number;
      name: string;
      full_name: string;
      owner: { login: string };
      private: boolean;
      default_branch: string;
      html_url: string;
      updated_at: string;
    }>
  >(token, '/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member');

  return data.map((r) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    owner: r.owner.login,
    private: r.private,
    defaultBranch: r.default_branch,
    htmlUrl: r.html_url,
    updatedAt: r.updated_at,
  }));
}

export async function listRepositoryBranches(
  token: string,
  owner: string,
  repo: string
): Promise<GitHubBranch[]> {
  const data = await githubFetch<
    Array<{
      name: string;
      commit: { sha: string };
      protected: boolean;
    }>
  >(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=100`
  );

  return data.map((b) => ({
    name: b.name,
    commitSha: b.commit.sha,
    protected: Boolean(b.protected),
  }));
}

export async function createRepositoryBranch(
  token: string,
  owner: string,
  repo: string,
  newBranch: string,
  baseSha: string
): Promise<GitHubBranch> {
  const created = await githubFetch<{
    ref: string;
    object: { sha: string };
  }>(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ref: `refs/heads/${newBranch}`,
        sha: baseSha,
      }),
    }
  );

  return {
    name: newBranch,
    commitSha: created.object.sha,
    protected: false,
  };
}

export async function getRepositoryFile(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  path: string
): Promise<GitHubFileLookup> {
  const encodedPath = encodeRepoPath(path);
  const url = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo
  )}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`;

  try {
    const data = await githubFetch<{
      type?: string;
      sha?: string;
      content?: string;
      encoding?: string;
      html_url?: string;
    }>(token, url);

    if (data.type !== 'file') {
      throw new GitHubApiError(
        400,
        `Path "${path}" exists in the repository as a ${data.type ?? 'non-file'}.`
      );
    }

    const decoded =
      data.encoding === 'base64' && typeof data.content === 'string'
        ? Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8')
        : null;

    return {
      exists: true,
      sha: data.sha ?? null,
      content: decoded,
      htmlUrl: data.html_url ?? null,
    };
  } catch (err) {
    if (err instanceof GitHubApiError && err.status === 404) {
      return { exists: false, sha: null, content: null, htmlUrl: null };
    }
    throw err;
  }
}

export async function pushRepositoryFile(
  token: string,
  req: GitHubPushRequest
): Promise<GitHubPushResponse> {
  const existing = await getRepositoryFile(
    token,
    req.owner,
    req.repo,
    req.branch,
    req.path
  );

  const encodedPath = encodeRepoPath(req.path);
  const bodyPayload: Record<string, string> = {
    message: req.message,
    content: Buffer.from(req.content, 'utf8').toString('base64'),
    branch: req.branch,
  };
  if (existing.exists && existing.sha) {
    bodyPayload.sha = existing.sha;
  }

  const res = await githubFetch<{
    content: { path: string; html_url: string };
    commit: { sha: string; html_url: string };
  }>(
    token,
    `/repos/${encodeURIComponent(req.owner)}/${encodeURIComponent(
      req.repo
    )}/contents/${encodedPath}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
    }
  );

  return {
    action: existing.exists ? 'updated' : 'created',
    commitSha: res.commit.sha,
    commitUrl: res.commit.html_url,
    fileUrl: res.content.html_url,
    path: res.content.path,
  };
}

export async function listRepositoryCommits(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  path?: string
): Promise<GitHubCommit[]> {
  const params = new URLSearchParams({
    sha: branch,
    per_page: '20',
  });
  if (path) {
    params.set('path', path);
  }

  const data = await githubFetch<
    Array<{
      sha: string;
      html_url: string;
      commit: {
        message: string;
        author: { name?: string; date?: string } | null;
      };
    }>
  >(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
      repo
    )}/commits?${params.toString()}`
  );

  return data.map((c) => ({
    sha: c.sha,
    shortSha: c.sha.slice(0, 7),
    message: c.commit.message.split('\n')[0] || '(no message)',
    authorName: c.commit.author?.name ?? 'Unknown',
    authorDate: c.commit.author?.date ?? '',
    htmlUrl: c.html_url,
  }));
}
