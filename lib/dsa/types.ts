export type DataStructureId =
  | 'array'
  | 'string'
  | 'linked-list'
  | 'stack'
  | 'queue'
  | 'hash-table'
  | 'binary-tree'
  | 'bst'
  | 'heap'
  | 'graph';

export type AlgorithmId =
  | 'linear-search'
  | 'binary-search'
  | 'bubble-sort'
  | 'selection-sort'
  | 'insertion-sort'
  | 'merge-sort'
  | 'quick-sort'
  | 'two-pointers'
  | 'sliding-window'
  | 'bfs'
  | 'dfs';

export interface DataStructureCatalogItem {
  id: DataStructureId;
  name: string;
  shortName: string;
  description: string;
}

export interface AlgorithmCatalogItem {
  id: AlgorithmId;
  name: string;
  category: 'Searching' | 'Sorting' | 'Techniques' | 'Graph';
  description: string;
}

export const DATA_STRUCTURES_CATALOG: DataStructureCatalogItem[] = [
  {
    id: 'array',
    name: 'Arrays & Vectors',
    shortName: 'Vector',
    description: 'Contiguous indexed storage with std::vector capacity doubling.',
  },
  {
    id: 'string',
    name: 'Strings',
    shortName: 'String',
    description: 'Character buffer editing, reversal, and substring pattern matching.',
  },
  {
    id: 'linked-list',
    name: 'Linked Lists',
    shortName: 'List',
    description: 'Singly and doubly linked nodes with pointer traversal.',
  },
  {
    id: 'stack',
    name: 'Stacks',
    shortName: 'Stack',
    description: 'LIFO container supporting push, pop, peek, and search.',
  },
  {
    id: 'queue',
    name: 'Queues',
    shortName: 'Queue',
    description: 'FIFO container supporting enqueue, dequeue, peek, and search.',
  },
  {
    id: 'hash-table',
    name: 'Hash Tables',
    shortName: 'HashMap',
    description: 'Bucketed separate-chaining table with load factor and rehashing.',
  },
  {
    id: 'binary-tree',
    name: 'Binary Trees',
    shortName: 'BinTree',
    description: 'Level-order binary tree with inorder, preorder, postorder, and BFS.',
  },
  {
    id: 'bst',
    name: 'Binary Search Trees',
    shortName: 'BST',
    description: 'Ordered binary tree with insert, search, min/max, and delete.',
  },
  {
    id: 'heap',
    name: 'Heaps',
    shortName: 'Heap',
    description: 'Min/Max binary heap with synchronized tree and array views.',
  },
  {
    id: 'graph',
    name: 'Graphs',
    shortName: 'Graph',
    description: 'Directed/undirected weighted graph with adjacency list & matrix.',
  },
];

export const ALGORITHMS_CATALOG: AlgorithmCatalogItem[] = [
  {
    id: 'linear-search',
    name: 'Linear Search',
    category: 'Searching',
    description: 'Sequential scan comparing each element against target.',
  },
  {
    id: 'binary-search',
    name: 'Binary Search',
    category: 'Searching',
    description: 'Divide-and-conquer search on sorted arrays tracking lo, mid, hi.',
  },
  {
    id: 'bubble-sort',
    name: 'Bubble Sort',
    category: 'Sorting',
    description: 'Adjacent compare-and-swap passes bubbling maxima to the end.',
  },
  {
    id: 'selection-sort',
    name: 'Selection Sort',
    category: 'Sorting',
    description: 'Selects minimum from unsorted suffix and swaps into prefix.',
  },
  {
    id: 'insertion-sort',
    name: 'Insertion Sort',
    category: 'Sorting',
    description: 'Shifts sorted prefix elements right to insert each key.',
  },
  {
    id: 'merge-sort',
    name: 'Merge Sort',
    category: 'Sorting',
    description: 'Recursive divide-and-merge sorting with O(n log n) time.',
  },
  {
    id: 'quick-sort',
    name: 'Quick Sort',
    category: 'Sorting',
    description: 'Lomuto partition sorting around pivot element.',
  },
  {
    id: 'two-pointers',
    name: 'Two Pointers',
    category: 'Techniques',
    description: 'Converging left/right pointers on sorted array for pair sum.',
  },
  {
    id: 'sliding-window',
    name: 'Sliding Window',
    category: 'Techniques',
    description: 'Fixed-size max sum or variable-size min subarray >= target.',
  },
  {
    id: 'bfs',
    name: 'Breadth-First Search',
    category: 'Graph',
    description: 'Level-by-level queue traversal computing shortest hop distances.',
  },
  {
    id: 'dfs',
    name: 'Depth-First Search',
    category: 'Graph',
    description: 'Stack-driven depth exploration recording discovery order.',
  },
];

export interface PlaybackFrame<T> {
  step: number;
  title: string;
  detail: string;
  state: T;
  highlightedIds?: string[];
  highlightedIndices?: number[];
  secondaryIndices?: number[];
  foundIndex?: number | null;
  resultSummary?: string;
}

export interface ArrayState {
  items: number[];
  capacity: number;
}

export interface StringState {
  chars: string[];
  pattern?: string;
}

export interface LinkedListNode {
  id: string;
  value: number;
}

export interface LinkedListState {
  nodes: LinkedListNode[];
  doubly: boolean;
  nextSeq: number;
}

export interface StackState {
  items: number[];
}

export interface QueueState {
  items: number[];
}

export interface HashEntry {
  key: string;
  value: number;
}

export interface HashTableState {
  bucketCount: number;
  buckets: HashEntry[][];
}

export interface BinaryTreeNode {
  id: string;
  value: number;
  left: BinaryTreeNode | null;
  right: BinaryTreeNode | null;
}

export interface BinaryTreeState {
  root: BinaryTreeNode | null;
  nextSeq: number;
  traversalOrder?: number[];
}

export interface TreePositionedNode {
  id: string;
  value: number;
  x: number;
  y: number;
  depth: number;
}

export interface TreePositionedEdge {
  fromId: string;
  toId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface TreeLayout {
  nodes: TreePositionedNode[];
  edges: TreePositionedEdge[];
  width: number;
  height: number;
}

export interface HeapState {
  items: number[];
  kind: 'min' | 'max';
}

export interface GraphNode {
  id: string;
  label: string;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  weight: number;
}

export interface GraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  directed: boolean;
  nextSeq: number;
}

export interface GraphPositionedNode extends GraphNode {
  x: number;
  y: number;
}

export interface ArrayAlgoFrameState {
  items: number[];
  activeIndices: number[];
  comparingIndices: number[];
  sortedIndices: number[];
  discardedIndices: number[];
  windowRange: [number, number] | null;
  bestRange: [number, number] | null;
  pointers: Array<{ index: number; label: string; tone: 'sky' | 'amber' | 'emerald' }>;
  metrics: Record<string, string | number>;
}

export interface GraphAlgoFrameState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  directed: boolean;
  currentNodeId: string | null;
  visitedIds: string[];
  frontierIds: string[];
  activeEdgeId: string | null;
  distances: Record<string, number>;
  metrics: Record<string, string | number>;
}

export type AlgorithmFrame =
  | {
      kind: 'array';
      step: number;
      title: string;
      detail: string;
      state: ArrayAlgoFrameState;
      resultSummary?: string;
    }
  | {
      kind: 'graph';
      step: number;
      title: string;
      detail: string;
      state: GraphAlgoFrameState;
      resultSummary?: string;
    };
