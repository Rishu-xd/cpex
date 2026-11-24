import { parseEdgeListToGraph } from './structures';
import type {
  AlgorithmFrame,
  AlgorithmId,
  ArrayAlgoFrameState,
  GraphEdge,
  GraphState,
} from './types';

export interface AlgorithmInput {
  array: number[];
  target: number;
  windowSize: number;
  slidingMode: 'fixed' | 'variable';
  edgeText: string;
  startNode: string;
  directed: boolean;
}

export const DEFAULT_ALGORITHM_INPUT: AlgorithmInput = {
  array: [29, 10, 14, 37, 13, 8, 22],
  target: 14,
  windowSize: 3,
  slidingMode: 'fixed',
  edgeText: '0-1, 0-2, 1-3, 2-4, 3-5, 4-5',
  startNode: '0',
  directed: false,
};

function makeArrayFrame(
  step: number,
  title: string,
  detail: string,
  partial: Partial<ArrayAlgoFrameState> & { items: number[] },
  resultSummary?: string
): AlgorithmFrame {
  return {
    kind: 'array',
    step,
    title,
    detail,
    state: {
      items: partial.items.slice(),
      activeIndices: partial.activeIndices ?? [],
      comparingIndices: partial.comparingIndices ?? [],
      sortedIndices: partial.sortedIndices ?? [],
      discardedIndices: partial.discardedIndices ?? [],
      windowRange: partial.windowRange ?? null,
      bestRange: partial.bestRange ?? null,
      pointers: partial.pointers ?? [],
      metrics: partial.metrics ?? {},
    },
    resultSummary,
  };
}

function runLinearSearch(arr: number[], target: number): AlgorithmFrame[] {
  const frames: AlgorithmFrame[] = [
    makeArrayFrame(0, 'Start Linear Search', `Target = ${target}`, {
      items: arr,
      metrics: { comparisons: 0, target },
    }),
  ];
  let comparisons = 0;
  for (let i = 0; i < arr.length; i += 1) {
    comparisons += 1;
    const hit = arr[i] === target;
    frames.push(
      makeArrayFrame(
        frames.length,
        hit ? `Found ${target} at index ${i}` : `Compare [${i}] = ${arr[i]}`,
        hit ? `${arr[i]} == ${target}` : `${arr[i]} != ${target}, advance i.`,
        {
          items: arr,
          activeIndices: hit ? [i] : [],
          comparingIndices: hit ? [] : [i],
          discardedIndices: Array.from({ length: i }, (_, k) => k),
          pointers: [{ index: i, label: 'i', tone: hit ? 'emerald' : 'sky' }],
          metrics: { comparisons, target },
        },
        hit ? `Found at index ${i}` : undefined
      )
    );
    if (hit) return frames;
  }
  frames.push(
    makeArrayFrame(
      frames.length,
      `${target} not found`,
      `Scanned all ${arr.length} element(s).`,
      {
        items: arr,
        discardedIndices: arr.map((_, i) => i),
        metrics: { comparisons, target },
      },
      'Not found (-1)'
    )
  );
  return frames;
}

function runBinarySearch(rawArr: number[], target: number): AlgorithmFrame[] {
  const isSorted = rawArr.every((v, i) => i === 0 || rawArr[i - 1] <= v);
  const arr = isSorted ? rawArr.slice() : rawArr.slice().sort((a, b) => a - b);

  const frames: AlgorithmFrame[] = [
    makeArrayFrame(
      0,
      isSorted ? 'Initialize Binary Search' : 'Sorted array for Binary Search',
      isSorted
        ? `Search [${0}..${Math.max(0, arr.length - 1)}] for ${target}.`
        : `Input sorted ascending: [${arr.join(', ')}].`,
      {
        items: arr,
        pointers:
          arr.length > 0
            ? [
                { index: 0, label: 'lo', tone: 'sky' },
                { index: arr.length - 1, label: 'hi', tone: 'amber' },
              ]
            : [],
        metrics: { comparisons: 0, target },
      }
    ),
  ];

  let lo = 0;
  let hi = arr.length - 1;
  let comparisons = 0;
  const discarded = new Set<number>();

  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    comparisons += 1;
    const hit = arr[mid] === target;
    frames.push(
      makeArrayFrame(
        frames.length,
        hit
          ? `Found ${target} at index ${mid}`
          : `mid = ${mid} (val=${arr[mid]})`,
        hit
          ? `${arr[mid]} == ${target}`
          : arr[mid] < target
            ? `${arr[mid]} < ${target} -> discard [${lo}..${mid}], set lo=${mid + 1}`
            : `${arr[mid]} > ${target} -> discard [${mid}..${hi}], set hi=${mid - 1}`,
        {
          items: arr,
          activeIndices: hit ? [mid] : [],
          comparingIndices: hit ? [] : [mid],
          discardedIndices: Array.from(discarded),
          pointers: [
            { index: lo, label: 'lo', tone: 'sky' },
            { index: mid, label: 'mid', tone: hit ? 'emerald' : 'amber' },
            { index: hi, label: 'hi', tone: 'sky' },
          ],
          metrics: { lo, mid, hi, comparisons, target },
        },
        hit ? `Found at index ${mid}` : undefined
      )
    );
    if (hit) return frames;
    if (arr[mid] < target) {
      for (let k = lo; k <= mid; k += 1) discarded.add(k);
      lo = mid + 1;
    } else {
      for (let k = mid; k <= hi; k += 1) discarded.add(k);
      hi = mid - 1;
    }
  }

  frames.push(
    makeArrayFrame(
      frames.length,
      `${target} not found`,
      `Search range exhausted (lo=${lo} > hi=${hi}).`,
      {
        items: arr,
        discardedIndices: arr.map((_, i) => i),
        metrics: { comparisons, target },
      },
      'Not found (-1)'
    )
  );
  return frames;
}

function runBubbleSort(rawArr: number[]): AlgorithmFrame[] {
  const arr = rawArr.slice();
  const n = arr.length;
  const sorted = new Set<number>();
  let comparisons = 0;
  let swaps = 0;

  const frames: AlgorithmFrame[] = [
    makeArrayFrame(0, 'Start Bubble Sort', `n=${n}`, {
      items: arr,
      metrics: { comparisons, swaps },
    }),
  ];

  for (let i = 0; i < n - 1; i += 1) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j += 1) {
      comparisons += 1;
      const shouldSwap = arr[j] > arr[j + 1];
      frames.push(
        makeArrayFrame(
          frames.length,
          `Compare [${j}]=${arr[j]} and [${j + 1}]=${arr[j + 1]}`,
          shouldSwap ? 'Out of order -> swap.' : 'Already in order.',
          {
            items: arr,
            comparingIndices: [j, j + 1],
            sortedIndices: Array.from(sorted),
            pointers: [
              { index: j, label: 'j', tone: 'sky' },
              { index: j + 1, label: 'j+1', tone: 'amber' },
            ],
            metrics: { pass: i + 1, comparisons, swaps },
          }
        )
      );
      if (shouldSwap) {
        swapped = true;
        swaps += 1;
        const tmp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = tmp;
        frames.push(
          makeArrayFrame(
            frames.length,
            `Swapped [${j}] <-> [${j + 1}]`,
            `Array: [${arr.join(', ')}]`,
            {
              items: arr,
              activeIndices: [j, j + 1],
              sortedIndices: Array.from(sorted),
              metrics: { pass: i + 1, comparisons, swaps },
            }
          )
        );
      }
    }
    sorted.add(n - 1 - i);
    if (!swapped) {
      for (let k = 0; k < n; k += 1) sorted.add(k);
      break;
    }
  }
  if (n > 0) sorted.add(0);

  frames.push(
    makeArrayFrame(
      frames.length,
      'Bubble Sort Complete',
      `Sorted: [${arr.join(', ')}]`,
      {
        items: arr,
        sortedIndices: arr.map((_, i) => i),
        metrics: { comparisons, swaps },
      },
      `Sorted [${arr.join(', ')}]`
    )
  );
  return frames;
}

function runSelectionSort(rawArr: number[]): AlgorithmFrame[] {
  const arr = rawArr.slice();
  const n = arr.length;
  const sorted: number[] = [];
  let comparisons = 0;
  let swaps = 0;

  const frames: AlgorithmFrame[] = [
    makeArrayFrame(0, 'Start Selection Sort', `n=${n}`, {
      items: arr,
      metrics: { comparisons, swaps },
    }),
  ];

  for (let i = 0; i < n - 1; i += 1) {
    let minIdx = i;
    for (let j = i + 1; j < n; j += 1) {
      comparisons += 1;
      if (arr[j] < arr[minIdx]) minIdx = j;
      frames.push(
        makeArrayFrame(
          frames.length,
          `Scan j=${j} (minIdx=${minIdx})`,
          `Current min is ${arr[minIdx]} at [${minIdx}].`,
          {
            items: arr,
            comparingIndices: [j, minIdx],
            sortedIndices: sorted.slice(),
            pointers: [
              { index: i, label: 'i', tone: 'sky' },
              { index: minIdx, label: 'min', tone: 'emerald' },
              { index: j, label: 'j', tone: 'amber' },
            ],
            metrics: { comparisons, swaps },
          }
        )
      );
    }
    if (minIdx !== i) {
      swaps += 1;
      const tmp = arr[i];
      arr[i] = arr[minIdx];
      arr[minIdx] = tmp;
      frames.push(
        makeArrayFrame(
          frames.length,
          `Swap min [${minIdx}] into [${i}]`,
          `Placed ${arr[i]} at sorted position ${i}.`,
          {
            items: arr,
            activeIndices: [i, minIdx],
            sortedIndices: sorted.slice(),
            metrics: { comparisons, swaps },
          }
        )
      );
    }
    sorted.push(i);
  }
  if (n > 0) sorted.push(n - 1);

  frames.push(
    makeArrayFrame(
      frames.length,
      'Selection Sort Complete',
      `Sorted: [${arr.join(', ')}]`,
      {
        items: arr,
        sortedIndices: arr.map((_, i) => i),
        metrics: { comparisons, swaps },
      },
      `Sorted [${arr.join(', ')}]`
    )
  );
  return frames;
}

function runInsertionSort(rawArr: number[]): AlgorithmFrame[] {
  const arr = rawArr.slice();
  const n = arr.length;
  let comparisons = 0;
  let shifts = 0;

  const frames: AlgorithmFrame[] = [
    makeArrayFrame(0, 'Start Insertion Sort', `n=${n}`, {
      items: arr,
      sortedIndices: n > 0 ? [0] : [],
      metrics: { comparisons, shifts },
    }),
  ];

  for (let i = 1; i < n; i += 1) {
    const key = arr[i];
    let j = i - 1;
    frames.push(
      makeArrayFrame(
        frames.length,
        `Pick key = ${key} at [${i}]`,
        `Insert ${key} into sorted prefix [0..${i - 1}].`,
        {
          items: arr,
          activeIndices: [i],
          sortedIndices: Array.from({ length: i }, (_, k) => k),
          pointers: [{ index: i, label: 'key', tone: 'amber' }],
          metrics: { key, comparisons, shifts },
        }
      )
    );
    while (j >= 0) {
      comparisons += 1;
      if (arr[j] <= key) break;
      arr[j + 1] = arr[j];
      shifts += 1;
      frames.push(
        makeArrayFrame(
          frames.length,
          `Shift ${arr[j]} right to [${j + 1}]`,
          `${arr[j]} > ${key}, shifting right.`,
          {
            items: arr,
            comparingIndices: [j, j + 1],
            pointers: [{ index: j, label: 'j', tone: 'sky' }],
            metrics: { key, comparisons, shifts },
          }
        )
      );
      j -= 1;
    }
    arr[j + 1] = key;
    frames.push(
      makeArrayFrame(
        frames.length,
        `Place key=${key} at [${j + 1}]`,
        `Sorted prefix is now [0..${i}].`,
        {
          items: arr,
          activeIndices: [j + 1],
          sortedIndices: Array.from({ length: i + 1 }, (_, k) => k),
          metrics: { comparisons, shifts },
        }
      )
    );
  }

  frames.push(
    makeArrayFrame(
      frames.length,
      'Insertion Sort Complete',
      `Sorted: [${arr.join(', ')}]`,
      {
        items: arr,
        sortedIndices: arr.map((_, i) => i),
        metrics: { comparisons, shifts },
      },
      `Sorted [${arr.join(', ')}]`
    )
  );
  return frames;
}

function runMergeSort(rawArr: number[]): AlgorithmFrame[] {
  const arr = rawArr.slice();
  const n = arr.length;
  let comparisons = 0;
  let writes = 0;

  const frames: AlgorithmFrame[] = [
    makeArrayFrame(0, 'Start Merge Sort', `n=${n}`, {
      items: arr,
      metrics: { comparisons, writes },
    }),
  ];

  const sortRange = (l: number, r: number) => {
    if (l >= r) return;
    const mid = l + Math.floor((r - l) / 2);
    frames.push(
      makeArrayFrame(
        frames.length,
        `Divide [${l}..${r}] at mid=${mid}`,
        `Sort [${l}..${mid}] and [${mid + 1}..${r}].`,
        {
          items: arr,
          windowRange: [l, r],
          pointers: [{ index: mid, label: 'mid', tone: 'amber' }],
          metrics: { comparisons, writes },
        }
      )
    );
    sortRange(l, mid);
    sortRange(mid + 1, r);

    const left = arr.slice(l, mid + 1);
    const right = arr.slice(mid + 1, r + 1);
    let i = 0;
    let j = 0;
    let k = l;
    while (i < left.length && j < right.length) {
      comparisons += 1;
      if (left[i] <= right[j]) {
        arr[k] = left[i++];
      } else {
        arr[k] = right[j++];
      }
      writes += 1;
      frames.push(
        makeArrayFrame(
          frames.length,
          `Merge write arr[${k}] = ${arr[k]}`,
          `Merging [${l}..${mid}] and [${mid + 1}..${r}].`,
          {
            items: arr,
            activeIndices: [k],
            windowRange: [l, r],
            metrics: { comparisons, writes },
          }
        )
      );
      k += 1;
    }
    while (i < left.length) {
      arr[k] = left[i++];
      writes += 1;
      frames.push(
        makeArrayFrame(
          frames.length,
          `Copy remaining left arr[${k}] = ${arr[k]}`,
          `Finishing merge of [${l}..${r}].`,
          {
            items: arr,
            activeIndices: [k],
            windowRange: [l, r],
            metrics: { comparisons, writes },
          }
        )
      );
      k += 1;
    }
    while (j < right.length) {
      arr[k] = right[j++];
      writes += 1;
      frames.push(
        makeArrayFrame(
          frames.length,
          `Copy remaining right arr[${k}] = ${arr[k]}`,
          `Finishing merge of [${l}..${r}].`,
          {
            items: arr,
            activeIndices: [k],
            windowRange: [l, r],
            metrics: { comparisons, writes },
          }
        )
      );
      k += 1;
    }
  };

  if (n > 1) sortRange(0, n - 1);

  frames.push(
    makeArrayFrame(
      frames.length,
      'Merge Sort Complete',
      `Sorted: [${arr.join(', ')}]`,
      {
        items: arr,
        sortedIndices: arr.map((_, i) => i),
        metrics: { comparisons, writes },
      },
      `Sorted [${arr.join(', ')}]`
    )
  );
  return frames;
}

function runQuickSort(rawArr: number[]): AlgorithmFrame[] {
  const arr = rawArr.slice();
  const n = arr.length;
  const settled = new Set<number>();
  let comparisons = 0;
  let swaps = 0;

  const frames: AlgorithmFrame[] = [
    makeArrayFrame(0, 'Start Quick Sort (Lomuto)', `n=${n}`, {
      items: arr,
      metrics: { comparisons, swaps },
    }),
  ];

  const swap = (a: number, b: number) => {
    if (a === b) return;
    swaps += 1;
    const t = arr[a];
    arr[a] = arr[b];
    arr[b] = t;
  };

  const quick = (lo: number, hi: number) => {
    if (lo > hi) return;
    if (lo === hi) {
      settled.add(lo);
      return;
    }
    const pivot = arr[hi];
    let i = lo;
    frames.push(
      makeArrayFrame(
        frames.length,
        `Partition [${lo}..${hi}] pivot=${pivot}`,
        `Pivot chosen at index ${hi}.`,
        {
          items: arr,
          windowRange: [lo, hi],
          sortedIndices: Array.from(settled),
          pointers: [
            { index: i, label: 'i', tone: 'sky' },
            { index: hi, label: 'piv', tone: 'amber' },
          ],
          metrics: { pivot, comparisons, swaps },
        }
      )
    );

    for (let j = lo; j < hi; j += 1) {
      comparisons += 1;
      const take = arr[j] <= pivot;
      frames.push(
        makeArrayFrame(
          frames.length,
          `Check arr[${j}]=${arr[j]} <= ${pivot}`,
          take ? `Swap [${i}] and [${j}], advance i.` : 'Leave in right partition.',
          {
            items: arr,
            comparingIndices: [j, hi],
            windowRange: [lo, hi],
            sortedIndices: Array.from(settled),
            pointers: [
              { index: i, label: 'i', tone: 'sky' },
              { index: j, label: 'j', tone: 'emerald' },
              { index: hi, label: 'piv', tone: 'amber' },
            ],
            metrics: { pivot, comparisons, swaps },
          }
        )
      );
      if (take) {
        swap(i, j);
        i += 1;
      }
    }
    swap(i, hi);
    settled.add(i);
    frames.push(
      makeArrayFrame(
        frames.length,
        `Pivot ${pivot} settled at [${i}]`,
        `Left [${lo}..${i - 1}] <= ${pivot} < Right [${i + 1}..${hi}].`,
        {
          items: arr,
          activeIndices: [i],
          sortedIndices: Array.from(settled),
          metrics: { comparisons, swaps },
        }
      )
    );
    quick(lo, i - 1);
    quick(i + 1, hi);
  };

  if (n > 0) quick(0, n - 1);

  frames.push(
    makeArrayFrame(
      frames.length,
      'Quick Sort Complete',
      `Sorted: [${arr.join(', ')}]`,
      {
        items: arr,
        sortedIndices: arr.map((_, i) => i),
        metrics: { comparisons, swaps },
      },
      `Sorted [${arr.join(', ')}]`
    )
  );
  return frames;
}

function runTwoPointers(rawArr: number[], target: number): AlgorithmFrame[] {
  const isSorted = rawArr.every((v, i) => i === 0 || rawArr[i - 1] <= v);
  const arr = isSorted ? rawArr.slice() : rawArr.slice().sort((a, b) => a - b);

  const frames: AlgorithmFrame[] = [
    makeArrayFrame(
      0,
      isSorted ? 'Initialize Two Pointers' : 'Sorted input for Two Pointers',
      `Find pair summing to ${target}.`,
      {
        items: arr,
        pointers:
          arr.length >= 2
            ? [
                { index: 0, label: 'L', tone: 'sky' },
                { index: arr.length - 1, label: 'R', tone: 'amber' },
              ]
            : [],
        metrics: { target, steps: 0 },
      }
    ),
  ];

  let l = 0;
  let r = arr.length - 1;
  let steps = 0;
  while (l < r) {
    steps += 1;
    const sum = arr[l] + arr[r];
    const hit = sum === target;
    frames.push(
      makeArrayFrame(
        frames.length,
        hit
          ? `Pair found: ${arr[l]} + ${arr[r]} = ${target}`
          : `${arr[l]} + ${arr[r]} = ${sum}`,
        hit
          ? `Indices (${l}, ${r}) sum to ${target}.`
          : sum < target
            ? `${sum} < ${target} -> increment L`
            : `${sum} > ${target} -> decrement R`,
        {
          items: arr,
          activeIndices: hit ? [l, r] : [],
          comparingIndices: hit ? [] : [l, r],
          pointers: [
            { index: l, label: 'L', tone: hit ? 'emerald' : 'sky' },
            { index: r, label: 'R', tone: hit ? 'emerald' : 'amber' },
          ],
          metrics: { L: l, R: r, sum, target, steps },
        },
        hit ? `Pair (${l}, ${r}) -> ${arr[l]} + ${arr[r]} = ${target}` : undefined
      )
    );
    if (hit) return frames;
    if (sum < target) l += 1;
    else r -= 1;
  }

  frames.push(
    makeArrayFrame(
      frames.length,
      `No pair sums to ${target}`,
      'Pointers met without a match.',
      {
        items: arr,
        discardedIndices: arr.map((_, i) => i),
        metrics: { target, steps },
      },
      'No matching pair'
    )
  );
  return frames;
}

function runSlidingWindow(
  rawArr: number[],
  windowSize: number,
  target: number,
  mode: 'fixed' | 'variable'
): AlgorithmFrame[] {
  const arr = rawArr.slice();
  if (arr.length === 0) {
    return [makeArrayFrame(0, 'Empty array', 'Provide at least 1 value.', { items: [] }, 'Empty')];
  }

  if (mode === 'fixed') {
    const k = Math.max(1, Math.min(windowSize, arr.length));
    let sum = 0;
    for (let i = 0; i < k; i += 1) sum += arr[i];
    let bestSum = sum;
    let bestRange: [number, number] = [0, k - 1];

    const frames: AlgorithmFrame[] = [
      makeArrayFrame(0, `Initial window [0..${k - 1}] (k=${k})`, `Window sum = ${sum}.`, {
        items: arr,
        windowRange: [0, k - 1],
        bestRange,
        pointers: [
          { index: 0, label: 'L', tone: 'sky' },
          { index: k - 1, label: 'R', tone: 'amber' },
        ],
        metrics: { k, windowSum: sum, bestSum },
      }),
    ];

    for (let r = k; r < arr.length; r += 1) {
      const l = r - k + 1;
      sum = sum + arr[r] - arr[l - 1];
      if (sum > bestSum) {
        bestSum = sum;
        bestRange = [l, r];
      }
      frames.push(
        makeArrayFrame(
          frames.length,
          `Slide to [${l}..${r}] -> sum=${sum}`,
          `Added arr[${r}]=${arr[r]}, removed arr[${l - 1}]=${arr[l - 1]}. Best=${bestSum}.`,
          {
            items: arr,
            windowRange: [l, r],
            bestRange,
            pointers: [
              { index: l, label: 'L', tone: 'sky' },
              { index: r, label: 'R', tone: 'amber' },
            ],
            metrics: { k, windowSum: sum, bestSum },
          }
        )
      );
    }

    frames.push(
      makeArrayFrame(
        frames.length,
        `Max sum of size ${k} is ${bestSum}`,
        `Best window: [${bestRange[0]}..${bestRange[1]}].`,
        {
          items: arr,
          windowRange: bestRange,
          bestRange,
          metrics: { k, bestSum },
        },
        `Max sum = ${bestSum} at [${bestRange[0]}..${bestRange[1]}]`
      )
    );
    return frames;
  }

  // Variable-size: shortest subarray with sum >= target
  const frames: AlgorithmFrame[] = [
    makeArrayFrame(0, `Variable Window (sum >= ${target})`, 'Expand R, shrink L while valid.', {
      items: arr,
      metrics: { target, windowSum: 0, bestLen: '∞' },
    }),
  ];
  let l = 0;
  let sum = 0;
  let bestLen = Infinity;
  let bestRange: [number, number] | null = null;

  for (let r = 0; r < arr.length; r += 1) {
    sum += arr[r];
    frames.push(
      makeArrayFrame(
        frames.length,
        `Expand R=${r} (${arr[r]}), sum=${sum}`,
        `Window [${l}..${r}].`,
        {
          items: arr,
          windowRange: [l, r],
          bestRange,
          pointers: [
            { index: l, label: 'L', tone: 'sky' },
            { index: r, label: 'R', tone: 'amber' },
          ],
          metrics: {
            target,
            windowSum: sum,
            bestLen: bestLen === Infinity ? '∞' : bestLen,
          },
        }
      )
    );
    while (sum >= target && l <= r) {
      const len = r - l + 1;
      if (len < bestLen) {
        bestLen = len;
        bestRange = [l, r];
      }
      frames.push(
        makeArrayFrame(
          frames.length,
          `Valid [${l}..${r}] len=${len} (sum=${sum} >= ${target})`,
          `Shrink L from ${l} -> ${l + 1}.`,
          {
            items: arr,
            windowRange: [l, r],
            bestRange,
            pointers: [
              { index: l, label: 'L', tone: 'emerald' },
              { index: r, label: 'R', tone: 'amber' },
            ],
            metrics: { target, windowSum: sum, bestLen },
          }
        )
      );
      sum -= arr[l];
      l += 1;
    }
  }

  frames.push(
    makeArrayFrame(
      frames.length,
      bestRange ? `Shortest length = ${bestLen}` : `No subarray sums to >= ${target}`,
      bestRange
        ? `Best window [${bestRange[0]}..${bestRange[1]}].`
        : 'Scanned full array.',
      {
        items: arr,
        windowRange: bestRange,
        bestRange,
        metrics: {
          target,
          bestLen: bestLen === Infinity ? 'None' : bestLen,
        },
      },
      bestRange
        ? `Min length = ${bestLen} at [${bestRange[0]}..${bestRange[1]}]`
        : 'No valid subarray'
    )
  );
  return frames;
}

function buildGraphNeighbors(
  graph: GraphState
): Map<string, Array<{ to: string; edge: GraphEdge }>> {
  const map = new Map<string, Array<{ to: string; edge: GraphEdge }>>();
  for (const n of graph.nodes) map.set(n.id, []);
  for (const e of graph.edges) {
    map.get(e.from)?.push({ to: e.to, edge: e });
    if (!graph.directed && e.from !== e.to) {
      map.get(e.to)?.push({ to: e.from, edge: e });
    }
  }
  return map;
}

function runBfs(
  edgeText: string,
  startNode: string,
  directed: boolean
): AlgorithmFrame[] {
  const graph = parseEdgeListToGraph(edgeText, directed);
  const start = graph.nodes.some((n) => n.id === startNode)
    ? startNode
    : (graph.nodes[0]?.id ?? '');
  if (!start) {
    return [
      {
        kind: 'graph',
        step: 0,
        title: 'Graph empty',
        detail: 'Provide edges like 0-1, 1-2.',
        state: {
          nodes: [],
          edges: [],
          directed,
          currentNodeId: null,
          visitedIds: [],
          frontierIds: [],
          activeEdgeId: null,
          distances: {},
          metrics: {},
        },
        resultSummary: 'Empty graph',
      },
    ];
  }

  const adj = buildGraphNeighbors(graph);
  const queue: string[] = [start];
  const visitedSet = new Set<string>([start]);
  const visitedOrder: string[] = [];
  const distances: Record<string, number> = { [start]: 0 };

  const frames: AlgorithmFrame[] = [
    {
      kind: 'graph',
      step: 0,
      title: `Initialize BFS from ${start}`,
      detail: `Enqueue ${start} with dist=0.`,
      state: {
        nodes: graph.nodes,
        edges: graph.edges,
        directed,
        currentNodeId: null,
        visitedIds: [],
        frontierIds: queue.slice(),
        activeEdgeId: null,
        distances: { ...distances },
        metrics: { start, visited: 0 },
      },
    },
  ];

  while (queue.length > 0) {
    const u = queue.shift()!;
    visitedOrder.push(u);
    frames.push({
      kind: 'graph',
      step: frames.length,
      title: `Pop & visit ${u} (dist=${distances[u]})`,
      detail: `Explore neighbors of ${u}.`,
      state: {
        nodes: graph.nodes,
        edges: graph.edges,
        directed,
        currentNodeId: u,
        visitedIds: visitedOrder.slice(),
        frontierIds: queue.slice(),
        activeEdgeId: null,
        distances: { ...distances },
        metrics: { current: u, visited: visitedOrder.length },
      },
    });

    for (const { to, edge } of adj.get(u) ?? []) {
      if (!visitedSet.has(to)) {
        visitedSet.add(to);
        distances[to] = distances[u] + 1;
        queue.push(to);
        frames.push({
          kind: 'graph',
          step: frames.length,
          title: `Discover ${to} via ${u} -> ${to}`,
          detail: `dist[${to}] = ${distances[to]}, enqueued.`,
          state: {
            nodes: graph.nodes,
            edges: graph.edges,
            directed,
            currentNodeId: u,
            visitedIds: visitedOrder.slice(),
            frontierIds: queue.slice(),
            activeEdgeId: edge.id,
            distances: { ...distances },
            metrics: { current: u, discovered: to, visited: visitedOrder.length },
          },
        });
      }
    }
  }

  frames.push({
    kind: 'graph',
    step: frames.length,
    title: 'BFS Complete',
    detail: `Order: [${visitedOrder.join(' -> ')}]`,
    state: {
      nodes: graph.nodes,
      edges: graph.edges,
      directed,
      currentNodeId: null,
      visitedIds: visitedOrder.slice(),
      frontierIds: [],
      activeEdgeId: null,
      distances: { ...distances },
      metrics: { visited: visitedOrder.length },
    },
    resultSummary: `BFS order: ${visitedOrder.join(' -> ')}`,
  });

  return frames;
}

function runDfs(
  edgeText: string,
  startNode: string,
  directed: boolean
): AlgorithmFrame[] {
  const graph = parseEdgeListToGraph(edgeText, directed);
  const start = graph.nodes.some((n) => n.id === startNode)
    ? startNode
    : (graph.nodes[0]?.id ?? '');
  if (!start) {
    return [
      {
        kind: 'graph',
        step: 0,
        title: 'Graph empty',
        detail: 'Provide edges like 0-1, 1-2.',
        state: {
          nodes: [],
          edges: [],
          directed,
          currentNodeId: null,
          visitedIds: [],
          frontierIds: [],
          activeEdgeId: null,
          distances: {},
          metrics: {},
        },
        resultSummary: 'Empty graph',
      },
    ];
  }

  const adj = buildGraphNeighbors(graph);
  const stack: Array<{ id: string; viaEdgeId: string | null }> = [
    { id: start, viaEdgeId: null },
  ];
  const visitedSet = new Set<string>();
  const visitedOrder: string[] = [];

  const frames: AlgorithmFrame[] = [
    {
      kind: 'graph',
      step: 0,
      title: `Initialize DFS from ${start}`,
      detail: `Push ${start} onto stack.`,
      state: {
        nodes: graph.nodes,
        edges: graph.edges,
        directed,
        currentNodeId: null,
        visitedIds: [],
        frontierIds: [start],
        activeEdgeId: null,
        distances: {},
        metrics: { start, visited: 0 },
      },
    },
  ];

  while (stack.length > 0) {
    const item = stack.pop()!;
    if (visitedSet.has(item.id)) continue;
    visitedSet.add(item.id);
    visitedOrder.push(item.id);

    const neighbors = (adj.get(item.id) ?? []).slice().reverse();
    for (const n of neighbors) {
      if (!visitedSet.has(n.to)) {
        stack.push({ id: n.to, viaEdgeId: n.edge.id });
      }
    }

    frames.push({
      kind: 'graph',
      step: frames.length,
      title: `Visit ${item.id}`,
      detail: `Visited: [${visitedOrder.join(' -> ')}]`,
      state: {
        nodes: graph.nodes,
        edges: graph.edges,
        directed,
        currentNodeId: item.id,
        visitedIds: visitedOrder.slice(),
        frontierIds: stack.map((s) => s.id),
        activeEdgeId: item.viaEdgeId,
        distances: {},
        metrics: { current: item.id, visited: visitedOrder.length },
      },
    });
  }

  frames.push({
    kind: 'graph',
    step: frames.length,
    title: 'DFS Complete',
    detail: `Order: [${visitedOrder.join(' -> ')}]`,
    state: {
      nodes: graph.nodes,
      edges: graph.edges,
      directed,
      currentNodeId: null,
      visitedIds: visitedOrder.slice(),
      frontierIds: [],
      activeEdgeId: null,
      distances: {},
      metrics: { visited: visitedOrder.length },
    },
    resultSummary: `DFS order: ${visitedOrder.join(' -> ')}`,
  });

  return frames;
}

export function generateAlgorithmSteps(
  id: AlgorithmId,
  input: AlgorithmInput
): AlgorithmFrame[] {
  switch (id) {
    case 'linear-search':
      return runLinearSearch(input.array, input.target);
    case 'binary-search':
      return runBinarySearch(input.array, input.target);
    case 'bubble-sort':
      return runBubbleSort(input.array);
    case 'selection-sort':
      return runSelectionSort(input.array);
    case 'insertion-sort':
      return runInsertionSort(input.array);
    case 'merge-sort':
      return runMergeSort(input.array);
    case 'quick-sort':
      return runQuickSort(input.array);
    case 'two-pointers':
      return runTwoPointers(input.array, input.target);
    case 'sliding-window':
      return runSlidingWindow(
        input.array,
        input.windowSize,
        input.target,
        input.slidingMode
      );
    case 'bfs':
      return runBfs(input.edgeText, input.startNode, input.directed);
    case 'dfs':
      return runDfs(input.edgeText, input.startNode, input.directed);
  }
}
