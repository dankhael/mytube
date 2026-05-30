// Thin interface over the raw key-value store, so the reducer in storage.ts can
// be unit-tested against an in-memory fake instead of the real chrome.storage.
// (CLAUDE.md: "Wrap third-party libs behind a thin interface owned by this project.")

import { StorageData } from './types'

export interface StorageBackend {
  // Returns undefined when nothing has been persisted yet.
  read(): Promise<StorageData | undefined>
  write(data: StorageData): Promise<void>
  bytesInUse(): Promise<number>
}

const KEY = 'mytube'

export class ChromeSyncBackend implements StorageBackend {
  constructor(private readonly key: string = KEY) {}

  async read(): Promise<StorageData | undefined> {
    const result = await chrome.storage.sync.get(this.key)
    return result[this.key] as StorageData | undefined
  }

  async write(data: StorageData): Promise<void> {
    await chrome.storage.sync.set({ [this.key]: data })
  }

  async bytesInUse(): Promise<number> {
    return chrome.storage.sync.getBytesInUse(this.key)
  }
}
