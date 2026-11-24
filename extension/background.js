import {
  base64ToUtf8,
  isOriginAllowed,
  isValidBranchName,
  isValidGitHubIdentifier,
  normalizeOrigin,
  normalizeRepoFilePath,
  parseEnvText,
  utf8ToBase64,
  validatePushPayload,
} from './shared/validation.js';

const VAULT_KEY = 'cpex_gh_vault_v1';
const GITHUB_API_BASE = 'https://api.github.com';
const DEFAULT_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

class GitHubApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function getDefaultVault() {
  return {
    token: '',
    clientId: '',
    clientSecret: '',
    allowedOrigins: [...DEFAULT_ORIGINS],
    user: null,
  };
}

async function readVault() {
  const res = await chrome.storage.local.get(VAULT_KEY);
  const stored = res?.[VAULT_KEY];
  if (!stored || typeof stored !== 'object') {
    return getDefaultVault();
  }
  return {
    token: typeof stored.token === 'string' ? stored.token : '',
    clientId: typeof stored.clientId === 'string' ? stored.clientId : '',
    clientSecret:
      typeof stored.clientSecret === 'string' ? stored.clientSecret : '',
    allowedOrigins:
      Array.isArray(stored.allowedOrigins) && stored.allowedOrigins.length > 0
        ? stored.allowedOrigins
        : [...DEFAULT_ORIGINS],
    user: stored.user && typeof stored.user === 'object' ? stored.user : null,
  };
}

async function writeVault(vault) {
  await chrome.storage.local.set({ [VAULT_KEY]: vault });
}

function encodeRepoPath(path) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

async function githubFetch(token, endpoint, init = {}) {
  const res = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    ...init,
    cache: 'no-store',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    let apiMsg = `GitHub API returned status ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) apiMsg = data.message;
    } catch {
      // Ignore parse errors
    }
    throw new GitHubApiError(res.status, apiMsg);
  }

  return res.json();
}

async function fetchUser(token) {
  const data = await githubFetch(token, '/user');
  return {
    login: data.login,
    name: data.name ?? null,
    avatarUrl: data.avatar_url,
    htmlUrl: data.html_url,
  };
}

async function listRepos(token) {
  const data = await githubFetch(
    token,
    '/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member'
  );
  return data.map((r) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    owner: r.owner.login,
    private: Boolean(r.private),
    defaultBranch: r.default_branch,
    htmlUrl: r.html_url,
    updatedAt: r.updated_at,
  }));
}

async function listBranches(token, owner, repo) {
  const data = await githubFetch(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=100`
  );
  return data.map((b) => ({
    name: b.name,
    commitSha: b.commit.sha,
    protected: Boolean(b.protected),
  }));
}

async function createBranch(token, owner, repo, newBranch, baseSha) {
  const created = await githubFetch(
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

async function getFile(token, owner, repo, branch, path) {
  const encodedPath = encodeRepoPath(path);
  const url = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo
  )}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`;

  try {
    const data = await githubFetch(token, url);
    if (data.type !== 'file') {
      throw new GitHubApiError(
        400,
        `Path "${path}" exists in repository as ${data.type || 'non-file'}.`
      );
    }
    const decoded =
      data.encoding === 'base64' && typeof data.content === 'string'
        ? base64ToUtf8(data.content)
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

async function pushFile(token, req) {
  const existing = await getFile(token, req.owner, req.repo, req.branch, req.path);
  const encodedPath = encodeRepoPath(req.path);
  const payload = {
    message: req.message,
    content: utf8ToBase64(req.content),
    branch: req.branch,
  };
  if (existing.exists && existing.sha) {
    payload.sha = existing.sha;
  }

  const res = await githubFetch(
    token,
    `/repos/${encodeURIComponent(req.owner)}/${encodeURIComponent(
      req.repo
    )}/contents/${encodedPath}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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

async function listCommits(token, owner, repo, branch, path) {
  const params = new URLSearchParams({ sha: branch, per_page: '20' });
  if (path) params.set('path', path);

  const data = await githubFetch(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
      repo
    )}/commits?${params.toString()}`
  );
  return data.map((c) => ({
    sha: c.sha,
    shortSha: c.sha.slice(0, 7),
    message: (c.commit?.message || '').split('\n')[0] || '(no message)',
    authorName: c.commit?.author?.name || 'Unknown',
    authorDate: c.commit?.author?.date || '',
    htmlUrl: c.html_url,
  }));
}

function sanitizeVaultForPopup(vault) {
  return {
    hasToken: Boolean(vault.token),
    hasClientSecret: Boolean(vault.clientSecret),
    clientId: vault.clientId,
    allowedOrigins: vault.allowedOrigins,
    user: vault.user,
    redirectUrl: chrome.identity.getRedirectURL('github'),
  };
}

function generateOAuthState() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function handlePopupAction(msg) {
  const vault = await readVault();

  if (msg.type === 'EXT_GET_CONFIG') {
    return { ok: true, data: sanitizeVaultForPopup(vault) };
  }

  if (msg.type === 'EXT_SAVE_CONFIG') {
    const next = { ...vault };
    if (typeof msg.token === 'string' && msg.token.trim()) {
      next.token = msg.token.trim();
    }
    if (typeof msg.clientId === 'string') {
      next.clientId = msg.clientId.trim();
    }
    if (typeof msg.clientSecret === 'string' && msg.clientSecret.trim()) {
      next.clientSecret = msg.clientSecret.trim();
    }
    if (Array.isArray(msg.allowedOrigins)) {
      const cleaned = msg.allowedOrigins
        .map((o) => normalizeOrigin(o))
        .filter(Boolean);
      next.allowedOrigins =
        cleaned.length > 0 ? Array.from(new Set(cleaned)) : [...DEFAULT_ORIGINS];
    }

    if (next.token) {
      next.user = await fetchUser(next.token);
    } else {
      next.user = null;
    }

    await writeVault(next);
    return { ok: true, data: sanitizeVaultForPopup(next) };
  }

  if (msg.type === 'EXT_PARSE_AND_SAVE_ENV') {
    const parsed = parseEnvText(msg.envText || '');
    const next = { ...vault };
    if (parsed.token) next.token = parsed.token;
    if (parsed.clientId) next.clientId = parsed.clientId;
    if (parsed.clientSecret) next.clientSecret = parsed.clientSecret;
    if (parsed.allowedOrigins.length > 0) {
      next.allowedOrigins = Array.from(
        new Set([...next.allowedOrigins, ...parsed.allowedOrigins])
      );
    }

    if (next.token) {
      next.user = await fetchUser(next.token);
    }

    await writeVault(next);
    return {
      ok: true,
      data: {
        ...sanitizeVaultForPopup(next),
        importedFields: {
          token: Boolean(parsed.token),
          clientId: Boolean(parsed.clientId),
          clientSecret: Boolean(parsed.clientSecret),
          originsCount: parsed.allowedOrigins.length,
        },
      },
    };
  }

  if (msg.type === 'EXT_TEST_CONNECTION') {
    if (!vault.token) {
      throw new GitHubApiError(
        400,
        'No GitHub token stored. Paste a GITHUB_TOKEN or sign in via OAuth.'
      );
    }
    const user = await fetchUser(vault.token);
    const next = { ...vault, user };
    await writeVault(next);
    return { ok: true, data: sanitizeVaultForPopup(next) };
  }

  if (msg.type === 'EXT_START_OAUTH') {
    const clientId = (msg.clientId || vault.clientId || '').trim();
    const clientSecret = (msg.clientSecret || vault.clientSecret || '').trim();
    if (!clientId || !clientSecret) {
      throw new GitHubApiError(
        400,
        'Enter both GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET first.'
      );
    }

    const redirectUri = chrome.identity.getRedirectURL('github');
    const state = generateOAuthState();
    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'repo read:user');
    authUrl.searchParams.set('state', state);

    const callbackUrlStr = await chrome.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: true,
    });
    if (!callbackUrlStr) {
      throw new GitHubApiError(400, 'OAuth flow cancelled.');
    }

    const cbUrl = new URL(callbackUrlStr);
    const returnedState = cbUrl.searchParams.get('state') || '';
    const code = cbUrl.searchParams.get('code') || '';
    if (!code || returnedState !== state) {
      throw new GitHubApiError(400, 'OAuth state mismatch or missing code.');
    }

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) {
      throw new GitHubApiError(
        400,
        tokenJson.error_description || tokenJson.error || 'Token exchange failed.'
      );
    }

    const user = await fetchUser(tokenJson.access_token);
    const next = {
      ...vault,
      clientId,
      clientSecret,
      token: tokenJson.access_token,
      user,
    };
    await writeVault(next);
    return { ok: true, data: sanitizeVaultForPopup(next) };
  }

  if (msg.type === 'EXT_CLEAR_CREDENTIALS') {
    const next = {
      ...getDefaultVault(),
      allowedOrigins: vault.allowedOrigins,
    };
    await writeVault(next);
    return { ok: true, data: sanitizeVaultForPopup(next) };
  }

  throw new GitHubApiError(400, `Unknown popup action: ${msg.type}`);
}

function resolveSenderOrigin(sender) {
  if (sender.origin) return sender.origin;
  if (sender.tab?.url) {
    try {
      return new URL(sender.tab.url).origin;
    } catch {
      return '';
    }
  }
  return '';
}

async function handleBridgeAction(msg, sender) {
  const vault = await readVault();
  const origin = resolveSenderOrigin(sender);
  const originAllowed = isOriginAllowed(origin, vault.allowedOrigins);
  const action = msg.action;
  const payload = msg.payload || {};

  if (action === 'PING') {
    return {
      ok: true,
      data: {
        version: '1.0.0',
        originAllowed,
        origin,
        configured: Boolean(vault.token || (vault.clientId && vault.clientSecret)),
        connected: Boolean(vault.token),
      },
    };
  }

  if (!originAllowed) {
    throw new GitHubApiError(
      403,
      `Origin "${origin}" is not in CPex GitHub Bridge allowed origins.`
    );
  }

  if (action === 'GET_SESSION') {
    const redirectUrl = chrome.identity.getRedirectURL('github');
    const configured = Boolean(vault.token || (vault.clientId && vault.clientSecret));
    if (!vault.token) {
      return {
        ok: true,
        data: {
          configured,
          connected: false,
          user: null,
          callbackUrl: redirectUrl,
          transport: 'extension',
          extensionInstalled: true,
          extensionOriginAllowed: true,
        },
      };
    }

    try {
      const user = await fetchUser(vault.token);
      if (vault.user?.login !== user.login) {
        await writeVault({ ...vault, user });
      }
      return {
        ok: true,
        data: {
          configured: true,
          connected: true,
          user,
          callbackUrl: redirectUrl,
          transport: 'extension',
          extensionInstalled: true,
          extensionOriginAllowed: true,
        },
      };
    } catch (err) {
      if (err instanceof GitHubApiError && err.status === 401) {
        await writeVault({ ...vault, token: '', user: null });
      }
      return {
        ok: true,
        data: {
          configured,
          connected: false,
          user: null,
          callbackUrl: redirectUrl,
          transport: 'extension',
          extensionInstalled: true,
          extensionOriginAllowed: true,
        },
      };
    }
  }

  if (action === 'DISCONNECT') {
    await writeVault({ ...vault, token: '', user: null });
    return { ok: true, data: { ok: true } };
  }

  if (!vault.token) {
    throw new GitHubApiError(
      401,
      'GitHub credentials are not configured in the CPex extension popup.'
    );
  }

  if (action === 'LIST_REPOS') {
    const repos = await listRepos(vault.token);
    return { ok: true, data: { repos } };
  }

  if (action === 'LIST_BRANCHES') {
    const owner = String(payload.owner || '').trim();
    const repo = String(payload.repo || '').trim();
    if (!isValidGitHubIdentifier(owner) || !isValidGitHubIdentifier(repo)) {
      throw new GitHubApiError(400, 'Invalid repository owner or name.');
    }
    const branches = await listBranches(vault.token, owner, repo);
    return { ok: true, data: { branches } };
  }

  if (action === 'CREATE_BRANCH') {
    const owner = String(payload.owner || '').trim();
    const repo = String(payload.repo || '').trim();
    const newBranch = String(payload.newBranch || '').trim();
    const baseSha = String(payload.baseSha || '').trim();
    if (!isValidGitHubIdentifier(owner) || !isValidGitHubIdentifier(repo)) {
      throw new GitHubApiError(400, 'Invalid repository owner or name.');
    }
    if (!isValidBranchName(newBranch)) {
      throw new GitHubApiError(400, 'Invalid branch name.');
    }
    if (!/^[a-f0-9]{40}$/i.test(baseSha)) {
      throw new GitHubApiError(400, 'Invalid base commit SHA.');
    }
    const branch = await createBranch(
      vault.token,
      owner,
      repo,
      newBranch,
      baseSha
    );
    return { ok: true, data: { branch } };
  }

  if (action === 'GET_FILE') {
    const owner = String(payload.owner || '').trim();
    const repo = String(payload.repo || '').trim();
    const branch = String(payload.branch || '').trim();
    const path = normalizeRepoFilePath(payload.path);
    if (
      !isValidGitHubIdentifier(owner) ||
      !isValidGitHubIdentifier(repo) ||
      !isValidBranchName(branch) ||
      !path
    ) {
      throw new GitHubApiError(400, 'Invalid repository, branch, or file path.');
    }
    const file = await getFile(vault.token, owner, repo, branch, path);
    return { ok: true, data: file };
  }

  if (action === 'PUSH_FILE') {
    const validated = validatePushPayload(payload);
    if (!validated.ok) {
      throw new GitHubApiError(400, validated.error);
    }
    const pushed = await pushFile(vault.token, validated.data);
    return { ok: true, data: pushed };
  }

  if (action === 'LIST_COMMITS') {
    const owner = String(payload.owner || '').trim();
    const repo = String(payload.repo || '').trim();
    const branch = String(payload.branch || '').trim();
    const rawPath = payload.path ? String(payload.path) : '';
    const path = rawPath.trim() ? normalizeRepoFilePath(rawPath) : undefined;
    if (
      !isValidGitHubIdentifier(owner) ||
      !isValidGitHubIdentifier(repo) ||
      !isValidBranchName(branch) ||
      (rawPath.trim() && !path)
    ) {
      throw new GitHubApiError(400, 'Invalid commit query parameters.');
    }
    const commits = await listCommits(vault.token, owner, repo, branch, path);
    return { ok: true, data: { commits } };
  }

  throw new GitHubApiError(400, `Unsupported bridge action: ${action}`);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const run = async () => {
    if (sender.tab && message?.bridge === true) {
      return handleBridgeAction(message, sender);
    }
    if (!sender.tab && message?.type?.startsWith('EXT_')) {
      return handlePopupAction(message);
    }
    return { ok: false, status: 400, error: 'Unauthorized or malformed message.' };
  };

  run()
    .then((result) => sendResponse(result))
    .catch((err) => {
      const status = err instanceof GitHubApiError ? err.status : 500;
      const errorMsg = err instanceof Error ? err.message : 'Unexpected extension error.';
      sendResponse({ ok: false, status, error: errorMsg });
    });

  return true; // keep message channel open for async response
});
