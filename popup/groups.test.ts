// Pure grouping specs for the popup (Node). See specs/popup-categories.spec.md.

import { describe, expect, it } from 'vitest'
import { VIDEO_CAP, groupVideosByCategory, unwatchedLabel, watchUrl } from './groups'
import { Category, DEFAULT_SETTINGS, StorageData, Video } from '../src/types'

function vid(id: string, category: string): Video {
  return { id, title: id, thumbnail: 't', channelName: 'C', category, addedAt: 1, watched: false }
}

function data(categories: Category[], videos: Video[]): StorageData {
  return { categories, videos, settings: { ...DEFAULT_SETTINGS } }
}

describe('popup-categories.spec (grouping)', () => {
  it('GROUP-1: returns categories in stored order, each with its videos', () => {
    const d = data(
      [
        { name: 'A', emoji: '📁' },
        { name: 'B', emoji: '📁' },
      ],
      [vid('x', 'A'), vid('z', 'B'), vid('y', 'A')],
    )
    const groups = groupVideosByCategory(d)
    expect(groups.map((g) => g.category.name)).toEqual(['A', 'B'])
    expect(groups[0].videos.map((v) => v.id)).toEqual(['x', 'y'])
    expect(groups[1].videos.map((v) => v.id)).toEqual(['z'])
  })

  it('GROUP-2: empty categories are kept (for the placeholder)', () => {
    const groups = groupVideosByCategory(data([{ name: 'Vazia', emoji: '📁' }], []))
    expect(groups).toHaveLength(1)
    expect(groups[0].videos).toEqual([])
  })

  it('GROUP-3: watchUrl builds the canonical watch link', () => {
    expect(watchUrl('abc')).toBe('https://www.youtube.com/watch?v=abc')
    expect(VIDEO_CAP).toBe(10)
  })

  it('PUI-1: unwatchedLabel counts only unwatched videos', () => {
    const d = data(
      [{ name: 'A', emoji: '📁' }],
      [vid('a', 'A'), { ...vid('b', 'A'), watched: true }, vid('c', 'A')],
    )
    expect(unwatchedLabel(d, 'en')).toBe('2 unwatched')
  })
})
