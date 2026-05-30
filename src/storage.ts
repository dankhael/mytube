// MyTube storage reducer. Pure application logic over an injected StorageBackend
// — every mutation reads, transforms and writes the whole StorageData snapshot.
// The backend is injected (constructor) so this is unit-testable with a fake.

import { StorageBackend } from './storage-backend'
import { DEFAULT_DATA, StorageData, UNCATEGORIZED, Video } from './types'

export class MyTubeStore {
  constructor(private readonly backend: StorageBackend) {}

  async getData(): Promise<StorageData> {
    const stored = await this.backend.read()
    if (!stored) return structuredClone(DEFAULT_DATA)
    // Defensive defaults in case the schema grew between versions.
    return {
      categories: stored.categories?.length
        ? stored.categories
        : structuredClone(DEFAULT_DATA.categories),
      videos: stored.videos ?? [],
    }
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
  }

  async deleteVideo(id: string): Promise<StorageData> {
    const data = await this.getData()
    data.videos = data.videos.filter((v) => v.id !== id)
    return this.commit(data)
  }

  async moveVideo(id: string, category: string): Promise<StorageData> {
    const data = await this.getData()
    const video = data.videos.find((v) => v.id === id)
    if (video) video.category = category
    return this.commit(data)
  }

  async markWatched(id: string, watched: boolean): Promise<StorageData> {
    const data = await this.getData()
    const video = data.videos.find((v) => v.id === id)
    if (video) {
      video.watched = watched
      video.watchedAt = watched ? Date.now() : undefined
    }
    return this.commit(data)
  }

  async addCategory(name: string, emoji: string): Promise<StorageData> {
    const data = await this.getData()
    if (!data.categories.some((c) => c.name === name)) {
      data.categories.push({ name, emoji: emoji || '📁' })
    }
    return this.commit(data)
  }

  async updateCategory(oldName: string, name: string, emoji: string): Promise<StorageData> {
    const data = await this.getData()
    const category = data.categories.find((c) => c.name === oldName)
    if (category) {
      category.name = name
      category.emoji = emoji
    }
    if (oldName !== name) {
      data.videos.forEach((v) => {
        if (v.category === oldName) v.category = name
      })
    }
    return this.commit(data)
  }

  async deleteCategory(name: string, deleteVideos: boolean): Promise<StorageData> {
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
  }

  async reorderCategories(order: string[]): Promise<StorageData> {
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
  }

  async reorderVideos(category: string, order: string[]): Promise<StorageData> {
    const data = await this.getData()
    const inCategory = new Map(
      data.videos.filter((v) => v.category === category).map((v) => [v.id, v]),
    )
    const others = data.videos.filter((v) => v.category !== category)
    const reordered = order.map((id) => inCategory.get(id)).filter(Boolean) as Video[]
    // Preserve the rest of the list around the reordered block.
    data.videos = [...reordered, ...others]
    return this.commit(data)
  }
}

export function unwatchedCount(data: StorageData): number {
  return data.videos.filter((v) => !v.watched).length
}
