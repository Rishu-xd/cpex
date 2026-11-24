import type {
  ArrayState,
  BinaryTreeNode,
  BinaryTreeState,
  GraphEdge,
  GraphNode,
  GraphPositionedNode,
  GraphState,
  HashEntry,
  HashTableState,
  HeapState,
  LinkedListNode,
  LinkedListState,
  PlaybackFrame,
  QueueState,
  StackState,
  StringState,
  TreeLayout,
  TreePositionedEdge,
  TreePositionedNode,
} from './types';

function nextPowerOfTwo(n: number): number {
  let cap = 1;
  while (cap < n) cap *= 2;
  return cap;
}

// ---------------------------------------------------------------------------
// 1. Arrays & Vectors
// ---------------------------------------------------------------------------
export function initArray(values: number[] = [10, 24, 7, 19, 35]): ArrayState {
  const items = values.slice();
  return { items, capacity: nextPowerOfTwo(Math.max(4, items.length)) };
}

export function arrayPushBack(
  state: ArrayState,
  value: number
): PlaybackFrame<ArrayState>[] {
  const frames: PlaybackFrame<ArrayState>[] = [];
  const items = state.items.slice();
  let capacity = state.capacity;

  frames.push({
    step: 0,
    title: 'Check vector capacity',
    detail: `size=${items.length}, capacity=${capacity}`,
    state: { items: items.slice(), capacity },
    highlightedIndices: items.length > 0 ? [items.length - 1] : [],
  });

  if (items.length >= capacity) {
    capacity *= 2;
    frames.push({
      step: frames.length,
      title: 'Reallocate buffer (2x)',
      detail: `Capacity doubled to ${capacity} and existing elements copied.`,
      state: { items: items.slice(), capacity },
    });
  }

  items.push(value);
  frames.push({
    step: frames.length,
    title: `push_back(${value})`,
    detail: `Appended ${value} at index ${items.length - 1}.`,
    state: { items, capacity },
    highlightedIndices: [items.length - 1],
    resultSummary: `size=${items.length}, capacity=${capacity}`,
  });

  return frames;
}

export function arrayInsertAt(
  state: ArrayState,
  index: number,
  value: number
): PlaybackFrame<ArrayState>[] {
  const items = state.items.slice();
  const clamped = Math.max(0, Math.min(index, items.length));
  let capacity = state.capacity;
  const frames: PlaybackFrame<ArrayState>[] = [
    {
      step: 0,
      title: `Prepare insert(${clamped}, ${value})`,
      detail: `Need to shift ${items.length - clamped} element(s) right.`,
      state: { items: items.slice(), capacity },
      highlightedIndices: clamped < items.length ? [clamped] : [],
    },
  ];

  if (items.length >= capacity) {
    capacity *= 2;
    frames.push({
      step: frames.length,
      title: 'Reallocate buffer (2x)',
      detail: `Capacity increased to ${capacity}.`,
      state: { items: items.slice(), capacity },
    });
  }

  items.splice(clamped, 0, value);
  frames.push({
    step: frames.length,
    title: `Inserted ${value} at [${clamped}]`,
    detail: `Elements [${clamped + 1}..${items.length - 1}] shifted right.`,
    state: { items, capacity },
    highlightedIndices: [clamped],
    resultSummary: `Inserted ${value} at index ${clamped}`,
  });
  return frames;
}

export function arrayUpdateAt(
  state: ArrayState,
  index: number,
  value: number
): PlaybackFrame<ArrayState>[] {
  if (index < 0 || index >= state.items.length) {
    return [
      {
        step: 0,
        title: 'Index out of range',
        detail: `Valid indices are 0..${Math.max(0, state.items.length - 1)}.`,
        state,
      },
    ];
  }
  const prev = state.items[index];
  const next = state.items.slice();
  next[index] = value;
  return [
    {
      step: 0,
      title: `Read index [${index}]`,
      detail: `Current value at [${index}] is ${prev}.`,
      state,
      highlightedIndices: [index],
    },
    {
      step: 1,
      title: `Update [${index}] = ${value}`,
      detail: `Replaced ${prev} with ${value} in O(1).`,
      state: { items: next, capacity: state.capacity },
      highlightedIndices: [index],
      resultSummary: `a[${index}] = ${value}`,
    },
  ];
}

export function arrayDeleteAt(
  state: ArrayState,
  index: number
): PlaybackFrame<ArrayState>[] {
  if (index < 0 || index >= state.items.length) {
    return [
      {
        step: 0,
        title: 'Index out of range',
        detail: `Cannot erase at index ${index}.`,
        state,
      },
    ];
  }
  const removed = state.items[index];
  const next = state.items.slice();
  next.splice(index, 1);
  return [
    {
      step: 0,
      title: `Select index [${index}] (${removed})`,
      detail: `Erasing index ${index} requires shifting ${state.items.length - 1 - index} element(s) left.`,
      state,
      highlightedIndices: [index],
    },
    {
      step: 1,
      title: `Erased ${removed}`,
      detail: `Vector now has size ${next.length} (capacity=${state.capacity}).`,
      state: { items: next, capacity: state.capacity },
      highlightedIndices: index < next.length ? [index] : [],
      resultSummary: `Removed ${removed}`,
    },
  ];
}

export function arrayPopBack(state: ArrayState): PlaybackFrame<ArrayState>[] {
  if (state.items.length === 0) {
    return [
      {
        step: 0,
        title: 'Vector empty',
        detail: 'Cannot pop_back on an empty vector.',
        state,
      },
    ];
  }
  const removed = state.items[state.items.length - 1];
  const next = state.items.slice(0, -1);
  return [
    {
      step: 0,
      title: `Target back element (${removed})`,
      detail: `Index ${state.items.length - 1} will be popped in O(1).`,
      state,
      highlightedIndices: [state.items.length - 1],
    },
    {
      step: 1,
      title: `pop_back() -> ${removed}`,
      detail: `size=${next.length}, capacity=${state.capacity}.`,
      state: { items: next, capacity: state.capacity },
      resultSummary: `Popped ${removed}`,
    },
  ];
}

export function arraySearch(
  state: ArrayState,
  target: number
): PlaybackFrame<ArrayState>[] {
  const frames: PlaybackFrame<ArrayState>[] = [];
  for (let i = 0; i < state.items.length; i += 1) {
    const match = state.items[i] === target;
    frames.push({
      step: frames.length,
      title: match ? `Found ${target} at [${i}]` : `Check [${i}] = ${state.items[i]}`,
      detail: match
        ? `Match at index ${i}.`
        : `${state.items[i]} != ${target}, advance.`,
      state,
      highlightedIndices: [i],
      secondaryIndices: Array.from({ length: i }, (_, k) => k),
      foundIndex: match ? i : null,
      resultSummary: match ? `Found at index ${i}` : undefined,
    });
    if (match) return frames;
  }
  frames.push({
    step: frames.length,
    title: `${target} not found`,
    detail: `Scanned all ${state.items.length} elements.`,
    state,
    secondaryIndices: state.items.map((_, i) => i),
    foundIndex: null,
    resultSummary: 'Not found',
  });
  return frames;
}

// ---------------------------------------------------------------------------
// 2. Strings
// ---------------------------------------------------------------------------
export function initString(text = 'ALGORITHMS'): StringState {
  return { chars: Array.from(text) };
}

export function stringInsertAt(
  state: StringState,
  index: number,
  fragment: string
): PlaybackFrame<StringState>[] {
  const clamped = Math.max(0, Math.min(index, state.chars.length));
  const inserted = Array.from(fragment);
  const next = state.chars.slice();
  next.splice(clamped, 0, ...inserted);
  return [
    {
      step: 0,
      title: `Locate insert offset [${clamped}]`,
      detail: `Inserting "${fragment}" (${inserted.length} chars).`,
      state,
      highlightedIndices: clamped < state.chars.length ? [clamped] : [],
    },
    {
      step: 1,
      title: `Inserted "${fragment}"`,
      detail: `Result: "${next.join('')}" (length ${next.length}).`,
      state: { chars: next },
      highlightedIndices: inserted.map((_, i) => clamped + i),
      resultSummary: `Length ${next.length}`,
    },
  ];
}

export function stringDeleteRange(
  state: StringState,
  index: number,
  count = 1
): PlaybackFrame<StringState>[] {
  if (index < 0 || index >= state.chars.length || count <= 0) {
    return [
      {
        step: 0,
        title: 'Invalid erase range',
        detail: `Index ${index} out of bounds for length ${state.chars.length}.`,
        state,
      },
    ];
  }
  const actualCount = Math.min(count, state.chars.length - index);
  const removed = state.chars.slice(index, index + actualCount).join('');
  const next = state.chars.slice();
  next.splice(index, actualCount);
  return [
    {
      step: 0,
      title: `Mark range [${index}..${index + actualCount - 1}]`,
      detail: `Removing "${removed}".`,
      state,
      highlightedIndices: Array.from({ length: actualCount }, (_, i) => index + i),
    },
    {
      step: 1,
      title: `Erased "${removed}"`,
      detail: `Result: "${next.join('')}" (length ${next.length}).`,
      state: { chars: next },
      resultSummary: `Removed "${removed}"`,
    },
  ];
}

export function stringUpdateChar(
  state: StringState,
  index: number,
  ch: string
): PlaybackFrame<StringState>[] {
  if (index < 0 || index >= state.chars.length || ch.length === 0) {
    return [
      {
        step: 0,
        title: 'Invalid update',
        detail: `Ensure 0 <= index < ${state.chars.length} and char is non-empty.`,
        state,
      },
    ];
  }
  const nextChar = Array.from(ch)[0];
  const prev = state.chars[index];
  const next = state.chars.slice();
  next[index] = nextChar;
  return [
    {
      step: 0,
      title: `s[${index}] '${prev}' -> '${nextChar}'`,
      detail: `Updated character at index ${index}.`,
      state: { chars: next },
      highlightedIndices: [index],
      resultSummary: `"${next.join('')}"`,
    },
  ];
}

export function stringReverse(state: StringState): PlaybackFrame<StringState>[] {
  const arr = state.chars.slice();
  const frames: PlaybackFrame<StringState>[] = [
    {
      step: 0,
      title: 'Initialize two pointers',
      detail: `l=0, r=${Math.max(0, arr.length - 1)}`,
      state: { chars: arr.slice() },
      highlightedIndices: arr.length > 1 ? [0, arr.length - 1] : [],
    },
  ];
  let l = 0;
  let r = arr.length - 1;
  while (l < r) {
    const tmp = arr[l];
    arr[l] = arr[r];
    arr[r] = tmp;
    frames.push({
      step: frames.length,
      title: `Swap [${l}] and [${r}]`,
      detail: `'${arr[r]}' <-> '${arr[l]}'`,
      state: { chars: arr.slice() },
      highlightedIndices: [l, r],
    });
    l += 1;
    r -= 1;
  }
  frames.push({
    step: frames.length,
    title: 'String reversed',
    detail: `"${arr.join('')}"`,
    state: { chars: arr },
    resultSummary: `"${arr.join('')}"`,
  });
  return frames;
}

export function stringSearchSubstring(
  state: StringState,
  pattern: string
): PlaybackFrame<StringState>[] {
  const p = Array.from(pattern);
  if (p.length === 0 || p.length > state.chars.length) {
    return [
      {
        step: 0,
        title: 'Pattern cannot match',
        detail:
          p.length === 0
            ? 'Pattern is empty.'
            : `Pattern length (${p.length}) > string length (${state.chars.length}).`,
        state: { chars: state.chars, pattern },
        resultSummary: 'Not found',
      },
    ];
  }

  const frames: PlaybackFrame<StringState>[] = [];
  for (let start = 0; start <= state.chars.length - p.length; start += 1) {
    const windowIndices = p.map((_, k) => start + k);
    let matched = true;
    for (let k = 0; k < p.length; k += 1) {
      if (state.chars[start + k] !== p[k]) {
        matched = false;
        break;
      }
    }
    frames.push({
      step: frames.length,
      title: matched
        ? `Match "${pattern}" at index ${start}`
        : `Check offset ${start}: "${state.chars.slice(start, start + p.length).join('')}"`,
      detail: matched
        ? `Substring found at [${start}..${start + p.length - 1}].`
        : `Mismatch against "${pattern}".`,
      state: { chars: state.chars, pattern },
      highlightedIndices: windowIndices,
      foundIndex: matched ? start : null,
      resultSummary: matched ? `Found at index ${start}` : undefined,
    });
    if (matched) return frames;
  }

  frames.push({
    step: frames.length,
    title: `"${pattern}" not found`,
    detail: 'Checked all valid offsets.',
    state: { chars: state.chars, pattern },
    foundIndex: null,
    resultSummary: 'Not found',
  });
  return frames;
}

// ---------------------------------------------------------------------------
// 3. Linked Lists
// ---------------------------------------------------------------------------
export function initLinkedList(
  values: number[] = [12, 25, 38, 51],
  doubly = false
): LinkedListState {
  let seq = 1;
  const nodes: LinkedListNode[] = values.map((value) => {
    const id = `ll-${seq}`;
    seq += 1;
    return { id, value };
  });
  return { nodes, doubly, nextSeq: seq };
}

export function llInsertHead(
  state: LinkedListState,
  value: number
): PlaybackFrame<LinkedListState>[] {
  const newNode: LinkedListNode = { id: `ll-${state.nextSeq}`, value };
  const nextState: LinkedListState = {
    nodes: [newNode, ...state.nodes],
    doubly: state.doubly,
    nextSeq: state.nextSeq + 1,
  };
  return [
    {
      step: 0,
      title: `Allocate node(${value})`,
      detail: 'Point new node -> current head.',
      state,
      highlightedIds: state.nodes[0] ? [state.nodes[0].id] : [],
    },
    {
      step: 1,
      title: `Update head = node(${value})`,
      detail: `Inserted ${value} at head in O(1).`,
      state: nextState,
      highlightedIds: [newNode.id],
      resultSummary: `Inserted ${value} at head`,
    },
  ];
}

export function llInsertTail(
  state: LinkedListState,
  value: number
): PlaybackFrame<LinkedListState>[] {
  const frames: PlaybackFrame<LinkedListState>[] = [];
  if (!state.doubly) {
    for (let i = 0; i < state.nodes.length; i += 1) {
      frames.push({
        step: frames.length,
        title: `Traverse node [${i}] = ${state.nodes[i].value}`,
        detail:
          i === state.nodes.length - 1
            ? 'Reached tail node (next == nullptr).'
            : 'Follow ->next pointer.',
        state,
        highlightedIds: [state.nodes[i].id],
      });
    }
  }
  const newNode: LinkedListNode = { id: `ll-${state.nextSeq}`, value };
  const nextState: LinkedListState = {
    nodes: [...state.nodes, newNode],
    doubly: state.doubly,
    nextSeq: state.nextSeq + 1,
  };
  frames.push({
    step: frames.length,
    title: `Link tail -> node(${value})`,
    detail: `Appended ${value} at index ${nextState.nodes.length - 1}.`,
    state: nextState,
    highlightedIds: [newNode.id],
    resultSummary: `Inserted ${value} at tail`,
  });
  return frames;
}

export function llInsertAt(
  state: LinkedListState,
  index: number,
  value: number
): PlaybackFrame<LinkedListState>[] {
  const clamped = Math.max(0, Math.min(index, state.nodes.length));
  if (clamped === 0) return llInsertHead(state, value);

  const frames: PlaybackFrame<LinkedListState>[] = [];
  for (let i = 0; i < clamped; i += 1) {
    frames.push({
      step: frames.length,
      title: `Walk to predecessor [${i}]`,
      detail: `Node value = ${state.nodes[i].value}.`,
      state,
      highlightedIds: [state.nodes[i].id],
    });
  }

  const newNode: LinkedListNode = { id: `ll-${state.nextSeq}`, value };
  const nextNodes = state.nodes.slice();
  nextNodes.splice(clamped, 0, newNode);

  frames.push({
    step: frames.length,
    title: `Splice node(${value}) at [${clamped}]`,
    detail: `Rewired pointers around position ${clamped}.`,
    state: {
      nodes: nextNodes,
      doubly: state.doubly,
      nextSeq: state.nextSeq + 1,
    },
    highlightedIds: [newNode.id],
    resultSummary: `Inserted ${value} at [${clamped}]`,
  });
  return frames;
}

export function llDeleteValue(
  state: LinkedListState,
  value: number
): PlaybackFrame<LinkedListState>[] {
  const frames: PlaybackFrame<LinkedListState>[] = [];
  for (let i = 0; i < state.nodes.length; i += 1) {
    const node = state.nodes[i];
    const match = node.value === value;
    frames.push({
      step: frames.length,
      title: match ? `Match node(${value}) at [${i}]` : `Visit [${i}] = ${node.value}`,
      detail: match
        ? 'Unlink node and bridge prev -> next.'
        : `${node.value} != ${value}, continue.`,
      state,
      highlightedIds: [node.id],
    });
    if (match) {
      const nextNodes = state.nodes.filter((n) => n.id !== node.id);
      frames.push({
        step: frames.length,
        title: `Deleted ${value}`,
        detail: `List length is now ${nextNodes.length}.`,
        state: {
          nodes: nextNodes,
          doubly: state.doubly,
          nextSeq: state.nextSeq,
        },
        resultSummary: `Deleted ${value}`,
      });
      return frames;
    }
  }
  frames.push({
    step: frames.length,
    title: `${value} not found`,
    detail: 'No node modified.',
    state,
    resultSummary: 'Not found',
  });
  return frames;
}

export function llUpdateAt(
  state: LinkedListState,
  index: number,
  value: number
): PlaybackFrame<LinkedListState>[] {
  if (index < 0 || index >= state.nodes.length) {
    return [
      {
        step: 0,
        title: 'Index out of range',
        detail: `Valid indices: 0..${Math.max(0, state.nodes.length - 1)}.`,
        state,
      },
    ];
  }
  const frames: PlaybackFrame<LinkedListState>[] = [];
  for (let i = 0; i <= index; i += 1) {
    frames.push({
      step: frames.length,
      title: `Walk to [${i}] (${state.nodes[i].value})`,
      detail: i === index ? 'Reached target node.' : 'Follow ->next.',
      state,
      highlightedIds: [state.nodes[i].id],
    });
  }
  const nextNodes = state.nodes.map((n, i) =>
    i === index ? { ...n, value } : n
  );
  frames.push({
    step: frames.length,
    title: `Updated node [${index}] = ${value}`,
    detail: `Node value set to ${value}.`,
    state: {
      nodes: nextNodes,
      doubly: state.doubly,
      nextSeq: state.nextSeq,
    },
    highlightedIds: [nextNodes[index].id],
    resultSummary: `Node [${index}] = ${value}`,
  });
  return frames;
}

export function llSearch(
  state: LinkedListState,
  target: number
): PlaybackFrame<LinkedListState>[] {
  const frames: PlaybackFrame<LinkedListState>[] = [];
  for (let i = 0; i < state.nodes.length; i += 1) {
    const match = state.nodes[i].value === target;
    frames.push({
      step: frames.length,
      title: match
        ? `Found ${target} at node [${i}]`
        : `Check [${i}] = ${state.nodes[i].value}`,
      detail: match ? 'Target found.' : 'Advance ->next.',
      state,
      highlightedIds: [state.nodes[i].id],
      foundIndex: match ? i : null,
      resultSummary: match ? `Found at [${i}]` : undefined,
    });
    if (match) return frames;
  }
  frames.push({
    step: frames.length,
    title: `${target} not found`,
    detail: 'Reached nullptr.',
    state,
    foundIndex: null,
    resultSummary: 'Not found',
  });
  return frames;
}

export function llReverse(
  state: LinkedListState
): PlaybackFrame<LinkedListState>[] {
  const frames: PlaybackFrame<LinkedListState>[] = [
    {
      step: 0,
      title: 'Initialize prev=nullptr, curr=head',
      detail: `Reversing ${state.nodes.length} nodes in-place.`,
      state,
      highlightedIds: state.nodes[0] ? [state.nodes[0].id] : [],
    },
  ];
  const reversed = state.nodes.slice().reverse();
  frames.push({
    step: 1,
    title: 'All next pointers flipped',
    detail: `New head is ${reversed[0]?.value ?? 'nullptr'}.`,
    state: {
      nodes: reversed,
      doubly: state.doubly,
      nextSeq: state.nextSeq,
    },
    highlightedIds: reversed[0] ? [reversed[0].id] : [],
    resultSummary: 'Reversed linked list',
  });
  return frames;
}

// ---------------------------------------------------------------------------
// 4. Stacks
// ---------------------------------------------------------------------------
export function initStack(values: number[] = [10, 20, 30]): StackState {
  return { items: values.slice() };
}

export function stackPush(
  state: StackState,
  value: number
): PlaybackFrame<StackState>[] {
  const next = [...state.items, value];
  return [
    {
      step: 0,
      title: `Push ${value} onto top`,
      detail: `Stack height becomes ${next.length}.`,
      state: { items: next },
      highlightedIndices: [next.length - 1],
      resultSummary: `Top = ${value}`,
    },
  ];
}

export function stackPop(state: StackState): PlaybackFrame<StackState>[] {
  if (state.items.length === 0) {
    return [
      {
        step: 0,
        title: 'Stack underflow',
        detail: 'Stack is empty.',
        state,
      },
    ];
  }
  const topVal = state.items[state.items.length - 1];
  const next = state.items.slice(0, -1);
  return [
    {
      step: 0,
      title: `Read top (${topVal})`,
      detail: 'Prepare to pop LIFO top element.',
      state,
      highlightedIndices: [state.items.length - 1],
    },
    {
      step: 1,
      title: `Popped ${topVal}`,
      detail: `Remaining size: ${next.length}.`,
      state: { items: next },
      highlightedIndices: next.length > 0 ? [next.length - 1] : [],
      resultSummary: `Popped ${topVal}`,
    },
  ];
}

export function stackPeek(state: StackState): PlaybackFrame<StackState>[] {
  if (state.items.length === 0) {
    return [{ step: 0, title: 'Stack empty', detail: 'No top element.', state }];
  }
  const idx = state.items.length - 1;
  return [
    {
      step: 0,
      title: `top() = ${state.items[idx]}`,
      detail: `Peeked index ${idx} in O(1).`,
      state,
      highlightedIndices: [idx],
      resultSummary: `Top = ${state.items[idx]}`,
    },
  ];
}

export function stackSearch(
  state: StackState,
  target: number
): PlaybackFrame<StackState>[] {
  const frames: PlaybackFrame<StackState>[] = [];
  for (let i = state.items.length - 1; i >= 0; i -= 1) {
    const match = state.items[i] === target;
    frames.push({
      step: frames.length,
      title: match
        ? `Found ${target} at depth ${state.items.length - 1 - i}`
        : `Inspect [${i}] = ${state.items[i]}`,
      detail: match ? 'Target found scanning from top.' : 'Move down one slot.',
      state,
      highlightedIndices: [i],
      foundIndex: match ? i : null,
      resultSummary: match ? `Found at slot ${i}` : undefined,
    });
    if (match) return frames;
  }
  frames.push({
    step: frames.length,
    title: `${target} not in stack`,
    detail: 'Scanned from top to bottom.',
    state,
    foundIndex: null,
    resultSummary: 'Not found',
  });
  return frames;
}

// ---------------------------------------------------------------------------
// 5. Queues
// ---------------------------------------------------------------------------
export function initQueue(values: number[] = [14, 28, 42]): QueueState {
  return { items: values.slice() };
}

export function queueEnqueue(
  state: QueueState,
  value: number
): PlaybackFrame<QueueState>[] {
  const next = [...state.items, value];
  return [
    {
      step: 0,
      title: `Enqueue ${value} at back`,
      detail: `Queue length becomes ${next.length}.`,
      state: { items: next },
      highlightedIndices: [next.length - 1],
      resultSummary: `Enqueued ${value}`,
    },
  ];
}

export function queueDequeue(state: QueueState): PlaybackFrame<QueueState>[] {
  if (state.items.length === 0) {
    return [
      { step: 0, title: 'Queue empty', detail: 'Cannot dequeue.', state },
    ];
  }
  const frontVal = state.items[0];
  const next = state.items.slice(1);
  return [
    {
      step: 0,
      title: `Read front (${frontVal})`,
      detail: 'FIFO element at index 0.',
      state,
      highlightedIndices: [0],
    },
    {
      step: 1,
      title: `Dequeued ${frontVal}`,
      detail: `New front: ${next[0] ?? 'none'} (size=${next.length}).`,
      state: { items: next },
      highlightedIndices: next.length > 0 ? [0] : [],
      resultSummary: `Dequeued ${frontVal}`,
    },
  ];
}

export function queuePeek(state: QueueState): PlaybackFrame<QueueState>[] {
  if (state.items.length === 0) {
    return [{ step: 0, title: 'Queue empty', detail: 'No front element.', state }];
  }
  return [
    {
      step: 0,
      title: `front() = ${state.items[0]}`,
      detail: `back() = ${state.items[state.items.length - 1]}`,
      state,
      highlightedIndices: [0],
      resultSummary: `Front = ${state.items[0]}`,
    },
  ];
}

export function queueSearch(
  state: QueueState,
  target: number
): PlaybackFrame<QueueState>[] {
  const frames: PlaybackFrame<QueueState>[] = [];
  for (let i = 0; i < state.items.length; i += 1) {
    const match = state.items[i] === target;
    frames.push({
      step: frames.length,
      title: match ? `Found ${target} at [${i}]` : `Check [${i}] = ${state.items[i]}`,
      detail: match ? 'Match found.' : 'Advance toward back.',
      state,
      highlightedIndices: [i],
      foundIndex: match ? i : null,
      resultSummary: match ? `Found at [${i}]` : undefined,
    });
    if (match) return frames;
  }
  frames.push({
    step: frames.length,
    title: `${target} not in queue`,
    detail: 'Scanned front to back.',
    state,
    foundIndex: null,
    resultSummary: 'Not found',
  });
  return frames;
}

// ---------------------------------------------------------------------------
// 6. Hash Tables (Separate Chaining)
// ---------------------------------------------------------------------------
export function hashKey(key: string, bucketCount: number): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % bucketCount;
}

function cloneBuckets(buckets: HashEntry[][]): HashEntry[][] {
  return buckets.map((b) => b.map((e) => ({ ...e })));
}

export function initHashTable(
  bucketCount = 7,
  initial: Array<[string, number]> = [
    ['cat', 10],
    ['dog', 25],
    ['map', 42],
    ['set', 7],
  ]
): HashTableState {
  const buckets: HashEntry[][] = Array.from({ length: bucketCount }, () => []);
  for (const [key, value] of initial) {
    const idx = hashKey(key, bucketCount);
    const existing = buckets[idx].find((e) => e.key === key);
    if (existing) existing.value = value;
    else buckets[idx].push({ key, value });
  }
  return { bucketCount, buckets };
}

export function hashInsertOrUpdate(
  state: HashTableState,
  key: string,
  value: number
): PlaybackFrame<HashTableState>[] {
  const cleanKey = key.trim();
  if (!cleanKey) {
    return [{ step: 0, title: 'Empty key ignored', detail: 'Provide a key.', state }];
  }
  const idx = hashKey(cleanKey, state.bucketCount);
  const frames: PlaybackFrame<HashTableState>[] = [
    {
      step: 0,
      title: `Hash("${cleanKey}") -> bucket ${idx}`,
      detail: `FNV-1a mod ${state.bucketCount} = ${idx}.`,
      state,
      highlightedIndices: [idx],
    },
  ];

  const nextBuckets = cloneBuckets(state.buckets);
  const existing = nextBuckets[idx].find((e) => e.key === cleanKey);
  if (existing) {
    const prev = existing.value;
    existing.value = value;
    frames.push({
      step: 1,
      title: `Update "${cleanKey}": ${prev} -> ${value}`,
      detail: `Key existed in bucket ${idx}.`,
      state: { bucketCount: state.bucketCount, buckets: nextBuckets },
      highlightedIndices: [idx],
      resultSummary: `Updated "${cleanKey}"`,
    });
  } else {
    const hadCollision = nextBuckets[idx].length > 0;
    nextBuckets[idx].push({ key: cleanKey, value });
    frames.push({
      step: 1,
      title: hadCollision
        ? `Chain collision in bucket ${idx}`
        : `Insert "${cleanKey}": ${value} in bucket ${idx}`,
      detail: hadCollision
        ? `Appended "${cleanKey}" to chain of length ${nextBuckets[idx].length}.`
        : `Stored in empty bucket ${idx}.`,
      state: { bucketCount: state.bucketCount, buckets: nextBuckets },
      highlightedIndices: [idx],
      resultSummary: `Inserted "${cleanKey}" -> bucket ${idx}`,
    });
  }
  return frames;
}

export function hashSearch(
  state: HashTableState,
  key: string
): PlaybackFrame<HashTableState>[] {
  const cleanKey = key.trim();
  if (!cleanKey) {
    return [{ step: 0, title: 'Empty key', detail: 'Provide a key.', state }];
  }
  const idx = hashKey(cleanKey, state.bucketCount);
  const chain = state.buckets[idx];
  const hit = chain.find((e) => e.key === cleanKey);
  return [
    {
      step: 0,
      title: `Hash("${cleanKey}") -> bucket ${idx}`,
      detail: `Scanning ${chain.length} entry(s) in bucket ${idx}.`,
      state,
      highlightedIndices: [idx],
    },
    {
      step: 1,
      title: hit ? `Found "${cleanKey}" = ${hit.value}` : `"${cleanKey}" not found`,
      detail: hit
        ? `Located in bucket ${idx}.`
        : `No matching key in bucket ${idx}.`,
      state,
      highlightedIndices: [idx],
      foundIndex: hit ? idx : null,
      resultSummary: hit ? `Value = ${hit.value}` : 'Not found',
    },
  ];
}

export function hashDelete(
  state: HashTableState,
  key: string
): PlaybackFrame<HashTableState>[] {
  const cleanKey = key.trim();
  const idx = hashKey(cleanKey, state.bucketCount);
  const nextBuckets = cloneBuckets(state.buckets);
  const before = nextBuckets[idx].length;
  nextBuckets[idx] = nextBuckets[idx].filter((e) => e.key !== cleanKey);
  const removed = nextBuckets[idx].length < before;
  return [
    {
      step: 0,
      title: `Hash("${cleanKey}") -> bucket ${idx}`,
      detail: `Check bucket ${idx}.`,
      state,
      highlightedIndices: [idx],
    },
    {
      step: 1,
      title: removed ? `Deleted "${cleanKey}"` : `"${cleanKey}" not found`,
      detail: removed
        ? `Removed from bucket ${idx}.`
        : 'Bucket unchanged.',
      state: { bucketCount: state.bucketCount, buckets: nextBuckets },
      highlightedIndices: [idx],
      resultSummary: removed ? `Deleted "${cleanKey}"` : 'Not found',
    },
  ];
}

export function hashRehash(
  state: HashTableState,
  newBucketCount: number
): PlaybackFrame<HashTableState>[] {
  const targetCount = Math.max(3, newBucketCount);
  const entries = state.buckets.flat();
  const nextBuckets: HashEntry[][] = Array.from({ length: targetCount }, () => []);
  for (const e of entries) {
    nextBuckets[hashKey(e.key, targetCount)].push({ ...e });
  }
  return [
    {
      step: 0,
      title: `Rehashing ${entries.length} entries`,
      detail: `Resizing buckets ${state.bucketCount} -> ${targetCount}.`,
      state,
    },
    {
      step: 1,
      title: `Rehash complete (${targetCount} buckets)`,
      detail: `Load factor: ${(entries.length / targetCount).toFixed(2)}.`,
      state: { bucketCount: targetCount, buckets: nextBuckets },
      resultSummary: `Rehashed to ${targetCount} buckets`,
    },
  ];
}

export function getHashTableMetrics(state: HashTableState) {
  const itemCount = state.buckets.reduce((sum, b) => sum + b.length, 0);
  const collisions = state.buckets.reduce(
    (sum, b) => sum + Math.max(0, b.length - 1),
    0
  );
  const maxChain = state.buckets.reduce((m, b) => Math.max(m, b.length), 0);
  return {
    itemCount,
    loadFactor: Number((itemCount / state.bucketCount).toFixed(2)),
    collisions,
    maxChain,
  };
}

// ---------------------------------------------------------------------------
// 7. Binary Trees & 8. Binary Search Trees
// ---------------------------------------------------------------------------
function cloneTree(node: BinaryTreeNode | null): BinaryTreeNode | null {
  if (!node) return null;
  return {
    id: node.id,
    value: node.value,
    left: cloneTree(node.left),
    right: cloneTree(node.right),
  };
}

export function initBinaryTree(
  levelOrder: Array<number | null> = [10, 20, 30, 40, 50, null, 70]
): BinaryTreeState {
  if (levelOrder.length === 0 || levelOrder[0] === null) {
    return { root: null, nextSeq: 1 };
  }
  let seq = 1;
  const makeNode = (val: number): BinaryTreeNode => {
    const n: BinaryTreeNode = { id: `tn-${seq}`, value: val, left: null, right: null };
    seq += 1;
    return n;
  };
  const root = makeNode(levelOrder[0]);
  const queue: BinaryTreeNode[] = [root];
  let idx = 1;
  while (queue.length > 0 && idx < levelOrder.length) {
    const curr = queue.shift()!;
    const leftVal = levelOrder[idx++];
    if (leftVal !== undefined && leftVal !== null) {
      curr.left = makeNode(leftVal);
      queue.push(curr.left);
    }
    if (idx < levelOrder.length) {
      const rightVal = levelOrder[idx++];
      if (rightVal !== undefined && rightVal !== null) {
        curr.right = makeNode(rightVal);
        queue.push(curr.right);
      }
    }
  }
  return { root, nextSeq: seq };
}

export function btInsertLevelOrder(
  state: BinaryTreeState,
  value: number
): PlaybackFrame<BinaryTreeState>[] {
  const root = cloneTree(state.root);
  const newNode: BinaryTreeNode = {
    id: `tn-${state.nextSeq}`,
    value,
    left: null,
    right: null,
  };
  if (!root) {
    return [
      {
        step: 0,
        title: `Insert root ${value}`,
        detail: 'Tree was empty; new node becomes root.',
        state: { root: newNode, nextSeq: state.nextSeq + 1 },
        highlightedIds: [newNode.id],
        resultSummary: `Inserted ${value} as root`,
      },
    ];
  }

  const frames: PlaybackFrame<BinaryTreeState>[] = [];
  const queue: BinaryTreeNode[] = [root];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    frames.push({
      step: frames.length,
      title: `BFS check node(${curr.value})`,
      detail:
        !curr.left || !curr.right
          ? `Found open child slot under ${curr.value}.`
          : 'Both children occupied; continue level-order scan.',
      state: { root: cloneTree(root), nextSeq: state.nextSeq },
      highlightedIds: [curr.id],
    });
    if (!curr.left) {
      curr.left = newNode;
      break;
    }
    queue.push(curr.left);
    if (!curr.right) {
      curr.right = newNode;
      break;
    }
    queue.push(curr.right);
  }

  frames.push({
    step: frames.length,
    title: `Inserted ${value}`,
    detail: `Placed ${value} at first available level-order slot.`,
    state: { root, nextSeq: state.nextSeq + 1 },
    highlightedIds: [newNode.id],
    resultSummary: `Inserted ${value}`,
  });
  return frames;
}

export function btSearch(
  state: BinaryTreeState,
  target: number
): PlaybackFrame<BinaryTreeState>[] {
  if (!state.root) {
    return [{ step: 0, title: 'Tree empty', detail: 'No nodes.', state }];
  }
  const frames: PlaybackFrame<BinaryTreeState>[] = [];
  const queue: BinaryTreeNode[] = [state.root];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    const hit = curr.value === target;
    frames.push({
      step: frames.length,
      title: hit ? `Found ${target}` : `Visit ${curr.value}`,
      detail: hit ? 'Target node located.' : `${curr.value} != ${target}.`,
      state,
      highlightedIds: [curr.id],
      resultSummary: hit ? `Found ${target}` : undefined,
    });
    if (hit) return frames;
    if (curr.left) queue.push(curr.left);
    if (curr.right) queue.push(curr.right);
  }
  frames.push({
    step: frames.length,
    title: `${target} not found`,
    detail: 'Visited every node in tree.',
    state,
    resultSummary: 'Not found',
  });
  return frames;
}

export function btUpdateValue(
  state: BinaryTreeState,
  oldValue: number,
  newValue: number
): PlaybackFrame<BinaryTreeState>[] {
  const root = cloneTree(state.root);
  if (!root) return [{ step: 0, title: 'Tree empty', detail: 'No nodes.', state }];
  const queue: BinaryTreeNode[] = [root];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr.value === oldValue) {
      curr.value = newValue;
      return [
        {
          step: 0,
          title: `Updated ${oldValue} -> ${newValue}`,
          detail: 'Modified node value in-place.',
          state: { root, nextSeq: state.nextSeq },
          highlightedIds: [curr.id],
          resultSummary: `${oldValue} -> ${newValue}`,
        },
      ];
    }
    if (curr.left) queue.push(curr.left);
    if (curr.right) queue.push(curr.right);
  }
  return [
    {
      step: 0,
      title: `${oldValue} not found`,
      detail: 'No node updated.',
      state,
    },
  ];
}

export function btDeleteValue(
  state: BinaryTreeState,
  value: number
): PlaybackFrame<BinaryTreeState>[] {
  const root = cloneTree(state.root);
  if (!root) return [{ step: 0, title: 'Tree empty', detail: 'No nodes.', state }];

  const queue: BinaryTreeNode[] = [root];
  const order: BinaryTreeNode[] = [];
  let targetNode: BinaryTreeNode | null = null;
  let parentOfLast: BinaryTreeNode | null = null;
  let lastNode: BinaryTreeNode = root;

  while (queue.length > 0) {
    const curr = queue.shift()!;
    order.push(curr);
    if (curr.value === value && !targetNode) targetNode = curr;
    if (curr.left) {
      parentOfLast = curr;
      lastNode = curr.left;
      queue.push(curr.left);
    }
    if (curr.right) {
      parentOfLast = curr;
      lastNode = curr.right;
      queue.push(curr.right);
    }
  }

  if (!targetNode) {
    return [
      {
        step: 0,
        title: `${value} not found`,
        detail: 'Tree unchanged.',
        state,
        resultSummary: 'Not found',
      },
    ];
  }

  if (order.length === 1) {
    return [
      {
        step: 0,
        title: `Deleted root ${value}`,
        detail: 'Tree is now empty.',
        state: { root: null, nextSeq: state.nextSeq },
        resultSummary: `Deleted ${value}`,
      },
    ];
  }

  targetNode.value = lastNode.value;
  if (parentOfLast) {
    if (parentOfLast.right === lastNode) parentOfLast.right = null;
    else if (parentOfLast.left === lastNode) parentOfLast.left = null;
  }

  return [
    {
      step: 0,
      title: `Deleted ${value} (replaced with deepest ${lastNode.value})`,
      detail: 'Replaced target with deepest rightmost node and pruned leaf.',
      state: { root, nextSeq: state.nextSeq },
      highlightedIds: [targetNode.id],
      resultSummary: `Deleted ${value}`,
    },
  ];
}

export function btTraverse(
  state: BinaryTreeState,
  mode: 'inorder' | 'preorder' | 'postorder' | 'levelorder'
): PlaybackFrame<BinaryTreeState>[] {
  if (!state.root) {
    return [{ step: 0, title: 'Tree empty', detail: 'No nodes.', state }];
  }
  const visited: BinaryTreeNode[] = [];
  const walk = (n: BinaryTreeNode | null) => {
    if (!n) return;
    if (mode === 'preorder') visited.push(n);
    walk(n.left);
    if (mode === 'inorder') visited.push(n);
    walk(n.right);
    if (mode === 'postorder') visited.push(n);
  };
  if (mode === 'levelorder') {
    const q: BinaryTreeNode[] = [state.root];
    while (q.length > 0) {
      const c = q.shift()!;
      visited.push(c);
      if (c.left) q.push(c.left);
      if (c.right) q.push(c.right);
    }
  } else {
    walk(state.root);
  }

  const acc: number[] = [];
  return visited.map((node, idx) => {
    acc.push(node.value);
    return {
      step: idx,
      title: `${mode} visit: ${node.value}`,
      detail: `Order so far: [${acc.join(', ')}]`,
      state: { ...state, traversalOrder: acc.slice() },
      highlightedIds: [node.id],
      resultSummary:
        idx === visited.length - 1 ? `${mode}: [${acc.join(', ')}]` : undefined,
    };
  });
}

// 8. Binary Search Tree
export function initBst(
  values: number[] = [50, 30, 70, 20, 40, 60, 80]
): BinaryTreeState {
  let current: BinaryTreeState = { root: null, nextSeq: 1 };
  for (const v of values) {
    const frames = bstInsert(current, v);
    current = frames[frames.length - 1].state;
  }
  return current;
}

export function bstInsert(
  state: BinaryTreeState,
  value: number
): PlaybackFrame<BinaryTreeState>[] {
  const root = cloneTree(state.root);
  const newNode: BinaryTreeNode = {
    id: `tn-${state.nextSeq}`,
    value,
    left: null,
    right: null,
  };
  if (!root) {
    return [
      {
        step: 0,
        title: `Insert root ${value}`,
        detail: 'Empty BST; inserted at root.',
        state: { root: newNode, nextSeq: state.nextSeq + 1 },
        highlightedIds: [newNode.id],
        resultSummary: `Inserted ${value}`,
      },
    ];
  }

  const frames: PlaybackFrame<BinaryTreeState>[] = [];
  let curr: BinaryTreeNode | null = root;
  while (curr) {
    frames.push({
      step: frames.length,
      title: `Compare ${value} with ${curr.value}`,
      detail:
        value < curr.value
          ? `${value} < ${curr.value} -> go left`
          : value > curr.value
            ? `${value} > ${curr.value} -> go right`
            : `${value} == ${curr.value} (duplicate ignored)`,
      state: { root: cloneTree(root), nextSeq: state.nextSeq },
      highlightedIds: [curr.id],
    });
    if (value === curr.value) {
      return [
        ...frames,
        {
          step: frames.length,
          title: `${value} already in BST`,
          detail: 'Duplicates are ignored.',
          state,
          highlightedIds: [curr.id],
          resultSummary: 'Duplicate ignored',
        },
      ];
    }
    if (value < curr.value) {
      if (!curr.left) {
        curr.left = newNode;
        break;
      }
      curr = curr.left;
    } else {
      if (!curr.right) {
        curr.right = newNode;
        break;
      }
      curr = curr.right;
    }
  }

  frames.push({
    step: frames.length,
    title: `Inserted ${value}`,
    detail: `Placed ${value} preserving BST invariant.`,
    state: { root, nextSeq: state.nextSeq + 1 },
    highlightedIds: [newNode.id],
    resultSummary: `Inserted ${value}`,
  });
  return frames;
}

export function bstSearch(
  state: BinaryTreeState,
  target: number
): PlaybackFrame<BinaryTreeState>[] {
  const frames: PlaybackFrame<BinaryTreeState>[] = [];
  let curr = state.root;
  while (curr) {
    const hit = curr.value === target;
    frames.push({
      step: frames.length,
      title: hit ? `Found ${target}` : `Compare ${target} vs ${curr.value}`,
      detail: hit
        ? 'Target located in BST.'
        : target < curr.value
          ? `${target} < ${curr.value} -> descend left.`
          : `${target} > ${curr.value} -> descend right.`,
      state,
      highlightedIds: [curr.id],
      resultSummary: hit ? `Found ${target}` : undefined,
    });
    if (hit) return frames;
    curr = target < curr.value ? curr.left : curr.right;
  }
  frames.push({
    step: frames.length,
    title: `${target} not found`,
    detail: 'Reached nullptr leaf.',
    state,
    resultSummary: 'Not found',
  });
  return frames;
}

export function bstDelete(
  state: BinaryTreeState,
  value: number
): PlaybackFrame<BinaryTreeState>[] {
  const root = cloneTree(state.root);
  const frames: PlaybackFrame<BinaryTreeState>[] = [];

  const removeNode = (
    node: BinaryTreeNode | null,
    target: number
  ): BinaryTreeNode | null => {
    if (!node) return null;
    frames.push({
      step: frames.length,
      title: `Visit ${node.value}`,
      detail:
        target === node.value
          ? `Found ${target} to delete.`
          : target < node.value
            ? 'Go left.'
            : 'Go right.',
      state: { root: cloneTree(root), nextSeq: state.nextSeq },
      highlightedIds: [node.id],
    });
    if (target < node.value) {
      node.left = removeNode(node.left, target);
      return node;
    }
    if (target > node.value) {
      node.right = removeNode(node.right, target);
      return node;
    }
    if (!node.left) return node.right;
    if (!node.right) return node.left;

    // Two children: replace with inorder successor
    let succ = node.right;
    while (succ.left) succ = succ.left;
    node.value = succ.value;
    node.right = removeNode(node.right, succ.value);
    return node;
  };

  const nextRoot = removeNode(root, value);
  frames.push({
    step: frames.length,
    title: `BST delete(${value}) complete`,
    detail: 'BST invariant maintained.',
    state: { root: nextRoot, nextSeq: state.nextSeq },
    resultSummary: `Deleted ${value}`,
  });
  return frames;
}

export function bstFindMinMax(
  state: BinaryTreeState,
  which: 'min' | 'max'
): PlaybackFrame<BinaryTreeState>[] {
  if (!state.root) {
    return [{ step: 0, title: 'BST empty', detail: 'No nodes.', state }];
  }
  const frames: PlaybackFrame<BinaryTreeState>[] = [];
  let curr: BinaryTreeNode | null = state.root;
  let result = curr.value;
  while (curr) {
    result = curr.value;
    const nextNode: BinaryTreeNode | null = which === 'min' ? curr.left : curr.right;
    frames.push({
      step: frames.length,
      title: nextNode
        ? `Step ${which === 'min' ? 'left' : 'right'} from ${curr.value}`
        : `${which.toUpperCase()} = ${curr.value}`,
      detail: nextNode
        ? `Move to ${nextNode.value}.`
        : `Reached extreme ${which} node.`,
      state,
      highlightedIds: [curr.id],
      resultSummary: nextNode ? undefined : `${which.toUpperCase()} = ${result}`,
    });
    curr = nextNode;
  }
  return frames;
}

export function bstInorder(node: BinaryTreeNode | null): number[] {
  if (!node) return [];
  return [...bstInorder(node.left), node.value, ...bstInorder(node.right)];
}

export function isValidBst(
  node: BinaryTreeNode | null,
  min = -Infinity,
  max = Infinity
): boolean {
  if (!node) return true;
  if (node.value <= min || node.value >= max) return false;
  return (
    isValidBst(node.left, min, node.value) &&
    isValidBst(node.right, node.value, max)
  );
}

export function getTreeMetrics(root: BinaryTreeNode | null): {
  nodeCount: number;
  height: number;
  leafCount: number;
} {
  if (!root) return { nodeCount: 0, height: 0, leafCount: 0 };
  const left = getTreeMetrics(root.left);
  const right = getTreeMetrics(root.right);
  const isLeaf = !root.left && !root.right;
  return {
    nodeCount: 1 + left.nodeCount + right.nodeCount,
    height: 1 + Math.max(left.height, right.height),
    leafCount: (isLeaf ? 1 : 0) + left.leafCount + right.leafCount,
  };
}

export function computeTreeLayout(root: BinaryTreeNode | null): TreeLayout {
  if (!root) return { nodes: [], edges: [], width: 420, height: 200 };

  const positions = new Map<string, { x: number; y: number; depth: number; value: number }>();
  let xCursor = 0;

  const assignInorderX = (node: BinaryTreeNode | null, depth: number) => {
    if (!node) return;
    assignInorderX(node.left, depth + 1);
    positions.set(node.id, {
      x: xCursor * 56 + 44,
      y: depth * 64 + 38,
      depth,
      value: node.value,
    });
    xCursor += 1;
    assignInorderX(node.right, depth + 1);
  };

  assignInorderX(root, 0);

  const nodes: TreePositionedNode[] = [];
  const edges: TreePositionedEdge[] = [];
  let maxX = 420;
  let maxY = 200;

  const collect = (node: BinaryTreeNode | null) => {
    if (!node) return;
    const p = positions.get(node.id)!;
    nodes.push({ id: node.id, value: node.value, x: p.x, y: p.y, depth: p.depth });
    if (p.x + 44 > maxX) maxX = p.x + 44;
    if (p.y + 44 > maxY) maxY = p.y + 44;

    if (node.left) {
      const lp = positions.get(node.left.id)!;
      edges.push({ fromId: node.id, toId: node.left.id, x1: p.x, y1: p.y, x2: lp.x, y2: lp.y });
      collect(node.left);
    }
    if (node.right) {
      const rp = positions.get(node.right.id)!;
      edges.push({ fromId: node.id, toId: node.right.id, x1: p.x, y1: p.y, x2: rp.x, y2: rp.y });
      collect(node.right);
    }
  };
  collect(root);

  return { nodes, edges, width: maxX, height: maxY };
}

// ---------------------------------------------------------------------------
// 9. Heaps (Min / Max)
// ---------------------------------------------------------------------------
function heapCompare(a: number, b: number, kind: 'min' | 'max'): boolean {
  return kind === 'min' ? a < b : a > b;
}

export function initHeap(
  values: number[] = [15, 22, 18, 40, 31, 27],
  kind: 'min' | 'max' = 'min'
): HeapState {
  const frames = heapBuildFromArray(values, kind);
  return frames[frames.length - 1].state;
}

export function heapBuildFromArray(
  values: number[],
  kind: 'min' | 'max'
): PlaybackFrame<HeapState>[] {
  const arr = values.slice();
  const frames: PlaybackFrame<HeapState>[] = [
    {
      step: 0,
      title: `Build ${kind}-heap (Floyd heapify)`,
      detail: `Starting from ${arr.length} element(s).`,
      state: { items: arr.slice(), kind },
    },
  ];

  const siftDown = (startIdx: number) => {
    let i = startIdx;
    while (true) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let best = i;
      if (left < arr.length && heapCompare(arr[left], arr[best], kind)) {
        best = left;
      }
      if (right < arr.length && heapCompare(arr[right], arr[best], kind)) {
        best = right;
      }
      if (best === i) break;
      const tmp = arr[i];
      arr[i] = arr[best];
      arr[best] = tmp;
      frames.push({
        step: frames.length,
        title: `Sift-down swap [${i}] <-> [${best}]`,
        detail: `${arr[best]} swapped with ${arr[i]}.`,
        state: { items: arr.slice(), kind },
        highlightedIndices: [i, best],
      });
      i = best;
    }
  };

  for (let i = Math.floor(arr.length / 2) - 1; i >= 0; i -= 1) {
    siftDown(i);
  }

  frames.push({
    step: frames.length,
    title: `${kind}-heap ready`,
    detail: arr.length > 0 ? `Root = ${arr[0]}.` : 'Empty heap.',
    state: { items: arr, kind },
    highlightedIndices: arr.length > 0 ? [0] : [],
    resultSummary: arr.length > 0 ? `Top = ${arr[0]}` : 'Empty',
  });
  return frames;
}

export function heapPush(
  state: HeapState,
  value: number
): PlaybackFrame<HeapState>[] {
  const arr = [...state.items, value];
  const frames: PlaybackFrame<HeapState>[] = [
    {
      step: 0,
      title: `Append ${value} at [${arr.length - 1}]`,
      detail: 'Begin sift-up toward root.',
      state: { items: arr.slice(), kind: state.kind },
      highlightedIndices: [arr.length - 1],
    },
  ];
  let i = arr.length - 1;
  while (i > 0) {
    const parent = Math.floor((i - 1) / 2);
    if (!heapCompare(arr[i], arr[parent], state.kind)) break;
    const tmp = arr[i];
    arr[i] = arr[parent];
    arr[parent] = tmp;
    frames.push({
      step: frames.length,
      title: `Sift-up swap [${i}] <-> [${parent}]`,
      detail: `${arr[parent]} moves up past ${arr[i]}.`,
      state: { items: arr.slice(), kind: state.kind },
      highlightedIndices: [i, parent],
    });
    i = parent;
  }
  frames.push({
    step: frames.length,
    title: `Heap property restored`,
    detail: `Top = ${arr[0]}.`,
    state: { items: arr, kind: state.kind },
    highlightedIndices: [i],
    resultSummary: `Pushed ${value}`,
  });
  return frames;
}

export function heapPop(state: HeapState): PlaybackFrame<HeapState>[] {
  if (state.items.length === 0) {
    return [{ step: 0, title: 'Heap empty', detail: 'Cannot pop.', state }];
  }
  const arr = state.items.slice();
  const topVal = arr[0];
  if (arr.length === 1) {
    return [
      {
        step: 0,
        title: `Popped root ${topVal}`,
        detail: 'Heap is now empty.',
        state: { items: [], kind: state.kind },
        resultSummary: `Popped ${topVal}`,
      },
    ];
  }

  arr[0] = arr.pop()!;
  const frames: PlaybackFrame<HeapState>[] = [
    {
      step: 0,
      title: `Extract root ${topVal}, move ${arr[0]} to [0]`,
      detail: 'Begin sift-down from root.',
      state: { items: arr.slice(), kind: state.kind },
      highlightedIndices: [0],
    },
  ];

  let i = 0;
  while (true) {
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    let best = i;
    if (left < arr.length && heapCompare(arr[left], arr[best], state.kind)) {
      best = left;
    }
    if (right < arr.length && heapCompare(arr[right], arr[best], state.kind)) {
      best = right;
    }
    if (best === i) break;
    const tmp = arr[i];
    arr[i] = arr[best];
    arr[best] = tmp;
    frames.push({
      step: frames.length,
      title: `Sift-down swap [${i}] <-> [${best}]`,
      detail: `${arr[i]} promoted over ${arr[best]}.`,
      state: { items: arr.slice(), kind: state.kind },
      highlightedIndices: [i, best],
    });
    i = best;
  }

  frames.push({
    step: frames.length,
    title: `Popped ${topVal}`,
    detail: `New top = ${arr[0]}.`,
    state: { items: arr, kind: state.kind },
    highlightedIndices: [0],
    resultSummary: `Popped ${topVal}`,
  });
  return frames;
}

export function heapSearch(
  state: HeapState,
  target: number
): PlaybackFrame<HeapState>[] {
  const frames: PlaybackFrame<HeapState>[] = [];
  for (let i = 0; i < state.items.length; i += 1) {
    const match = state.items[i] === target;
    frames.push({
      step: frames.length,
      title: match ? `Found ${target} at [${i}]` : `Check [${i}] = ${state.items[i]}`,
      detail: match ? 'Matched in heap array.' : 'Continue scan.',
      state,
      highlightedIndices: [i],
      foundIndex: match ? i : null,
      resultSummary: match ? `Found at [${i}]` : undefined,
    });
    if (match) return frames;
  }
  frames.push({
    step: frames.length,
    title: `${target} not found`,
    detail: 'Scanned all heap slots.',
    state,
    foundIndex: null,
    resultSummary: 'Not found',
  });
  return frames;
}

export function heapToTreeLayout(items: number[]): TreeLayout {
  if (items.length === 0) return { nodes: [], edges: [], width: 420, height: 180 };
  const buildNode = (idx: number): BinaryTreeNode | null => {
    if (idx >= items.length) return null;
    return {
      id: `h-${idx}`,
      value: items[idx],
      left: buildNode(2 * idx + 1),
      right: buildNode(2 * idx + 2),
    };
  };
  return computeTreeLayout(buildNode(0));
}

// ---------------------------------------------------------------------------
// 10. Graphs
// ---------------------------------------------------------------------------
export function initGraph(directed = false): GraphState {
  const nodes: GraphNode[] = [
    { id: '0', label: '0' },
    { id: '1', label: '1' },
    { id: '2', label: '2' },
    { id: '3', label: '3' },
    { id: '4', label: '4' },
    { id: '5', label: '5' },
  ];
  const edges: GraphEdge[] = [
    { id: 'e-1', from: '0', to: '1', weight: 1 },
    { id: 'e-2', from: '0', to: '2', weight: 1 },
    { id: 'e-3', from: '1', to: '3', weight: 1 },
    { id: 'e-4', from: '2', to: '4', weight: 1 },
    { id: 'e-5', from: '3', to: '5', weight: 1 },
    { id: 'e-6', from: '4', to: '5', weight: 1 },
  ];
  return { nodes, edges, directed, nextSeq: 7 };
}

export function parseEdgeListToGraph(
  edgeText: string,
  directed: boolean
): GraphState {
  const nodeMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  let seq = 1;

  const tokens = edgeText
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const token of tokens) {
    const m = token.match(/^([A-Za-z0-9_]+)\s*[-–>]+\s*([A-Za-z0-9_]+)(?:\s*:\s*(-?\d+))?$/);
    if (!m) {
      if (/^[A-Za-z0-9_]+$/.test(token) && !nodeMap.has(token)) {
        nodeMap.set(token, { id: token, label: token });
      }
      continue;
    }
    const [, from, to, weightStr] = m;
    if (!nodeMap.has(from)) nodeMap.set(from, { id: from, label: from });
    if (!nodeMap.has(to)) nodeMap.set(to, { id: to, label: to });
    const weight = weightStr ? Number.parseInt(weightStr, 10) : 1;
    edges.push({ id: `e-${seq}`, from, to, weight });
    seq += 1;
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges,
    directed,
    nextSeq: seq,
  };
}

export function graphAddNode(
  state: GraphState,
  label: string
): PlaybackFrame<GraphState>[] {
  const clean = label.trim();
  if (!clean || state.nodes.some((n) => n.id === clean)) {
    return [
      {
        step: 0,
        title: clean ? `Node "${clean}" already exists` : 'Empty label',
        detail: 'No node added.',
        state,
      },
    ];
  }
  const nextNode: GraphNode = { id: clean, label: clean };
  return [
    {
      step: 0,
      title: `Added node ${clean}`,
      detail: `Graph now has ${state.nodes.length + 1} vertices.`,
      state: { ...state, nodes: [...state.nodes, nextNode] },
      highlightedIds: [clean],
      resultSummary: `Added vertex ${clean}`,
    },
  ];
}

export function graphRemoveNode(
  state: GraphState,
  nodeId: string
): PlaybackFrame<GraphState>[] {
  if (!state.nodes.some((n) => n.id === nodeId)) {
    return [{ step: 0, title: `Node "${nodeId}" not found`, detail: 'Unchanged.', state }];
  }
  return [
    {
      step: 0,
      title: `Removed vertex ${nodeId}`,
      detail: 'Pruned vertex and incident edges.',
      state: {
        ...state,
        nodes: state.nodes.filter((n) => n.id !== nodeId),
        edges: state.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
      },
      resultSummary: `Removed ${nodeId}`,
    },
  ];
}

export function graphAddEdge(
  state: GraphState,
  from: string,
  to: string,
  weight = 1
): PlaybackFrame<GraphState>[] {
  const f = from.trim();
  const t = to.trim();
  if (!f || !t) {
    return [{ step: 0, title: 'Invalid edge', detail: 'Provide from and to.', state }];
  }
  const nextNodes = state.nodes.slice();
  if (!nextNodes.some((n) => n.id === f)) nextNodes.push({ id: f, label: f });
  if (!nextNodes.some((n) => n.id === t)) nextNodes.push({ id: t, label: t });

  const newEdge: GraphEdge = { id: `e-${state.nextSeq}`, from: f, to: t, weight };
  return [
    {
      step: 0,
      title: `Added edge ${f} ${state.directed ? '->' : '--'} ${t} (w=${weight})`,
      detail: `Graph now has ${state.edges.length + 1} edges.`,
      state: {
        ...state,
        nodes: nextNodes,
        edges: [...state.edges, newEdge],
        nextSeq: state.nextSeq + 1,
      },
      highlightedIds: [f, t],
      resultSummary: `Added edge ${f}-${t}`,
    },
  ];
}

export function graphRemoveEdge(
  state: GraphState,
  from: string,
  to: string
): PlaybackFrame<GraphState>[] {
  const nextEdges = state.edges.filter((e) => {
    if (state.directed) return !(e.from === from && e.to === to);
    return !((e.from === from && e.to === to) || (e.from === to && e.to === from));
  });
  const removed = nextEdges.length < state.edges.length;
  return [
    {
      step: 0,
      title: removed ? `Removed edge ${from}-${to}` : `Edge ${from}-${to} not found`,
      detail: removed ? `${nextEdges.length} edge(s) remaining.` : 'Graph unchanged.',
      state: { ...state, edges: nextEdges },
      resultSummary: removed ? `Removed edge ${from}-${to}` : 'Not found',
    },
  ];
}

export function graphUpdateEdgeWeight(
  state: GraphState,
  edgeId: string,
  weight: number
): PlaybackFrame<GraphState>[] {
  const nextEdges = state.edges.map((e) =>
    e.id === edgeId ? { ...e, weight } : e
  );
  return [
    {
      step: 0,
      title: `Updated edge weight to ${weight}`,
      detail: 'Modified graph edge weight.',
      state: { ...state, edges: nextEdges },
      resultSummary: `Weight = ${weight}`,
    },
  ];
}

export function graphSearchNode(
  state: GraphState,
  nodeId: string
): PlaybackFrame<GraphState>[] {
  const frames: PlaybackFrame<GraphState>[] = [];
  for (let i = 0; i < state.nodes.length; i += 1) {
    const n = state.nodes[i];
    const hit = n.id === nodeId;
    frames.push({
      step: frames.length,
      title: hit ? `Found vertex ${n.id}` : `Check vertex ${n.id}`,
      detail: hit ? 'Vertex exists in graph.' : 'Continue.',
      state,
      highlightedIds: [n.id],
      resultSummary: hit ? `Found ${n.id}` : undefined,
    });
    if (hit) return frames;
  }
  frames.push({
    step: frames.length,
    title: `Vertex ${nodeId} not found`,
    detail: 'Not present in vertex set.',
    state,
    resultSummary: 'Not found',
  });
  return frames;
}

export function computeGraphCircularLayout(
  nodes: GraphNode[],
  width = 400,
  height = 240
): GraphPositionedNode[] {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.max(45, Math.min(width, height) / 2 - 34);
  if (nodes.length === 1) {
    return [{ ...nodes[0], x: cx, y: cy }];
  }
  return nodes.map((n, idx) => {
    const angle = (idx / nodes.length) * Math.PI * 2 - Math.PI / 2;
    return {
      ...n,
      x: Math.round(cx + radius * Math.cos(angle)),
      y: Math.round(cy + radius * Math.sin(angle)),
    };
  });
}

export function buildAdjacencyList(
  state: GraphState
): Record<string, Array<{ to: string; weight: number }>> {
  const adj: Record<string, Array<{ to: string; weight: number }>> = {};
  for (const n of state.nodes) adj[n.id] = [];
  for (const e of state.edges) {
    if (!adj[e.from]) adj[e.from] = [];
    adj[e.from].push({ to: e.to, weight: e.weight });
    if (!state.directed && e.from !== e.to) {
      if (!adj[e.to]) adj[e.to] = [];
      adj[e.to].push({ to: e.from, weight: e.weight });
    }
  }
  return adj;
}

export function buildAdjacencyMatrix(state: GraphState): {
  labels: string[];
  matrix: Array<Array<number | null>>;
} {
  const labels = state.nodes.map((n) => n.id);
  const idxMap = new Map(labels.map((l, i) => [l, i]));
  const matrix: Array<Array<number | null>> = Array.from(
    { length: labels.length },
    () => Array.from({ length: labels.length }, () => null)
  );
  for (const e of state.edges) {
    const u = idxMap.get(e.from);
    const v = idxMap.get(e.to);
    if (u === undefined || v === undefined) continue;
    matrix[u][v] = e.weight;
    if (!state.directed) matrix[v][u] = e.weight;
  }
  return { labels, matrix };
}
