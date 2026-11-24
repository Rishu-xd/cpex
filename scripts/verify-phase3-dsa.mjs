import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const base =
  'C:\\Users\\rishu\\.gemini\\antigravity\\brain\\88e779e6-be9d-4a49-b6e7-a418923f0654\\scratch\\phase3-test';

const {
  DATA_STRUCTURES_CATALOG,
  ALGORITHMS_CATALOG,
} = require(`${base}\\types.js`);
const S = require(`${base}\\structures.js`);
const A = require(`${base}\\algorithms.js`);

// Catalog counts
assert.equal(DATA_STRUCTURES_CATALOG.length, 10);
assert.equal(ALGORITHMS_CATALOG.length, 11);

// 1. Vector capacity doubling
{
  let arr = S.initArray([1, 2, 3, 4]);
  assert.equal(arr.capacity, 4);
  const f = S.arrayPushBack(arr, 5);
  arr = f[f.length - 1].state;
  assert.deepEqual(arr.items, [1, 2, 3, 4, 5]);
  assert.equal(arr.capacity, 8);
  const searchF = S.arraySearch(arr, 4);
  assert.equal(searchF[searchF.length - 1].foundIndex, 3);
}

// 2. String operations
{
  let st = S.initString('CPEX');
  st = S.stringInsertAt(st, 4, 'LAB').at(-1).state;
  assert.equal(st.chars.join(''), 'CPEXLAB');
  const found = S.stringSearchSubstring(st, 'EXL');
  assert.equal(found.at(-1).foundIndex, 2);
  st = S.stringReverse(st).at(-1).state;
  assert.equal(st.chars.join(''), 'BALXEPC');
}

// 3. Linked list
{
  let ll = S.initLinkedList([10, 20, 30], true);
  ll = S.llInsertHead(ll, 5).at(-1).state;
  ll = S.llDeleteValue(ll, 20).at(-1).state;
  ll = S.llReverse(ll).at(-1).state;
  assert.deepEqual(
    ll.nodes.map((n) => n.value),
    [30, 10, 5]
  );
}

// 4. Stack & Queue
{
  let st = S.initStack([1, 2]);
  st = S.stackPush(st, 3).at(-1).state;
  st = S.stackPop(st).at(-1).state;
  assert.deepEqual(st.items, [1, 2]);

  let q = S.initQueue([1, 2]);
  q = S.queueEnqueue(q, 3).at(-1).state;
  q = S.queueDequeue(q).at(-1).state;
  assert.deepEqual(q.items, [2, 3]);
}

// 5. Hash Table
{
  let ht = S.initHashTable(5, [
    ['a', 1],
    ['b', 2],
  ]);
  ht = S.hashInsertOrUpdate(ht, 'c', 3).at(-1).state;
  assert.equal(S.getHashTableMetrics(ht).itemCount, 3);
  ht = S.hashRehash(ht, 11).at(-1).state;
  assert.equal(ht.bucketCount, 11);
  assert.equal(S.getHashTableMetrics(ht).itemCount, 3);
}

// 6. Binary Tree & BST
{
  const bt = S.initBinaryTree([1, 2, 3, 4, 5]);
  const pre = S.btTraverse(bt, 'preorder').at(-1).state.traversalOrder;
  assert.deepEqual(pre, [1, 2, 4, 5, 3]);

  let bst = S.initBst([50, 30, 70, 20, 40, 60, 80]);
  assert.equal(S.isValidBst(bst.root), true);
  bst = S.bstDelete(bst, 50).at(-1).state;
  assert.equal(S.isValidBst(bst.root), true);
  assert.deepEqual(S.bstInorder(bst.root), [20, 30, 40, 60, 70, 80]);
}

// 7. Min & Max Heap
{
  let minH = S.initHeap([40, 10, 30, 5, 20], 'min');
  assert.equal(minH.items[0], 5);
  minH = S.heapPop(minH).at(-1).state;
  assert.equal(minH.items[0], 10);

  const maxH = S.initHeap([40, 10, 30, 5, 20], 'max');
  assert.equal(maxH.items[0], 40);
}

// 8. Graph
{
  let g = S.initGraph(false);
  g = S.graphAddNode(g, '6').at(-1).state;
  g = S.graphAddEdge(g, '5', '6', 9).at(-1).state;
  const adj = S.buildAdjacencyList(g);
  assert.ok(adj['5'].some((e) => e.to === '6' && e.weight === 9));
  const mat = S.buildAdjacencyMatrix(g);
  assert.equal(mat.labels.length, 7);
}

// 9. All 11 Algorithms
const unsorted = [29, 10, 14, 37, 13, 8, 22];
const expectedSorted = [8, 10, 13, 14, 22, 29, 37];

for (const sortId of [
  'bubble-sort',
  'selection-sort',
  'insertion-sort',
  'merge-sort',
  'quick-sort',
]) {
  const frames = A.generateAlgorithmSteps(sortId, {
    ...A.DEFAULT_ALGORITHM_INPUT,
    array: unsorted,
  });
  assert.deepEqual(frames.at(-1).state.items, expectedSorted, `${sortId} failed`);
}

{
  const lin = A.generateAlgorithmSteps('linear-search', {
    ...A.DEFAULT_ALGORITHM_INPUT,
    array: [5, 9, 14, 2],
    target: 14,
  });
  assert.match(lin.at(-1).resultSummary, /index 2/);

  const bin = A.generateAlgorithmSteps('binary-search', {
    ...A.DEFAULT_ALGORITHM_INPUT,
    array: [2, 5, 9, 14, 20],
    target: 14,
  });
  assert.match(bin.at(-1).resultSummary, /index 3/);

  const tp = A.generateAlgorithmSteps('two-pointers', {
    ...A.DEFAULT_ALGORITHM_INPUT,
    array: [2, 4, 7, 11, 15],
    target: 18,
  });
  assert.match(tp.at(-1).resultSummary, /7 \+ 11 = 18/);

  const swFixed = A.generateAlgorithmSteps('sliding-window', {
    ...A.DEFAULT_ALGORITHM_INPUT,
    array: [2, 1, 5, 1, 3, 2],
    windowSize: 3,
    slidingMode: 'fixed',
  });
  assert.match(swFixed.at(-1).resultSummary, /Max sum = 9/);

  const swVar = A.generateAlgorithmSteps('sliding-window', {
    ...A.DEFAULT_ALGORITHM_INPUT,
    array: [2, 3, 1, 2, 4, 3],
    target: 7,
    slidingMode: 'variable',
  });
  assert.match(swVar.at(-1).resultSummary, /Min length = 2/);

  const bfs = A.generateAlgorithmSteps('bfs', A.DEFAULT_ALGORITHM_INPUT);
  assert.deepEqual(bfs.at(-1).state.visitedIds, ['0', '1', '2', '3', '4', '5']);

  const dfs = A.generateAlgorithmSteps('dfs', A.DEFAULT_ALGORITHM_INPUT);
  assert.equal(dfs.at(-1).state.visitedIds.length, 6);
}

console.log('ALL PHASE 3 DSA CHECKS PASSED');
