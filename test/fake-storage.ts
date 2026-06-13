// In-memory StorageBackend for tests — a named fake, not an inline stub
// (CLAUDE.md: "Mock external I/O with named fake classes").

import { StorageBackend } from '../src/storage-backend'
import { StorageData } from '../src/types'

export class FakeStorageBackend implements StorageBackend {
  private data?: StorageData
  private nextWriteError?: Error

  constructor(initial?: StorageData) {
    this.data = initial ? structuredClone(initial) : undefined
  }

  // Failure injection (ROB-3/ROB-9): the next write rejects like a real
  // chrome.storage.sync quota error; the stored snapshot stays untouched.
  failNextWrite(error: Error): void {
    this.nextWriteError = error
  }

  // Race amplifier (ROB-8): a delayed read widens the read-modify-write window
  // so an unserialized store reliably loses one of two interleaved mutations.
  delayReads(ms: number): void {
    this.readDelayMs = ms
  }
  private readDelayMs = 0

  async read(): Promise<StorageData | undefined> {
    // Snapshot at call time, resolve later: like a real async read, the value
    // is determined when the read starts, so two overlapping read-modify-write
    // mutations both observe the same stale state unless the store serializes.
    const snapshot = this.data ? structuredClone(this.data) : undefined
    if (this.readDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.readDelayMs))
    }
    return snapshot
  }

  async write(data: StorageData): Promise<void> {
    if (this.nextWriteError) {
      const error = this.nextWriteError
      this.nextWriteError = undefined
      throw error
    }
    this.data = structuredClone(data)
  }

  async bytesInUse(): Promise<number> {
    return new TextEncoder().encode(JSON.stringify(this.data ?? {})).length
  }

  // Test helper: peek at the persisted snapshot without going through read().
  snapshot(): StorageData | undefined {
    return this.data ? structuredClone(this.data) : undefined
  }
}
