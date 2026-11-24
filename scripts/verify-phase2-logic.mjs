import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const compiledBase =
  'C:\\Users\\rishu\\.gemini\\antigravity\\brain\\88e779e6-be9d-4a49-b6e7-a418923f0654\\scratch\\phase2-test\\lib\\experiments';

const { computeOutputDiff, visualizeWhitespace } = require(
  `${compiledBase}\\diff.js`
);
const {
  addVersionSnapshot,
  createBlankExperiment,
  createInitialStoreState,
  duplicateExperiment,
  migrateV1ToV2,
  restoreVersionInExperiment,
} = require(`${compiledBase}\\store.js`);

// 1. Diff utility checks
{
  const exact = computeOutputDiff('1 2 3\n4 5\n', '1 2 3  \r\n4 5   \n\n');
  assert.equal(exact.isMatch, true);
  assert.equal(exact.rows.length, 2);
  assert.equal(exact.rows[0].kind, 'equal');

  const mismatch = computeOutputDiff('1\n2\n3', '1\n99');
  assert.equal(mismatch.isMatch, false);
  assert.equal(mismatch.rows.length, 3);
  assert.equal(mismatch.rows[0].kind, 'equal');
  assert.equal(mismatch.rows[1].kind, 'changed');
  assert.equal(mismatch.rows[2].kind, 'removed');

  assert.equal(visualizeWhitespace('a b\tc'), 'a·b→c');
}

// 2. Store operations checks
{
  const initial = createInitialStoreState();
  assert.equal(initial.experiments.length, 1);
  assert.equal(initial.experiments[0].id, 'exp-starter');
  assert.equal(initial.experiments[0].createdAt, '');

  const blank = createBlankExperiment(
    'Sliding Window',
    'exp-2',
    '2026-11-24T05:00:00.000Z',
    true
  );
  assert.equal(blank.isTemporary, true);
  assert.equal(blank.lastSavedAt, null);

  const v1 = addVersionSnapshot(
    blank,
    'Brute force',
    'ver-1',
    '2026-11-24T05:01:00.000Z'
  );
  assert.equal(v1.versions.length, 1);
  assert.equal(v1.versions[0].versionNumber, 1);

  const edited = {
    ...v1,
    files: [
      {
        name: 'main.cpp',
        content: '// optimized\nint main() { return 0; }\n',
      },
    ],
    stdin: '42',
  };

  const restored = restoreVersionInExperiment(
    edited,
    'ver-1',
    'ver-backup',
    '2026-11-24T05:02:00.000Z',
    true
  );
  assert.equal(restored.versions.length, 2);
  assert.equal(restored.versions[0].versionNumber, 2);
  assert.match(restored.versions[0].label, /Auto-backup before restoring v1/);
  assert.equal(restored.stdin, '');
  assert.match(restored.files[0].content, /ios::sync_with_stdio/);

  const dup = duplicateExperiment(
    restored,
    'exp-dup',
    '2026-11-24T05:03:00.000Z'
  );
  assert.equal(dup.name, 'Sliding Window (Copy)');
  assert.equal(dup.isTemporary, false);
  assert.equal(dup.versions.length, 1);
  assert.notEqual(dup.testCases[0].id, restored.testCases[0].id);
}

// 3. v1 -> v2 migration check
{
  const v1Draft = JSON.stringify({
    experimentName: 'Binary Search Lab',
    files: [{ name: 'main.cpp', content: 'int main(){return 0;}' }],
    activeFile: 'main.cpp',
    entryFile: 'main.cpp',
    stdin: '5 3',
    testCases: [
      { id: 'tc-9', name: 'Sample', stdin: '5 3', expectedOutput: '1' },
    ],
    savedAt: '10:30:00',
  });
  const migrated = migrateV1ToV2(v1Draft, null, '2026-11-24T05:05:00.000Z');
  assert.ok(migrated);
  assert.equal(migrated.experiments[0].name, 'Binary Search Lab');
  assert.equal(migrated.experiments[0].stdin, '5 3');
  assert.equal(migrated.experiments[0].testCases[0].expectedOutput, '1');
}

console.log('ALL PHASE 2 LOGIC CHECKS PASSED');
