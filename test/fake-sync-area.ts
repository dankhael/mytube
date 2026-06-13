// In-memory SyncArea for tests — a named fake (CLAUDE.md: "Mock external I/O
// with named fake classes"). Enforces chrome.storage.sync's 8,192-byte per-item
// quota so the sharding (finding R1) is provable, and records an operation log
// so tests can assert write/remove ordering and that unchanged chunks are skipped.

import { SyncArea } from '../src/storage-backend'

export const QUOTA_BYTES_PER_ITEM = 8_192

export interface SyncOp {
  method: 'get' | 'set' | 'remove'
  keys: string[]
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length
}

export class FakeSyncArea implements SyncArea {
  private store = new Map<string, unknown>()
  readonly ops: SyncOp[] = []

  constructor(initial: Record<string, unknown> = {}) {
    for (const [key, value] of Object.entries(initial)) this.store.set(key, structuredClone(value))
  }

  async get(keys: string[] | null): Promise<Record<string, unknown>> {
    this.ops.push({ method: 'get', keys: keys ?? ['<all>'] })
    const wanted = keys ?? [...this.store.keys()]
    const out: Record<string, unknown> = {}
    for (const key of wanted) {
      if (this.store.has(key)) out[key] = structuredClone(this.store.get(key))
    }
    return out
  }

  async set(items: Record<string, unknown>): Promise<void> {
    this.ops.push({ method: 'set', keys: Object.keys(items) })
    for (const [key, value] of Object.entries(items)) {
      const bytes = byteLength(key) + byteLength(JSON.stringify(value))
      if (bytes > QUOTA_BYTES_PER_ITEM) {
        throw new Error(`QUOTA_BYTES_PER_ITEM quota exceeded for "${key}": ${bytes} > ${QUOTA_BYTES_PER_ITEM}`)
      }
      this.store.set(key, structuredClone(value))
    }
  }

  async remove(keys: string[]): Promise<void> {
    this.ops.push({ method: 'remove', keys })
    for (const key of keys) this.store.delete(key)
  }

  async getBytesInUse(keys: string[] | null): Promise<number> {
    const wanted = keys ?? [...this.store.keys()]
    let total = 0
    for (const key of wanted) {
      if (this.store.has(key)) total += byteLength(key) + byteLength(JSON.stringify(this.store.get(key)))
    }
    return total
  }

  // ---- test helpers (not part of the SyncArea contract) ----

  storedKeys(): string[] {
    return [...this.store.keys()].sort()
  }

  peek(key: string): unknown {
    return this.store.get(key)
  }

  // Keys touched by `set` ops whose names start with the prefix (ROB-15).
  setKeysWithPrefix(prefix: string): string[] {
    return this.ops
      .filter((op) => op.method === 'set')
      .flatMap((op) => op.keys)
      .filter((key) => key.startsWith(prefix))
  }
}
