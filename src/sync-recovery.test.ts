// Executable spec for specs/sync-recovery.spec.md, slice 1 (RECOVER-1, 3, 4).
// Slice 1 must not be able to lose data, so every test also proves nothing wrote.

import { describe, expect, it } from 'vitest'
import { FakeSyncArea } from '../test/fake-sync-area'
import { LEGACY_KEY, META_KEY, SyncStorageBackend } from './storage-backend'
import { exportSyncKeys, previewSyncRecovery } from './sync-recovery'
import { DEFAULT_SETTINGS, StorageData, Video } from './types'

function video(index: number, title = `Video ${index} with enough text to fill the chunk bytes up`): Video {
  const id = `v${String(index).padStart(10, '0')}`
  return {
    id, title, channelName: 'Channel', category: 'A', addedAt: 1_730_000_000_123, watched: false,
    thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
  }
}

function library(count: number): StorageData {
  return {
    categories: [{ name: 'A', emoji: '📁' }],
    videos: Array.from({ length: count }, (_, index) => video(index)),
    settings: { ...DEFAULT_SETTINGS },
  }
}

async function storedLibrary(count: number): Promise<FakeSyncArea> {
  const area = new FakeSyncArea()
  await new SyncStorageBackend(area).write(library(count))
  return area
}

function chunkVideos(area: FakeSyncArea, key: string): Video[] {
  return (area.peek(key) as { videos: Video[] }).videos
}

async function retitleFirstVideo(area: FakeSyncArea, key: string, title: string): Promise<void> {
  const [first, ...rest] = chunkVideos(area, key)
  await area.set({ [key]: { videos: [{ ...first, title }, ...rest] } })
}

function wrote(area: FakeSyncArea, after: number): boolean {
  return area.ops.slice(after).some((op) => op.method !== 'get')
}

describe('exportSyncKeys', () => {
  it('RECOVER-1: returns every MyTube key unaltered and changes nothing', async () => {
    const area = await storedLibrary(100)
    await retitleFirstVideo(area, 'mytube:videos:0', 'tampered')
    await area.set({ [LEGACY_KEY]: { videos: 'not even valid' }, 'someone-else': 1 })
    const ops = area.ops.length

    const exported = await exportSyncKeys(area)

    const expected = area.storedKeys().filter((key) => key !== 'someone-else')
    expect(Object.keys(exported).sort()).toEqual(expected)
    for (const key of expected) expect(exported[key]).toEqual(area.peek(key))
    expect(wrote(area, ops)).toBe(false)
  })

  it('RECOVER-1: keeps the legacy key that a normal read would have removed', async () => {
    const legacy = library(1)
    const area = new FakeSyncArea({ [LEGACY_KEY]: legacy })
    expect(await exportSyncKeys(area)).toEqual({ [LEGACY_KEY]: legacy })
    expect(area.storedKeys()).toEqual([LEGACY_KEY])
  })
})

describe('previewSyncRecovery', () => {
  it('RECOVER-3: reports each chunk state, its videos and the totals, and changes nothing', async () => {
    const area = await storedLibrary(130)
    const [intact, mismatching] = [chunkVideos(area, 'mytube:videos:0'), chunkVideos(area, 'mytube:videos:1')]
    await retitleFirstVideo(area, 'mytube:videos:1', 'tampered')
    await area.set({ 'mytube:videos:2': { videos: 'broken' } })
    await area.remove(['mytube:videos:3'])
    const keys = area.storedKeys()
    const ops = area.ops.length

    const preview = await previewSyncRecovery(area)

    expect(preview.metadata).toBe('valid')
    expect(preview.chunks.slice(0, 4).map(({ key, state, videoCount }) => [key, state, videoCount])).toEqual([
      ['mytube:videos:0', 'intact', intact.length],
      ['mytube:videos:1', 'mismatching', mismatching.length],
      ['mytube:videos:2', 'malformed', 0],
      ['mytube:videos:3', 'missing', 0],
    ])
    const videosIn = (state: string) => preview.chunks.filter((chunk) => chunk.state === state)
      .reduce((sum, chunk) => sum + chunk.videoCount, 0)
    expect(preview.verifiedVideos).toBe(videosIn('intact'))
    expect(preview.unverifiedVideos).toBe(mismatching.length)
    expect(preview.unavailableChunks).toBe(2)
    expect(wrote(area, ops)).toBe(false)
    expect(area.storedKeys()).toEqual(keys)
  })

  it('RECOVER-3: a library a normal read accepts previews as fully intact', async () => {
    const area = await storedLibrary(70)
    const preview = await previewSyncRecovery(area)
    expect(preview).toMatchObject({ verifiedVideos: 70, unverifiedVideos: 0, unavailableChunks: 0 })
  })

  it('RECOVER-3: a library without fingerprints is judged like a normal read judges it', async () => {
    const area = await storedLibrary(70)
    const { chunkHashes: _dropped, ...hashless } = area.peek(META_KEY) as { chunkHashes: string[] }
    await area.set({ [META_KEY]: hashless })
    expect(await previewSyncRecovery(area)).toMatchObject({ verifiedVideos: 70, unverifiedVideos: 0, unavailableChunks: 0 })
  })

  it('RECOVER-3: with no usable metadata, stored chunks are listed but nothing counts as verified', async () => {
    for (const [metadata, broken] of [['invalid', { generation: -1 }], ['missing', undefined]] as const) {
      const area = await storedLibrary(70)
      if (broken) await area.set({ [META_KEY]: broken })
      else await area.remove([META_KEY])
      const preview = await previewSyncRecovery(area)
      expect(preview.metadata).toBe(metadata)
      expect(preview.chunks.map((chunk) => chunk.state)).toEqual(preview.chunks.map(() => 'mismatching'))
      expect(preview.chunks.reduce((sum, chunk) => sum + chunk.videoCount, 0)).toBe(70)
      expect(preview).toMatchObject({ verifiedVideos: 0, unverifiedVideos: 70, unavailableChunks: 0 })
    }
  })

  it('RECOVER-3: hash metadata of the wrong shape counts as invalid, as a normal read treats it', async () => {
    const area = await storedLibrary(70)
    await area.set({ [META_KEY]: { ...(area.peek(META_KEY) as object), chunkHashes: ['short'] } })
    await expect(new SyncStorageBackend(area).read()).rejects.toThrow(/chunk hashes/i)
    expect(await previewSyncRecovery(area)).toMatchObject({ metadata: 'invalid', verifiedVideos: 0, unverifiedVideos: 70 })
  })

  it('RECOVER-4: U+FFFD in a mismatching chunk is flagged, changing no state or total', async () => {
    const area = await storedLibrary(70)
    await retitleFirstVideo(area, 'mytube:videos:0', 'plain')
    const unflagged = await previewSyncRecovery(area)
    await retitleFirstVideo(area, 'mytube:videos:0', 'bad � end')

    const preview = await previewSyncRecovery(area)

    expect(preview.chunks[0]).toMatchObject({ state: 'mismatching', possiblyRewritten: true })
    expect(unflagged.chunks[0]).toMatchObject({ state: 'mismatching', possiblyRewritten: false })
    const totals = ({ verifiedVideos, unverifiedVideos, unavailableChunks }: typeof preview) =>
      [verifiedVideos, unverifiedVideos, unavailableChunks]
    expect(totals(preview)).toEqual(totals(unflagged))
  })

  it('RECOVER-4: U+FFFD in an intact chunk is not flagged', async () => {
    const area = new FakeSyncArea()
    await new SyncStorageBackend(area).write({ ...library(1), videos: [video(0, 'fine � title')] })
    const preview = await previewSyncRecovery(area)
    expect(preview.chunks[0]).toMatchObject({ state: 'intact', possiblyRewritten: false })
  })
})
