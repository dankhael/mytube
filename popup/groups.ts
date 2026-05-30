// Pure helpers for the popup — kept separate from DOM so they're Node-testable.

import { Category, StorageData, Video } from '../src/types'

// Cap shown per category in the popup; the rest lives on the new-tab home.
export const VIDEO_CAP = 10

export interface CategoryGroup {
  category: Category
  videos: Video[] // all videos in this category, in stored order
}

// Categories in their stored order, each with its videos. Empty categories are
// kept (the popup shows a placeholder for them).
export function groupVideosByCategory(data: StorageData): CategoryGroup[] {
  const byCategory = new Map<string, Video[]>()
  for (const cat of data.categories) byCategory.set(cat.name, [])
  for (const v of data.videos) {
    if (!byCategory.has(v.category)) byCategory.set(v.category, [])
    byCategory.get(v.category)!.push(v)
  }
  return data.categories.map((category) => ({
    category,
    videos: byCategory.get(category.name) ?? [],
  }))
}

export function watchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`
}
