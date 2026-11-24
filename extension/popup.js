import { normalizeOrigin } from './shared/validation.js';

const statusPill = document.getElementById('statusPill');
const feedback = document.getElementById('feedback');
const envInput = document.getElementById('envInput');
const importEnvBtn = document.getElementById('importEnvBtn');
const tokenInput = document.getElementById('tokenInput');
const saveTokenBtn = document.getElementById('saveTokenBtn');
const testBtn = document.getElementById('testBtn');
const clientIdInput = document.getElementById('clientIdInput');
const clientSecretInput = document.getElementById('clientSecretInput');
const redirectUrlEl = document.getElementById('redirectUrl');
const oauthBtn = document.getElementById('oauthBtn');
const originsList = document.getElementById('originsList');
const originInput = document.getElementById('originInput');
const addOriginBtn = document.getElementById('addOriginBtn');
const clearBtn = document.getElementById('clearBtn');

let currentConfig = null;

function showFeedback(text, isError = false) {
  feedback.textContent = text;
  feedback.className = `feedback ${isError ? 'err' : 'ok'}`;
}

function sendPopupMsg(payload) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(payload, (res) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }
      resolve(res || { ok: false, error: 'No response from background worker.' });
    });
  });
}

function renderConfig(cfg) {
  currentConfig = cfg;
  if (cfg.user?.login) {
    statusPill.textContent = `@${cfg.user.login}`;
    statusPill.className = 'pill pill-ok';
  } else if (cfg.hasToken) {
    statusPill.textContent = 'Token saved';
    statusPill.className = 'pill pill-idle';
  } else {
    statusPill.textContent = 'Not connected';
    statusPill.className = 'pill pill-idle';
  }

  tokenInput.placeholder = cfg.hasToken
    ? '•••••••• (token stored; enter to replace)'
    : 'ghp_... (Personal Access Token)';
  clientIdInput.value = cfg.clientId || '';
  clientSecretInput.placeholder = cfg.hasClientSecret
    ? '•••••••• (secret stored; enter to replace)'
    : 'GITHUB_CLIENT_SECRET';
  redirectUrlEl.textContent = cfg.redirectUrl || '';

  originsList.innerHTML = '';
  for (const origin of cfg.allowedOrigins || []) {
    const li = document.createElement('li');
    li.className = 'origin-item';
    const span = document.createElement('span');
    span.textContent = origin;
    const btn = document.createElement('button');
    btn.className = 'origin-remove';
    btn.type = 'button';
    btn.textContent = '✕';
    btn.title = `Remove ${origin}`;
    btn.addEventListener('click', async () => {
      const nextOrigins = (currentConfig.allowedOrigins || []).filter(
        (o) => o !== origin
      );
      const res = await sendPopupMsg({
        type: 'EXT_SAVE_CONFIG',
        allowedOrigins: nextOrigins,
      });
      if (res.ok) {
        renderConfig(res.data);
        showFeedback(`Removed origin ${origin}`);
      } else {
        showFeedback(res.error, true);
      }
    });
    li.appendChild(span);
    li.appendChild(btn);
    originsList.appendChild(li);
  }
}

async function init() {
  const res = await sendPopupMsg({ type: 'EXT_GET_CONFIG' });
  if (res.ok) {
    renderConfig(res.data);
  } else {
    showFeedback(res.error || 'Failed to read extension state', true);
  }
}

importEnvBtn.addEventListener('click', async () => {
  const text = envInput.value.trim();
  if (!text) {
    showFeedback('Paste .env lines first.', true);
    return;
  }
  const res = await sendPopupMsg({
    type: 'EXT_PARSE_AND_SAVE_ENV',
    envText: text,
  });
  if (res.ok) {
    renderConfig(res.data);
    envInput.value = '';
    const imp = res.data.importedFields;
    showFeedback(
      `Imported .env (token: ${imp.token ? 'yes' : 'no'}, clientId: ${
        imp.clientId ? 'yes' : 'no'
      }, origins: +${imp.originsCount}).`
    );
  } else {
    showFeedback(res.error, true);
  }
});

saveTokenBtn.addEventListener('click', async () => {
  const token = tokenInput.value.trim();
  if (!token && !currentConfig?.hasToken) {
    showFeedback('Enter a GitHub Personal Access Token.', true);
    return;
  }
  const res = await sendPopupMsg({
    type: 'EXT_SAVE_CONFIG',
    token,
    clientId: clientIdInput.value.trim(),
    clientSecret: clientSecretInput.value.trim(),
  });
  if (res.ok) {
    tokenInput.value = '';
    clientSecretInput.value = '';
    renderConfig(res.data);
    showFeedback(
      res.data.user
        ? `Connected as @${res.data.user.login}`
        : 'Saved configuration.'
    );
  } else {
    showFeedback(res.error, true);
  }
});

testBtn.addEventListener('click', async () => {
  const res = await sendPopupMsg({ type: 'EXT_TEST_CONNECTION' });
  if (res.ok) {
    renderConfig(res.data);
    showFeedback(`Verified GitHub token for @${res.data.user.login}`);
  } else {
    showFeedback(res.error, true);
  }
});

oauthBtn.addEventListener('click', async () => {
  const res = await sendPopupMsg({
    type: 'EXT_START_OAUTH',
    clientId: clientIdInput.value.trim(),
    clientSecret: clientSecretInput.value.trim(),
  });
  if (res.ok) {
    clientSecretInput.value = '';
    renderConfig(res.data);
    showFeedback(`Authenticated via OAuth as @${res.data.user.login}`);
  } else {
    showFeedback(res.error, true);
  }
});

addOriginBtn.addEventListener('click', async () => {
  const normalized = normalizeOrigin(originInput.value);
  if (!normalized) {
    showFeedback('Enter a valid http:// or https:// origin.', true);
    return;
  }
  const existing = currentConfig?.allowedOrigins || [];
  if (existing.includes(normalized)) {
    originInput.value = '';
    return;
  }
  const res = await sendPopupMsg({
    type: 'EXT_SAVE_CONFIG',
    allowedOrigins: [...existing, normalized],
  });
  if (res.ok) {
    originInput.value = '';
    renderConfig(res.data);
    showFeedback(`Allowed origin ${normalized}`);
  } else {
    showFeedback(res.error, true);
  }
});

clearBtn.addEventListener('click', async () => {
  const res = await sendPopupMsg({ type: 'EXT_CLEAR_CREDENTIALS' });
  if (res.ok) {
    tokenInput.value = '';
    clientSecretInput.value = '';
    renderConfig(res.data);
    showFeedback('Cleared stored GitHub credentials.');
  } else {
    showFeedback(res.error, true);
  }
});

void init();
