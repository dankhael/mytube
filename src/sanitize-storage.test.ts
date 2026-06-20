// Executable spec for specs/security-hardening.spec.md (SEC-14..SEC-17).
// chrome.storage.sync is written by every synced device — other versions of
// this extension included — so the `as StorageData` cast can never be trusted
// (security review finding S6).

import { describe, expect, it } from 'vitest'
import { IconKey } from './category-icon'
import { DEFAULT_DATA, DEFAULT_SETTINGS, StorageData, Video } from './types'
import { sanitizeStorageData } from './sanitize-storage'
import { DEFAULT_ACCENT } from './theme'

// Key order mirrors what the extension persists (content-script payload spread
// first, then the reducer's category/addedAt/watched) — SEC-14 asserts on it.
function storedVideo(id: string): Video {
  return {
    id,
    title: 'Vídeo real',
    thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    channelName: 'Canal X',
    category: 'Tutoriais',
    addedAt: 1_700_000_000_000,
    watched: false,
  }
}

function wellFormedSnapshot(): StorageData {
  return {
    categories: [{ name: 'Tutoriais', emoji: '🎓', icon: 'book' }],
    videos: [storedVideo('dQw4w9WgXcQ'), { ...storedVideo('aqz-KE-bpKQ'), watched: true, watchedAt: 1_700_000_001_000 }],
    settings: { soundEffects: true, accent: 'mint' },
  }
}

describe('security-hardening.spec — sanitize-storage', () => {
  it('SEC-14: a well-formed snapshot passes through byte-identical', () => {
    const snapshot = wellFormedSnapshot()
    expect(JSON.stringify(sanitizeStorageData(snapshot))).toBe(JSON.stringify(snapshot))
  })

  it('SEC-15: garbage roots yield a valid default-built StorageData without throwing', () => {
    const garbage: unknown[] = [undefined, null, 42, {}, { videos: 'nope' }]
    for (const raw of garbage) {
      const result = sanitizeStorageData(raw)
      expect(result.videos, `videos for root ${JSON.stringify(raw)}`).toEqual([])
      expect(result.categories, `categories for root ${JSON.stringify(raw)}`).toEqual(DEFAULT_DATA.categories)
      expect(result.settings, `settings for root ${JSON.stringify(raw)}`).toEqual(DEFAULT_SETTINGS)
    }
  })

  it('SEC-16: malformed video entries are dropped, valid ones kept in order', () => {
    const first = storedVideo('dQw4w9WgXcQ')
    const second = storedVideo('aqz-KE-bpKQ')
    const snapshot = {
      ...wellFormedSnapshot(),
      videos: [first, null, { title: 'sem id' }, { ...storedVideo('9bZkp7q19f0'), title: 42 }, second],
    }
    expect(sanitizeStorageData(snapshot).videos).toEqual([first, second])
  })

  it('THEME-4: an unknown accent preset falls back to the default on read', () => {
    const snapshot = { ...wellFormedSnapshot(), settings: { soundEffects: true, accent: 'puce' } }
    expect(sanitizeStorageData(snapshot).settings.accent).toBe(DEFAULT_ACCENT)
  })

  it('SEC-17: a category with an unknown icon is kept with the icon unset', () => {
    const snapshot = wellFormedSnapshot()
    snapshot.categories = [{ name: 'Caveiras', emoji: '💀', icon: 'skull' as IconKey }]
    const [category] = sanitizeStorageData(snapshot).categories
    expect(category.name).toBe('Caveiras')
    expect(category.icon).toBeUndefined()
  })
})
