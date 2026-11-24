import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const base =
  'C:\\Users\\rishu\\.gemini\\antigravity\\brain\\88e779e6-be9d-4a49-b6e7-a418923f0654\\scratch\\phase4-test';

const {
  decryptSecret,
  encryptSecret,
  generateOAuthState,
  safeCompare,
} = require(`${base}\\crypto.js`);
const {
  isValidBranchName,
  isValidGitHubIdentifier,
  normalizeRepoFilePath,
  validatePushPayload,
} = require(`${base}\\validation.js`);

// 1. AES-256-GCM cookie crypto checks
{
  const secret = 'super-secret-session-key-1234567890';
  const sealed = encryptSecret('gho_exampleAccessToken123', secret);
  assert.ok(sealed.startsWith('v1.'));
  assert.equal(decryptSecret(sealed, secret), 'gho_exampleAccessToken123');
  assert.equal(decryptSecret(sealed, 'wrong-secret'), null);

  // Tamper check
  const parts = sealed.split('.');
  parts[3] = parts[3].slice(0, -2) + 'AA';
  assert.equal(decryptSecret(parts.join('.'), secret), null);

  const st1 = generateOAuthState();
  const st2 = generateOAuthState();
  assert.ok(st1.length >= 20);
  assert.notEqual(st1, st2);
  assert.equal(safeCompare(st1, st1), true);
  assert.equal(safeCompare(st1, st2), false);
}

// 2. GitHub identifier, branch, and path validation
{
  assert.equal(isValidGitHubIdentifier('octocat'), true);
  assert.equal(isValidGitHubIdentifier('cpex-dsa.lab'), true);
  assert.equal(isValidGitHubIdentifier('..'), false);
  assert.equal(isValidGitHubIdentifier('foo/bar'), false);

  assert.equal(isValidBranchName('main'), true);
  assert.equal(isValidBranchName('feature/sliding-window'), true);
  assert.equal(isValidBranchName('bad..branch'), false);
  assert.equal(isValidBranchName('bad branch'), false);
  assert.equal(isValidBranchName('branch.lock'), false);

  assert.equal(normalizeRepoFilePath('/dsa\\binary_search.cpp/'), 'dsa/binary_search.cpp');
  assert.equal(normalizeRepoFilePath('../secret.txt'), null);
  assert.equal(normalizeRepoFilePath('a/../b.cpp'), null);
  assert.equal(normalizeRepoFilePath(''), null);
}

// 3. Push payload validation
{
  const valid = validatePushPayload({
    owner: 'octocat',
    repo: 'dsa-lab',
    branch: 'main',
    path: '/arrays/two_sum.cpp',
    content: '#include <iostream>\nint main() { return 0; }\n',
    message: 'feat: add two_sum.cpp',
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.data.path, 'arrays/two_sum.cpp');

  const emptyMsg = validatePushPayload({
    owner: 'octocat',
    repo: 'dsa-lab',
    branch: 'main',
    path: 'main.cpp',
    content: 'int main(){}',
    message: '   ',
  });
  assert.equal(emptyMsg.ok, false);

  const traversal = validatePushPayload({
    owner: 'octocat',
    repo: 'dsa-lab',
    branch: 'main',
    path: '../../etc/passwd',
    content: 'x',
    message: 'test',
  });
  assert.equal(traversal.ok, false);
}

console.log('ALL PHASE 4 GITHUB SECURITY CHECKS PASSED');
