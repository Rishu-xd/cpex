import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  base64ToUtf8,
  isOriginAllowed,
  normalizeOrigin,
  normalizeRepoFilePath,
  parseEnvText,
  utf8ToBase64,
  validatePushPayload,
} from '../extension/shared/validation.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const extDir = join(__dirname, '..', 'extension');

// 1. Manifest & file checks
const manifest = JSON.parse(readFileSync(join(extDir, 'manifest.json'), 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.background.service_worker, 'background.js');
assert.equal(manifest.action.default_popup, 'popup.html');

for (const relPath of [
  'background.js',
  'content.js',
  'popup.html',
  'popup.css',
  'popup.js',
  'shared/validation.js',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png',
]) {
  const full = join(extDir, relPath);
  assert.ok(existsSync(full), `Missing extension file: ${relPath}`);
  assert.ok(statSync(full).size > 0, `Empty extension file: ${relPath}`);
}

// 2. .env parser checks
{
  const parsed = parseEnvText(`
    # comment
    GITHUB_TOKEN="ghp_test123456"
    export GITHUB_CLIENT_ID='Iv1.abc'
    GITHUB_CLIENT_SECRET=sec_xyz
    NEXT_PUBLIC_APP_URL=https://cpex.example.com/
  `);
  assert.equal(parsed.token, 'ghp_test123456');
  assert.equal(parsed.clientId, 'Iv1.abc');
  assert.equal(parsed.clientSecret, 'sec_xyz');
  assert.deepEqual(parsed.allowedOrigins, ['https://cpex.example.com']);
}

// 3. Origin whitelist checks
{
  const allowed = ['http://localhost:3000', 'https://cpex.example.com'];
  assert.equal(isOriginAllowed('http://localhost:3000', allowed), true);
  assert.equal(isOriginAllowed('http://localhost:3000/', allowed), true);
  assert.equal(isOriginAllowed('https://evil.example.com', allowed), false);
  assert.equal(normalizeOrigin('https://cpex.example.com/app'), 'https://cpex.example.com');
  assert.equal(normalizeOrigin('javascript:alert(1)'), null);
}

// 4. Path & push validation + Unicode Base64 round-trip
{
  assert.equal(normalizeRepoFilePath('dsa\\binary_search.cpp'), 'dsa/binary_search.cpp');
  assert.equal(normalizeRepoFilePath('../secret'), null);

  const ok = validatePushPayload({
    owner: 'octocat',
    repo: 'cpex-solutions',
    branch: 'main',
    path: '/graphs/bfs.cpp',
    content: '// O(V + E) — traversal\nint main() { return 0; }\n',
    message: 'feat: add bfs.cpp',
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.data.path, 'graphs/bfs.cpp');

  const sample = '// C++17 — αβγ 🚀\n#include <iostream>\n';
  assert.equal(base64ToUtf8(utf8ToBase64(sample)), sample);
}

console.log('ALL EXTENSION CHECKS PASSED');
