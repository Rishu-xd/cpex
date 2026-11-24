const IDENTIFIER_RE = /^[A-Za-z0-9._-]{1,100}$/;
const MAX_CONTENT_BYTES = 1024 * 1024; // 1 MB

export function isValidGitHubIdentifier(value) {
  if (typeof value !== 'string') return false;
  if (!IDENTIFIER_RE.test(value)) return false;
  if (value === '.' || value === '..' || value.includes('..')) return false;
  return true;
}

export function isValidBranchName(value) {
  if (typeof value !== 'string') return false;
  if (!value || value.length > 200) return false;
  if (/[\s~^:?*\[\\\x00-\x1f\x7f]/.test(value)) return false;
  if (value.includes('..') || value.includes('@{') || value.includes('//')) {
    return false;
  }
  if (value.startsWith('/') || value.endsWith('/') || value.startsWith('.')) {
    return false;
  }
  if (value.endsWith('.') || value.endsWith('.lock')) return false;
  return true;
}

export function normalizeRepoFilePath(rawPath) {
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

export function validatePushPayload(input) {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: 'Request payload must be an object.' };
  }

  const owner = typeof input.owner === 'string' ? input.owner.trim() : '';
  const repo = typeof input.repo === 'string' ? input.repo.trim() : '';
  const branch = typeof input.branch === 'string' ? input.branch.trim() : '';
  const pathRaw = typeof input.path === 'string' ? input.path : '';
  const content = typeof input.content === 'string' ? input.content : null;
  const message = typeof input.message === 'string' ? input.message.trim() : '';

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

export function normalizeOrigin(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.origin;
  } catch {
    return null;
  }
}

export function isOriginAllowed(origin, allowedOrigins) {
  if (typeof origin !== 'string' || !Array.isArray(allowedOrigins)) return false;
  const cleanOrigin = origin.trim().replace(/\/+$/, '');
  return allowedOrigins.some(
    (entry) =>
      typeof entry === 'string' &&
      entry.trim().replace(/\/+$/, '') === cleanOrigin
  );
}

export function parseEnvText(rawText) {
  const result = {
    token: '',
    clientId: '',
    clientSecret: '',
    allowedOrigins: [],
  };
  if (typeof rawText !== 'string') return result;

  const lines = rawText.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIdx = line.indexOf('=');
    if (eqIdx <= 0) continue;

    let key = line.slice(0, eqIdx).trim();
    if (key.startsWith('export ')) {
      key = key.slice(7).trim();
    }

    let val = line.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"') && val.length >= 2) ||
      (val.startsWith("'") && val.endsWith("'") && val.length >= 2)
    ) {
      val = val.slice(1, -1);
    }

    if (key === 'GITHUB_TOKEN' || key === 'GITHUB_PAT') {
      result.token = val;
    } else if (key === 'GITHUB_CLIENT_ID') {
      result.clientId = val;
    } else if (key === 'GITHUB_CLIENT_SECRET') {
      result.clientSecret = val;
    } else if (key === 'NEXT_PUBLIC_APP_URL' || key === 'CPEX_ALLOWED_ORIGINS') {
      for (const part of val.split(',')) {
        const origin = normalizeOrigin(part);
        if (origin && !result.allowedOrigins.includes(origin)) {
          result.allowedOrigins.push(origin);
        }
      }
    }
  }

  return result;
}

export function utf8ToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function base64ToUtf8(base64) {
  const clean = base64.replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}
