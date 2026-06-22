// MyTube storage reducer. Pure application logic over an injected StorageBackend
// — every mutation reads, transforms and writes the whole StorageData snapshot.
// The backend is injected (constructor) so this is unit-testable with a fake.
// Mutations are serialized through enqueue() (finding R2): each read-modify-write
// starts only after the previous commit, so interleaved messages can't lose
// updates (ROB-8/ROB-9).

import { StorageBackend } from './storage-backend'
import { IconKey } from './category-icon'
import { sanitizeStorageData } from './sanitize-storage'
import { DEFAULT_DATA, Settings, StorageData, UNCATEGORIZED, Video } from './types'

export class MyTubeStore {
  constructor(private readonly backend: StorageBackend) {}

  // Tail of the mutation queue. Failed mutations reject their caller but the
  // chain swallows its own rejection so the next mutation still runs (ROB-9).
  private queueTail: Promise<unknown> = Promise.resolve()

  private enqueue<T>(mutation: () => Promise<T>): Promise<T> {
    const result = this.queueTail.then(mutation)
    this.queueTail = result.catch(() => undefined)
    return result
  }

  async getData(): Promise<StorageData> {
    const stored = await this.backend.read()
    if (!stored) return structuredClone(DEFAULT_DATA)
    // Sync is written by every synced device — never trust the cast. Covers the
    // old defensive defaults (schema growth) plus malformed entries (finding S6).
    return sanitizeStorageData(stored)
  }

  async getBytesInUse(): Promise<number> {
    return this.backend.bytesInUse()
  }

  private async commit(data: StorageData): Promise<StorageData> {
    await this.backend.write(data)
    return data
  }

  async saveVideo(
    video: Omit<Video, 'category' | 'addedAt' | 'watched'>,
    category: string,
  ): Promise<StorageData> {
    return this.enqueue(async () => {
      const data = await this.getData()

      if (!data.categories.some((c) => c.name === category)) {
        data.categories.push({ name: category, emoji: '📁' })
      }

      const existing = data.videos.find((v) => v.id === video.id)
      if (existing) {
        // Re-saving an already-saved video just moves it to the chosen category.
        existing.category = category
      } else {
        data.videos.unshift({ ...video, category, addedAt: Date.now(), watched: false })
      }

      return this.commit(data)
    })
  }

  // Batch import (a whole YouTube playlist). One read-modify-write for the whole
  // list so an N-item playlist is a single commit, not N races (spec IMPORT,
  // D5). Re-importing a known id moves it (keeps addedAt/watched), consistent
  // with saveVideo / SAVE-3 (D6). New rows are prepended in the given order.
  async importVideos(
    videos: Omit<Video, 'category' | 'addedAt' | 'watched'>[],
    category: string,
  ): Promise<StorageData> {
    return this.enqueue(async () => {
      const data = await this.getData()
      if (videos.length === 0) return data // IMPORT-6: nothing to do, no spurious write

      // De-dupe within the payload: first occurrence fixes the order slot, later
      // occurrences win on fields (IMPORT-5). Map preserves first-set order.
      const unique = new Map<string, Omit<Video, 'category' | 'addedAt' | 'watched'>>()
      for (const v of videos) unique.set(v.id, { ...unique.get(v.id), ...v })

      if (!data.categories.some((c) => c.name === category)) {
        data.categories.push({ name: category, emoji: '📁' })
      }

      const byId = new Map(data.videos.map((v) => [v.id, v]))
      const fresh: Video[] = []
      for (const v of unique.values()) {
        const existing = byId.get(v.id)
        if (existing) {
          existing.category = category // move in place; keep addedAt/watched (IMPORT-3)
        } else {
          fresh.push({ ...v, category, addedAt: Date.now(), watched: false })
        }
      }
      data.videos = [...fresh, ...data.videos]
      return this.commit(data)
    })
  }

  async deleteVideo(id: string): Promise<StorageData> {
    return this.enqueue(async () => {
      const data = await this.getData()
      data.videos = data.videos.filter((v) => v.id !== id)
      return this.commit(data)
    })
  }

  async moveVideo(id: string, category: string): Promise<StorageData> {
    return this.enqueue(async () => {
      const data = await this.getData()
      const video = data.videos.find((v) => v.id === id)
      if (video) video.category = category
      return this.commit(data)
    })
  }

  async markWatched(id: string, watched: boolean): Promise<StorageData> {
    return this.enqueue(async () => {
      const data = await this.getData()
      const video = data.videos.find((v) => v.id === id)
      if (video) {
        video.watched = watched
        video.watchedAt = watched ? Date.now() : undefined
      }
      return this.commit(data)
    })
  }

  async addCategory(name: string, emoji: string, icon?: IconKey): Promise<StorageData> {
    return this.enqueue(async () => {
      const data = await this.getData()
      if (!data.categories.some((c) => c.name === name)) {
        data.categories.push({ name, emoji: emoji || '📁', ...(icon ? { icon } : {}) })
      }
      return this.commit(data)
    })
  }

  async updateCategory(
    oldName: string,
    name: string,
    emoji: string,
    icon?: IconKey,
  ): Promise<StorageData> {
    return this.enqueue(async () => {
      const data = await this.getData()
      const category = data.categories.find((c) => c.name === oldName)
      if (category) {
        category.name = name
        category.emoji = emoji
        if (icon) category.icon = icon
      }
      if (oldName !== name) {
        data.videos.forEach((v) => {
          if (v.category === oldName) v.category = name
        })
      }
      return this.commit(data)
    })
  }

  async deleteCategory(name: string, deleteVideos: boolean): Promise<StorageData> {
    return this.enqueue(async () => {
      const data = await this.getData()
      data.categories = data.categories.filter((c) => c.name !== name)

      if (deleteVideos) {
        data.videos = data.videos.filter((v) => v.category !== name)
      } else {
        // Move orphaned videos to "Sem categoria", recreating it if needed.
        if (!data.categories.some((c) => c.name === UNCATEGORIZED)) {
          data.categories.push({ name: UNCATEGORIZED, emoji: '📁' })
        }
        data.videos.forEach((v) => {
          if (v.category === name) v.category = UNCATEGORIZED
        })
      }

      return this.commit(data)
    })
  }

  async reorderCategories(order: string[]): Promise<StorageData> {
    return this.enqueue(async () => {
      const data = await this.getData()
      const byName = new Map(data.categories.map((c) => [c.name, c]))
      const reordered = order
        .map((n) => byName.get(n))
        .filter(Boolean) as StorageData['categories']
      // Keep any categories not present in the incoming order at the end.
      data.categories.forEach((c) => {
        if (!order.includes(c.name)) reordered.push(c)
      })
      data.categories = reordered
      return this.commit(data)
    })
  }

  // Backfills title/channel for already-saved videos in a single write
  // (used after fetching metadata for entries that were scraped incompletely).
  async applyMetadata(
    updates: { id: string; title: string; channelName: string }[],
  ): Promise<StorageData> {
    return this.enqueue(async () => {
      const data = await this.getData()
      const byId = new Map(updates.map((u) => [u.id, u]))
      data.videos.forEach((v) => {
        const u = byId.get(v.id)
        if (u) {
          v.title = u.title
          v.channelName = u.channelName
        }
      })
      return this.commit(data)
    })
  }

  async updateSettings(patch: Partial<Settings>): Promise<StorageData> {
    return this.enqueue(async () => {
      const data = await this.getData()
      data.settings = { ...data.settings, ...patch }
      return this.commit(data)
    })
  }

  async reorderVideos(category: string, order: string[]): Promise<StorageData> {
    return this.enqueue(async () => {
      const data = await this.getData()
      const inCategory = new Map(
        data.videos.filter((v) => v.category === category).map((v) => [v.id, v]),
      )
      const others = data.videos.filter((v) => v.category !== category)
      const reordered = order.map((id) => inCategory.get(id)).filter(Boolean) as Video[]
      // Preserve the rest of the list around the reordered block.
      data.videos = [...reordered, ...others]
      return this.commit(data)
    })
  }
}

export function unwatchedCount(data: StorageData): number {
  return data.videos.filter((v) => !v.watched).length
}
