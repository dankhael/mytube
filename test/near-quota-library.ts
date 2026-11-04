// A hash-less sharded library at a chosen distance from the sync quota, as a 1.0.x
// install leaves it. Built with the real packing because a hand-made chunk layout
// gave false failures, and written straight to storage because going through
// write() would add the hashes this fixture must not have.

import { chunkVideos, META_KEY } from '../src/storage-backend'
import { SYNC_STORAGE_LIMITS } from '../src/storage-limits'
import { syncItemBytes } from '../src/sync-integrity'
import { DEFAULT_SETTINGS, StorageData, Video } from '../src/types'

const CATEGORY = 'A'

function nearQuotaVideo(index: number, titleLength: number): Video {
  const id = `v${String(index).padStart(10, '0')}`
  return {
    id,
    title: 'x'.repeat(titleLength),
    thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    channelName: `Channel ${index}`,
    category: CATEGORY,
    // Real timestamps on purpose: Chrome counts them longer than JSON shows.
    addedAt: 1_730_000_123_457 + index * 1_009,
    watched: false,
  }
}

/**
 * Bytes these keys take in sync storage; the e2e checks this against real Chrome.
 * @example syncBytes(nearQuotaItems(358, 950)) // at most 101,450
 */
export function syncBytes(items: Record<string, unknown>): number {
  return Object.entries(items).reduce((total, [key, value]) => total + syncItemBytes(key, value), 0)
}

/**
 * The storage keys of a snapshot with no `chunkHashes`.
 * @example new FakeSyncArea(hashlessItems(data))
 */
export function hashlessItems(data: StorageData): Record<string, unknown> {
  const chunks = chunkVideos(data.videos)
  const items: Record<string, unknown> = {
    [META_KEY]: {
      generation: 1, chunkCount: chunks.length,
      categories: data.categories, settings: data.settings,
    },
  }
  chunks.forEach((videos, index) => { items[`mytube:videos:${index}`] = { videos } })
  return items
}

function snapshotWithTitles(titleLengths: number[]): StorageData {
  return {
    categories: [{ name: CATEGORY, emoji: '📁', icon: 'book' }],
    videos: titleLengths.map((length, index) => nearQuotaVideo(index, length)),
    settings: { ...DEFAULT_SETTINGS },
  }
}

function freeBytes(titleLengths: number[]): number {
  return SYNC_STORAGE_LIMITS.totalBytes - syncBytes(hashlessItems(snapshotWithTitles(titleLengths)))
}

/**
 * Storage keys of `videoCount` videos leaving at most `free` bytes of quota.
 * @example const area = new FakeSyncArea(nearQuotaItems(358, 950))
 */
export function nearQuotaItems(videoCount: number, free: number): Record<string, unknown> {
  const spare = freeBytes(Array<number>(videoCount).fill(0)) - free
  const titleLengths = Array<number>(videoCount).fill(Math.floor(spare / videoCount) - 1)
  // One byte at a time, because chunk boundaries move as the titles grow.
  for (let index = 0; freeBytes(titleLengths) > free; index++) titleLengths[index % videoCount]++
  return hashlessItems(snapshotWithTitles(titleLengths))
}
