/**
 * Return the last index in the array that matches the predicate
 */
export function findLastIndex<T>(array: T[], predicate: (value: T) => boolean): number {
  let i = array.length;
  while (i--) {
    if (predicate(array[i])) {
      return i;
    }
  }
  return -1;
}

/**
 * The node for LinkedList below
 */
class Node<T> {
  data: T;
  next: Node<T> | null = null;
  prev: Node<T> | null = null;

  constructor(data: T) {
    this.data = data;
  }
}

/**
 * We want to use this if we only need push/pop/shift method
 * without random access.
 * The shift() method should be cheaper than regular array.
 */
export class LinkedList<T> {
  private _length: number;
  private head: Node<T> | null;
  private tail: Node<T> | null;
  private pointer: Node<T> | null = null;

  constructor() {
    this._length = 0;
    this.head = null;
    this.tail = null;
  }

  get length(): number {
    return this._length;
  }

  push(data: T): void {
    if (this._length === 0) {
      this.tail = this.head = new Node(data);
      this._length++;
      return;
    }

    if (!this.head || !this.tail) {
      // should not happen
      throw Error("No head or tail");
    }

    const newTail = new Node(data);
    this.tail.next = newTail;
    newTail.prev = this.tail;
    this.tail = newTail;
    this._length++;
  }

  unshift(data: T): void {
    if (this._length === 0) {
      this.tail = this.head = new Node(data);
      this._length++;
      return;
    }

    if (!this.head || !this.tail) {
      // should not happen
      throw Error("No head or tail");
    }

    const newHead = new Node(data);
    newHead.next = this.head;
    this.head.prev = newHead;
    this.head = newHead;
    this._length++;
  }

  pop(): T | null {
    const oldTail = this.tail;
    if (!oldTail) return null;
    this._length = Math.max(0, this._length - 1);

    if (this._length === 0) {
      this.head = this.tail = null;
    } else {
      this.tail = oldTail.prev;
      if (this.tail) this.tail.next = null;
      oldTail.prev = oldTail.next = null;
    }

    return oldTail.data;
  }

  shift(): T | null {
    const oldHead = this.head;
    if (!oldHead) return null;
    this._length = Math.max(0, this._length - 1);

    if (this._length === 0) {
      this.head = this.tail = null;
    } else {
      this.head = oldHead.next;
      if (this.head) this.head.prev = null;
      oldHead.prev = oldHead.next = null;
    }

    return oldHead.data;
  }

  first(): T | null {
    return this.head?.data ?? null;
  }

  last(): T | null {
    return this.tail?.data ?? null;
  }

  /**
   * Delete the first item thats search from head
   */
  deleteFirst(item: T): boolean {
    if (item === this.head?.data) {
      this.shift();
      return true;
    }

    let node = this.head;
    while (node) {
      if (node.data === item) {
        if (node === this.tail) this.tail = node.prev;
        if (node.prev) node.prev.next = node.next;
        if (node.next) node.next.prev = node.prev;
        node.prev = node.next = null;
        this._length--;
        return true;
      }
      node = node.next;
    }

    return false;
  }

  /**
   * Delete the first item search from tail.
   */
  deleteLast(item: T): boolean {
    if (item === this.tail?.data) {
      this.pop();
      return true;
    }

    let node = this.tail;
    while (node) {
      if (node.data === item) {
        if (node === this.head) this.head = node.next;
        if (node.prev) node.prev.next = node.next;
        if (node.next) node.next.prev = node.prev;
        node.prev = node.next = null;
        this._length--;
        return true;
      }
      node = node.prev;
    }

    return false;
  }

  next(): IteratorResult<T> {
    if (!this.pointer) {
      return {done: true, value: undefined};
    }
    const value = this.pointer.data;
    this.pointer = this.pointer.next;
    return {done: false, value};
  }

  [Symbol.iterator](): IterableIterator<T> {
    this.pointer = this.head;
    return this;
  }

  values(): IterableIterator<T> {
    this.pointer = this.head;
    return this;
  }

  clear(): void {
    this.head = this.tail = null;
    this._length = 0;
  }

  toArray(): T[] {
    let node = this.head;
    if (!node) return [];

    const arr: T[] = [];
    while (node) {
      arr.push(node.data);
      node = node.next;
    }

    return arr;
  }

  map<U>(fn: (t: T) => U): U[] {
    let node = this.head;
    if (!node) return [];

    const arr: U[] = [];
    while (node) {
      arr.push(fn(node.data));
      node = node.next;
    }

    return arr;
  }
}
