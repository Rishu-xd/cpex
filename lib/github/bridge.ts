'use client';

import type {
  GitHubBranch,
  GitHubCommit,
  GitHubFileLookup,
  GitHubPushRequest,
  GitHubPushResponse,
  GitHubRepo,
  GitHubSessionInfo,
  GitHubTransport,
} from './types';

const REQ_CHANNEL = 'CPEX_GH_BRIDGE_REQ';
const RES_CHANNEL = 'CPEX_GH_BRIDGE_RES';
const READY_CHANNEL = 'CPEX_GH_BRIDGE_READY';

interface BridgeResponse<T> {
  channel: string;
  requestId: string;
  ok: boolean;
  status?: number;
  data?: T;
  error?: string;
}

interface PingResult {
  version: string;
  originAllowed: boolean;
  origin: string;
  configured: boolean;
  connected: boolean;
}

let reqSeq = 0;
let readySignalSeen = false;

if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    if (event.source === window && event.data?.channel === READY_CHANNEL) {
      readySignalSeen = true;
    }
  });
}

function sendExtensionRequest<T>(
  action: string,
  payload: Record<string, unknown> = {},
  timeoutMs = 15000
): Promise<T> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Extension bridge is browser-only.'));
  }

  reqSeq += 1;
  const requestId = `cpex-gh-${Date.now()}-${reqSeq}`;

  return new Promise<T>((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      reject(new Error('Extension bridge request timed out.'));
    }, timeoutMs);

    const onMessage = (event: MessageEvent<BridgeResponse<T>>) => {
      if (event.source !== window) return;
      const msg = event.data;
      if (!msg || msg.channel !== RES_CHANNEL || msg.requestId !== requestId) {
        return;
      }
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);

      if (msg.ok && msg.data !== undefined) {
        resolve(msg.data);
      } else {
        reject(new Error(msg.error || `Extension error (${msg.status ?? 500})`));
      }
    };

    window.addEventListener('message', onMessage);
    window.postMessage(
      {
        channel: REQ_CHANNEL,
        requestId,
        action,
        payload,
      },
      window.location.origin
    );
  });
}

async function pingExtension(): Promise<PingResult | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await sendExtensionRequest<PingResult>(
      'PING',
      {},
      readySignalSeen ? 500 : 350
    );
    readySignalSeen = true;
    return res;
  } catch {
    return null;
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data;
}

export const githubBridge = {
  async getSession(): Promise<GitHubSessionInfo> {
    const ping = await pingExtension();

    if (ping && ping.originAllowed) {
      try {
        const extSession = await sendExtensionRequest<GitHubSessionInfo>(
          'GET_SESSION',
          {}
        );
        if (extSession.connected || extSession.configured) {
          return {
            ...extSession,
            transport: 'extension',
            extensionInstalled: true,
            extensionOriginAllowed: true,
          };
        }
      } catch {
        // Fall through to server check
      }
    }

    try {
      const serverSession = await fetchJson<GitHubSessionInfo>(
        '/api/github/session'
      );
      return {
        ...serverSession,
        transport: 'server',
        extensionInstalled: Boolean(ping),
        extensionOriginAllowed: ping ? ping.originAllowed : false,
      };
    } catch {
      return {
        configured: false,
        connected: false,
        user: null,
        callbackUrl: 'http://localhost:3000/api/github/callback',
        transport: 'server',
        extensionInstalled: Boolean(ping),
        extensionOriginAllowed: ping ? ping.originAllowed : false,
      };
    }
  },

  async listRepos(transport: GitHubTransport): Promise<GitHubRepo[]> {
    if (transport === 'extension') {
      const data = await sendExtensionRequest<{ repos: GitHubRepo[] }>(
        'LIST_REPOS'
      );
      return data.repos;
    }
    const data = await fetchJson<{ repos: GitHubRepo[] }>('/api/github/repos');
    return data.repos;
  },

  async listBranches(
    transport: GitHubTransport,
    owner: string,
    repo: string
  ): Promise<GitHubBranch[]> {
    if (transport === 'extension') {
      const data = await sendExtensionRequest<{ branches: GitHubBranch[] }>(
        'LIST_BRANCHES',
        { owner, repo }
      );
      return data.branches;
    }
    const data = await fetchJson<{ branches: GitHubBranch[] }>(
      `/api/github/branches?owner=${encodeURIComponent(
        owner
      )}&repo=${encodeURIComponent(repo)}`
    );
    return data.branches;
  },

  async createBranch(
    transport: GitHubTransport,
    owner: string,
    repo: string,
    newBranch: string,
    baseSha: string
  ): Promise<GitHubBranch> {
    if (transport === 'extension') {
      const data = await sendExtensionRequest<{ branch: GitHubBranch }>(
        'CREATE_BRANCH',
        { owner, repo, newBranch, baseSha }
      );
      return data.branch;
    }
    const data = await fetchJson<{ branch: GitHubBranch }>(
      '/api/github/branches',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo, newBranch, baseSha }),
      }
    );
    return data.branch;
  },

  async getFile(
    transport: GitHubTransport,
    owner: string,
    repo: string,
    branch: string,
    path: string
  ): Promise<GitHubFileLookup> {
    if (transport === 'extension') {
      return sendExtensionRequest<GitHubFileLookup>('GET_FILE', {
        owner,
        repo,
        branch,
        path,
      });
    }
    const params = new URLSearchParams({ owner, repo, branch, path });
    return fetchJson<GitHubFileLookup>(`/api/github/file?${params.toString()}`);
  },

  async pushFile(
    transport: GitHubTransport,
    req: GitHubPushRequest
  ): Promise<GitHubPushResponse> {
    if (transport === 'extension') {
      return sendExtensionRequest<GitHubPushResponse>(
        'PUSH_FILE',
        req as unknown as Record<string, unknown>
      );
    }
    return fetchJson<GitHubPushResponse>('/api/github/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
  },

  async listCommits(
    transport: GitHubTransport,
    owner: string,
    repo: string,
    branch: string,
    path?: string
  ): Promise<GitHubCommit[]> {
    if (transport === 'extension') {
      const data = await sendExtensionRequest<{ commits: GitHubCommit[] }>(
        'LIST_COMMITS',
        { owner, repo, branch, path }
      );
      return data.commits;
    }
    const params = new URLSearchParams({ owner, repo, branch });
    if (path) params.set('path', path);
    const data = await fetchJson<{ commits: GitHubCommit[] }>(
      `/api/github/commits?${params.toString()}`
    );
    return data.commits;
  },

  async disconnect(transport: GitHubTransport): Promise<void> {
    if (transport === 'extension') {
      await sendExtensionRequest('DISCONNECT');
      return;
    }
    await fetchJson('/api/github/logout', { method: 'POST' });
  },
};
