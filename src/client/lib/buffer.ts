/**
 * Change Buffer
 *
 * Accumulates visual mutations from the canvas and flushes them
 * to the Mermaid source editor on explicit commit or auto-save interval.
 *
 * Design: instead of continuous bidirectional AST sync, changes are queued
 * here and serialized in a single batch on flush(). This makes two-way sync
 * feasible for all diagram types without requiring perfect round-trip parsing.
 */

export type MutationType =
  | "node:move"
  | "node:add"
  | "node:delete"
  | "node:label"
  | "edge:add"
  | "edge:delete"
  | "edge:label";

export interface Mutation {
  type: MutationType;
  /** Unique id of the affected node or edge */
  targetId: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

export class ChangeBuffer {
  private mutations: Mutation[] = [];
  private listeners: Array<(mutations: Mutation[]) => void> = [];

  push(mutation: Omit<Mutation, "timestamp">): void {
    this.mutations.push({ ...mutation, timestamp: Date.now() });
  }

  /** Flush the buffer and notify listeners. Clears the queue. */
  flush(): Mutation[] {
    const snapshot = [...this.mutations];
    this.mutations = [];
    this.listeners.forEach((l) => l(snapshot));
    return snapshot;
  }

  /** Register a callback that fires whenever the buffer is flushed. */
  onFlush(listener: (mutations: Mutation[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  get size(): number {
    return this.mutations.length;
  }

  get isEmpty(): boolean {
    return this.mutations.length === 0;
  }
}

/** Singleton buffer — one per app session */
export const changeBuffer = new ChangeBuffer();
