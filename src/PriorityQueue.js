// Taken from https://en.wikipedia.org/wiki/Binary_heap
class PriorityQueue {
  constructor() {
    this.tree = null;
    this.map = new Map();
    this.size = 0;
  }

  insert(key, priority) {
    console.log(key, this.tree);
    // Define node
    const node = { key, priority, parent: null, left: null, right: null };
    this.map.set(key, node);
    // Add the element to the bottom level of the heap at the leftmost open space
    if (this.size === 0) {
      this.tree = node;
    } else {
      const digits = Math.floor(Math.log2(this.size + 1)) + 1;
      const flags = this.size - (Math.pow(2, digits - 1) - 1);
      let current = this.tree;
      // Insert using the binary representation of the inserted element
      for (let pos = digits - 2; pos >= 0; pos -= 1) {
        const mark = flags & (1 << pos);
        if (pos === 0) {
          node.parent = current;
          if (mark === 0) {
            current.left = node;
          } else {
            current.right = node;
          }
          current = node;
        } else {
          if (mark === 0) {
            current = current.left;
          } else {
            current = current.right;
          }
        }
      }
      // Compare the added element with its parent; if they are in the correct order, stop.
      // If not, swap the element with its parent and return to the previous step.
      while (current.parent && current.priority > current.parent.priority) {
        // Save references
        const childLeft = current.left;
        const childRight = current.right;
        const parent = current.parent;
        const parentLeft = parent.left;
        const parentRight = parent.right;
        const grandParent = parent.parent;
        // Set child as parent
        current.parent = grandParent;
        if (grandParent === null) {
          this.tree = current;
        } else if (grandParent.left === parent) {
          grandParent.left = current;
        } else if (grandParent.right === parent) {
          grandParent.right = current;
        }
        current.left = parentLeft !== current ? parentLeft : parent;
        current.right = parentRight !== current ? parentRight : parent;
        if (current.left !== null) { current.left.parent = current; }
        if (current.right !== null) { current.right.parent = current; }
        // Set parent as child
        parent.left = childLeft;
        parent.right = childRight;
        if (childLeft !== null) { childLeft.parent = parent; }
        if (childRight !== null) { childRight.parent = parent; }
      }
    }
    this.size += 1;
  }

  // FIXME: implement this
  pop() {
    // this.map.delete(key);
  }

  // FIXME: implement this
  setPriority(key, priority) {
    const node = this.get(key);
    node.priority = priority;
  }

  // FIXME: implement this
  get(key) {
    return this.map.get(key);
  }

  isEmpty() {
    return this.tree === null;
  }
}

module.exports = PriorityQueue;

const instance = new PriorityQueue();
instance.insert(1, 11);
instance.insert(2, 5);
instance.insert(3, 8);
instance.insert(4, 3);
instance.insert(5, 4);

instance.insert(6, 15);

console.log(instance.tree);
