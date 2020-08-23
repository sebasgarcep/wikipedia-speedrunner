// Max Priority Queue: Taken from https://en.wikipedia.org/wiki/Binary_heap
class PriorityQueue {
  constructor() {
    this.tree = null;
    this.map = new Map();
    this.size = 0;
  }

  insert(key, priority) {
    // Define node
    const node = { key, priority, parent: null, left: null, right: null };
    this.map.set(key, node);
    // Add the element to the bottom level of the heap at the leftmost open space
    if (this.size === 0) {
      this.tree = node;
    } else {
      const { direction, node: nodeParent } = this._traverse(this.size + 1);
      node.parent = nodeParent;
      if (direction === 0) {
        nodeParent.left = node;
      } else {
        nodeParent.right = node;
      }
      // Compare the added element with its parent; if they are in the correct order, stop.
      // If not, swap the element with its parent and return to the previous step.
      this._upheap(node);
    }
    this.size += 1;
  }

  pop() {
    const node = this.tree;
    if (node === null) { return null; }
    const { key } = node;
    // Replace the root of the heap with the last element on the last level.
    if (this.size === 1) {
      this.size = 0;
      this.tree = null;
      this.map.delete(key);
      return node.key;
    }
    const { direction, node: replacementParent } = this._traverse(this.size);
    const replacement = direction === 0 ? replacementParent.left : replacementParent.right;
    this._swap(node, replacement);
    // Delete node from hierarchy
    this.size -= 1;
    this.map.delete(key);
    if (node.parent.left === node) { node.parent.left = null; }
    if (node.parent.right === node) { node.parent.right = null; }
    node.parent = null;
    // Compare the new root with its children; if they are in the correct order, stop.
    // If not, swap the element with one of its children and return to the previous step. (Swap with its smaller child in a min-heap and its larger child in a max-heap.)
    this._downheap(replacement);
    return node.key;
  }

  setPriority(key, priority) {
    const node = this.get(key);
    const previousPriority = node.priority;
    node.priority = priority;
    if (previousPriority === priority) {
      return;
    } else if (previousPriority < priority) {
      this._upheap(node);
    } else {
      this._downheap(node);
    }
  }

  get(key) {
    return this.map.get(key);
  }

  isEmpty() {
    return this.tree === null;
  }

  _upheap(node) {
    let current = node;
    while (current.parent !== null && current.priority > current.parent.priority) {
      this._swap(current, current.parent);
    }
  }

  _downheap(node) {
    let current = node;
    while (true) {
      let target = null;
      if (
        current.left !== null &&
        current.priority < current.left.priority
      ) {
        target = current.left;
      }
      if (
        current.right !== null &&
        current.priority < current.right.priority &&
        (target === null || target.priority < current.right.priority)
      ) {
        target = current.right;
      }
      if (target === null) { break; }
      this._swap(current, target);
    }
  }

  _traverse(position) {
    const digits = Math.floor(Math.log2(position)) + 1;
    const flags = (position - 1) - (Math.pow(2, digits - 1) - 1);
    let node = this.tree;
    // Traverse using the binary representation of the position
    for (let pos = digits - 2; pos >= 0; pos -= 1) {
      const direction = flags & (1 << pos);
      if (pos === 0) {
        return { direction, node };
      } else {
        if (direction === 0) {
          node = node.left;
        } else {
          node = node.right;
        }
      }
    }
  }

  _swap(a, b) {
    // Save references
    const aLeft = a.left;
    const aRight = a.right;
    const aParent = a.parent;
    const bLeft = b.left;
    const bRight = b.right;
    const bParent = b.parent;

    // Set a values
    // 1. Fix references of nodes adjacent to b
    if (bParent === null) {
      this.tree = a;
    } else if (bParent !== a && bParent.left === b) {
      bParent.left = a;
    } else if (bParent !== a && bParent.right === b) {
      bParent.right = a;
    }
    if (bLeft !== a && bLeft !== null) { bLeft.parent = a; }
    if (bRight !== a && bRight !== null) { bRight.parent = a; }
    // 2. Set references of a
    a.parent = bParent !== a ? bParent : b;
    a.left = bLeft !== a ? bLeft : b;
    a.right = bRight !== a ? bRight : b;

    // Set b values
    // 1. Fix references of nodes adjacent to a
    if (aParent === null) {
      this.tree = b;
    } else if (aParent !== b && aParent.left === a) {
      aParent.left = b;
    } else if (aParent !== b && aParent.right === a) {
      aParent.right = b;
    }
    if (aLeft !== b && aLeft !== null) { aLeft.parent = b; }
    if (aRight !== b && aRight !== null) { aRight.parent = b; }
    // 2. Set references of b
    b.parent = aParent !== b ? aParent : a;
    b.left = aLeft !== b ? aLeft : a;
    b.right = aRight !== b ? aRight : a;
  }
}

module.exports = PriorityQueue;
