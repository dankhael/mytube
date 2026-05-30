// In-memory StorageBackend for tests — a named fake, not an inline stub
// (CLAUDE.md: "Mock external I/O with named fake classes").

import { StorageBackend } from '../src/storage-backend'
import { StorageData } from '../src/types'

export class FakeStorageBackend implements StorageBackend {
  private data?: StorageData

  constructor(initial?: StorageData) {
    this.data = initial ? structuredClone(initial) : undefined
  }

  async read(): Promise<StorageData | undefined> {
    return this.data ? structuredClone(this.data) : undefined
  }

  async write(data: StorageData): Promise<void> {
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
