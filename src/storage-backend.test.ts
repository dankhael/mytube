// Executable spec for specs/storage-robustness.spec.md (ROB-12..ROB-17).
// The sharding lives below the StorageBackend interface, so it is tested through
// SyncStorageBackend over an injected FakeSyncArea that enforces the 8,192-byte
// per-item quota (finding R1). The reducer and its tests never see the seam.

import { describe, expect, it } from 'vitest'
import { SYNC_STORAGE_LIMITS } from './storage-limits'
import { FakeSyncArea, RemoveFailingSyncArea, SyncOp } from '../test/fake-sync-area'
import { nearQuotaItems } from '../test/near-quota-library'
import { SyncStorageBackend, LEGACY_KEY, META_KEY } from './storage-backend'
import { DEFAULT_SETTINGS, StorageData, Video } from './types'
import { MyTubeStore } from './storage'
import { clampText } from './validate-message'

function video(id: string): Video {
  return {
    id,
    title: `Título do vídeo ${id} com algum texto para encher os bytes`,
    thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    channelName: `Canal ${id}`,
    category: 'A',
    addedAt: 1_700_000_000_000,
    watched: false,
  }
}

function library(count: number): StorageData {
  return {
    categories: [{ name: 'A', emoji: '📁', icon: 'book' }],
    videos: Array.from({ length: count }, (_, i) => video(`vid${String(i).padStart(7, '0')}`)),
    settings: { ...DEFAULT_SETTINGS },
  }
}

function firstIndexOf(ops: SyncOp[], match: (op: SyncOp) => boolean): number {
  return ops.findIndex(match)
}

describe('storage-robustness.spec — sharded backend', () => {
  it('ARCH-3: missing declared chunks block reads and mutations without writes', async () => {
    const area = new FakeSyncArea()
    const backend = new SyncStorageBackend(area)
    await backend.write(library(40))
    await area.remove(['mytube:videos:0'])
    const before = area.ops.length
    await expect(backend.read()).rejects.toThrow(/chunk/i)
    await expect(new MyTubeStore(backend).deleteVideo('vid0000000')).rejects.toThrow(/chunk/i)
    expect(area.ops.slice(before).every((op) => op.method === 'get')).toBe(true)
  })

  it('ARCH-3: malformed metadata and chunks never fall back to an empty library', async () => {
    const data = library(2)
    const meta = { generation: 1, chunkCount: 1, categories: data.categories, settings: data.settings }
    for (const initial of [
      { [META_KEY]: { ...meta, chunkCount: -1 } },
      { [META_KEY]: { ...meta, chunkCount: 1.5 } },
      { [META_KEY]: { ...meta, chunkHashes: [] }, 'mytube:videos:0': { videos: data.videos } },
      { [META_KEY]: meta, 'mytube:videos:0': { videos: null } },
      { 'mytube:videos:0': { videos: data.videos } },
    ]) {
      const area = new FakeSyncArea(initial)
      const backend = new SyncStorageBackend(area)
      await expect(backend.read()).rejects.toThrow(/sync|chunk/i)
      await expect(backend.write(data)).rejects.toThrow(/sync|chunk/i)
      expect(area.ops.every((op) => op.method === 'get')).toBe(true)
    }
  })

  it('ARCH-6: a failed legacy migration retains the original snapshot', async () => {
    const legacy = library(2)
    const area = new FakeSyncArea({ [LEGACY_KEY]: legacy, foreign: 'x'.repeat(9_000) })
    await expect(new SyncStorageBackend(area).read()).rejects.toThrow(/quota/i)
    expect(area.peek(LEGACY_KEY)).toEqual(legacy)
    expect(area.ops.every((op) => op.method === 'get')).toBe(true)
  })

  it('ARCH-4: detects mixed snapshots and recovers when matching chunks arrive', async () => {
    const area = new FakeSyncArea()
    const backend = new SyncStorageBackend(area)
    await backend.write(library(40))
    const oldChunk = structuredClone(area.peek('mytube:videos:0'))
    const next = library(40)
    next.videos[0].watched = true
    await backend.write(next)
    const newChunk = structuredClone(area.peek('mytube:videos:0'))
    await area.set({ 'mytube:videos:0': oldChunk })
    await expect(backend.read()).rejects.toThrow(/chunk/i)
    await area.set({ 'mytube:videos:0': newChunk })
    expect(await backend.read()).toEqual(next)
  })

  it('ARCH-5: legacy shards gain fingerprints without changing videos', async () => {
    const data = library(2)
    const area = new FakeSyncArea({
      [META_KEY]: { generation: 1, chunkCount: 1, categories: data.categories, settings: data.settings },
      'mytube:videos:0': { videos: data.videos },
    })
    const backend = new SyncStorageBackend(area)
    expect(await backend.read()).toEqual(data)
    await backend.write(data)
    expect(area.peek(META_KEY)).toHaveProperty('chunkHashes')
    expect(await backend.read()).toEqual(data)
    expect(area.setKeysWithPrefix('mytube:videos:')).toEqual([])
  })

  it('ARCH-6: oversized metadata and total usage fail before any mutation', async () => {
    for (const data of [library(500), { ...library(2), categories: [{ name: 'x'.repeat(9000), emoji: 'A' }] }]) {
      const area = new FakeSyncArea()
      const backend = new SyncStorageBackend(area)
      await backend.write(library(1))
      const before = area.ops.length
      await expect(backend.write(data)).rejects.toThrow(/quota/i)
      expect(area.ops.slice(before).every((op) => op.method === 'get')).toBe(true)
      expect(await backend.read()).toEqual(library(1))
    }
  })
  it('ROB-12: a library larger than 8 KB round-trips with no key over quota', async () => {
    const area = new FakeSyncArea()
    const backend = new SyncStorageBackend(area)
    const data = library(80)
    // Sanity: this library really does exceed a single 8 KB item.
    expect(new TextEncoder().encode(JSON.stringify(data)).length).toBeGreaterThan(SYNC_STORAGE_LIMITS.perItemBytes)

    await backend.write(data)

    expect(await backend.read()).toEqual(data)
    for (const key of area.storedKeys()) {
      const bytes = new TextEncoder().encode(key + JSON.stringify(area.peek(key))).length
      expect(bytes, `key ${key} over quota`).toBeLessThanOrEqual(SYNC_STORAGE_LIMITS.perItemBytes)
    }
    expect(area.storedKeys().length).toBeGreaterThan(2) // meta + multiple chunks
  })

  it('ROB-13: legacy single-key data migrates (shards set before legacy remove)', async () => {
    const data = library(3)
    const area = new FakeSyncArea({ [LEGACY_KEY]: data })
    const backend = new SyncStorageBackend(area)

    expect(await backend.read()).toEqual(data)

    const firstShardSet = firstIndexOf(
      area.ops,
      (op) => op.method === 'set' && op.keys.includes(META_KEY),
    )
    const legacyRemove = firstIndexOf(
      area.ops,
      (op) => op.method === 'remove' && op.keys.includes(LEGACY_KEY),
    )
    expect(firstShardSet).toBeGreaterThanOrEqual(0)
    expect(legacyRemove).toBeGreaterThan(firstShardSet)
    expect(area.storedKeys()).not.toContain(LEGACY_KEY)
    expect(await backend.read()).toEqual(data) // next read assembles from shards
  })

  it('ROB-14: interrupted migration prefers shards and retries the legacy removal', async () => {
    const data = library(3)
    const area = new FakeSyncArea()
    const backend = new SyncStorageBackend(area)
    await backend.write(data) // produces the sharded layout (meta + chunks)
    // Simulate a crash that left the old legacy key behind alongside the shards.
    await area.set({ [LEGACY_KEY]: library(1) })

    const read = await backend.read()

    expect(read).toEqual(data) // sharded data wins, not the stale legacy snapshot
    expect(area.storedKeys()).not.toContain(LEGACY_KEY) // removal retried
  })

  it('ROB-15: writing an identical snapshot re-sets no chunk key', async () => {
    const area = new FakeSyncArea()
    const backend = new SyncStorageBackend(area)
    const data = library(40)
    await backend.write(data)
    const before = area.ops.length

    await backend.write(structuredClone(data))

    const chunkSets = area
      .setKeysWithPrefix('mytube:videos:')
      .filter((_, i) => i >= 0) // all chunk sets across the whole run
    // No chunk set happened in the *second* write.
    const secondRunOps = area.ops.slice(before)
    const chunkSetInSecond = secondRunOps.some(
      (op) => op.method === 'set' && op.keys.some((k) => k.startsWith('mytube:videos:')),
    )
    expect(chunkSetInSecond).toBe(false)
    expect(chunkSets.length).toBeGreaterThan(0) // the first write did set chunks
  })

  it('ROB-16: a stray chunk beyond chunkCount is ignored and not rewritten on read', async () => {
    const area = new FakeSyncArea()
    const backend = new SyncStorageBackend(area)
    const data = library(40)
    await backend.write(data)
    // Inject a stray chunk at an index beyond what meta declares.
    const meta = area.peek(META_KEY) as { chunkCount: number }
    await area.set({ [`mytube:videos:${meta.chunkCount}`]: { videos: [video('strayvideo0')] } })
    const opsBefore = area.ops.length

    const read = await backend.read()

    expect(read).toEqual(data) // stray video not included
    const wroteDuringRead = area.ops
      .slice(opsBefore)
      .some((op) => op.method === 'set' || op.method === 'remove')
    expect(wroteDuringRead).toBe(false)
  })

  it('ROB-17: shrinking the library removes now-stale chunk keys in the same write', async () => {
    const area = new FakeSyncArea()
    const backend = new SyncStorageBackend(area)
    await backend.write(library(80))
    const chunkKeysAfterLarge = area.storedKeys().filter((k) => k.startsWith('mytube:videos:'))

    await backend.write(library(2))

    const chunkKeysAfterSmall = area.storedKeys().filter((k) => k.startsWith('mytube:videos:'))
    expect(chunkKeysAfterSmall.length).toBeLessThan(chunkKeysAfterLarge.length)
    expect(await backend.read()).toEqual(library(2))
  })
})

describe('text that storage rewrites (lone surrogates)', () => {
  const saved = (title: string) => ({ id: 'aaaaaaaaaaa', title, thumbnail: 't', channelName: 'C' })

  async function saveThenReopen(title: string): Promise<MyTubeStore> {
    const area = new FakeSyncArea()
    await new MyTubeStore(new SyncStorageBackend(area)).saveVideo(saved(title), 'A')
    return new MyTubeStore(new SyncStorageBackend(area))
  }

  it('regression: a saved lone surrogate leaves the library readable and editable', async () => {
    const store = await saveThenReopen('bad \ud83d end')
    expect((await store.getData()).videos[0].title).toBe('bad \ufffd end')
    const after = await store.deleteVideo('aaaaaaaaaaa')
    expect(after.videos).toEqual([])
  })

  it('regression: a title clamped through an emoji at the 300 limit stays readable', async () => {
    const store = await saveThenReopen(clampText(`${'x'.repeat(299)}😀`))
    const { videos } = await store.getData()
    expect(videos[0].title).toBe(`${'x'.repeat(299)}\ufffd`)
  })

  it('regression: a lone surrogate in a category name stays readable', async () => {
    const area = new FakeSyncArea()
    await new MyTubeStore(new SyncStorageBackend(area)).saveVideo(saved('T'), 'cat \ud83d')
    const { categories, videos } = await new MyTubeStore(new SyncStorageBackend(area)).getData()
    expect(categories.map((c) => c.name)).toContain('cat \ufffd')
    expect(videos[0].category).toBe('cat \ufffd')
  })

  it('keeps valid emoji byte-for-byte', async () => {
    const store = await saveThenReopen('ok 😀 título')
    expect((await store.getData()).videos[0].title).toBe('ok 😀 título')
  })
})

describe('sync-quota-headroom.spec — first fingerprints near the quota', () => {
  const NEAR_FULL_VIDEOS = 358

  async function readSnapshot(backend: SyncStorageBackend): Promise<StorageData> {
    const data = await backend.read()
    if (!data) throw new Error('Expected a stored library, got nothing')
    return data
  }

  function withoutFirst(data: StorageData, count = 1): StorageData {
    return { ...data, videos: data.videos.slice(count) }
  }

  function setOrRemoveOps(area: FakeSyncArea, after: number): SyncOp[] {
    return area.ops.slice(after).filter((op) => op.method !== 'get')
  }

  it('HEADROOM-1: a delete that only fits without hashes succeeds without them', async () => {
    const area = new FakeSyncArea(nearQuotaItems(NEAR_FULL_VIDEOS, 950))
    const backend = new SyncStorageBackend(area)
    const next = withoutFirst(await readSnapshot(backend))

    await backend.write(next)

    expect(await backend.read()).toEqual(next)
    expect(area.peek(META_KEY)).not.toHaveProperty('chunkHashes')
  })

  it('HEADROOM-2: hashes are added by the first later write that fits them', async () => {
    const area = new FakeSyncArea(nearQuotaItems(NEAR_FULL_VIDEOS, 950))
    const backend = new SyncStorageBackend(area)
    await backend.write(withoutFirst(await readSnapshot(backend)))
    const roomy = withoutFirst(await readSnapshot(backend), 30)

    await backend.write(roomy)

    const meta = area.peek(META_KEY) as { chunkCount: number; chunkHashes?: string[] }
    expect(meta.chunkHashes).toHaveLength(meta.chunkCount)
    expect(await backend.read()).toEqual(roomy)
  })

  it('HEADROOM-3: a fingerprinted library is rejected rather than written without hashes', async () => {
    const area = new FakeSyncArea(nearQuotaItems(NEAR_FULL_VIDEOS, 1300))
    const backend = new SyncStorageBackend(area)
    await backend.write(withoutFirst(await readSnapshot(backend)))
    expect(area.peek(META_KEY)).toHaveProperty('chunkHashes')
    const before = await readSnapshot(backend)
    const opsBefore = area.ops.length
    const grown = { ...before, videos: [...before.videos, { ...video('grownVideo1'), title: 'x'.repeat(300) }] }

    await expect(backend.write(grown)).rejects.toThrow(/quota/i)

    expect(setOrRemoveOps(area, opsBefore)).toEqual([])
    expect(area.peek(META_KEY)).toHaveProperty('chunkHashes')
    expect(await backend.read()).toEqual(before)
  })

  it('HEADROOM-4: a write over the quota even without hashes changes nothing', async () => {
    const area = new FakeSyncArea(nearQuotaItems(NEAR_FULL_VIDEOS, 100))
    const backend = new SyncStorageBackend(area)
    const before = await readSnapshot(backend)
    const opsBefore = area.ops.length
    const extra = Array.from({ length: 5 }, (_, index) => video(`extraVideo${index}`))

    await expect(backend.write({ ...before, videos: [...before.videos, ...extra] })).rejects.toThrow(/quota/i)

    expect(setOrRemoveOps(area, opsBefore)).toEqual([])
    expect(await backend.read()).toEqual(before)
  })

  it('HEADROOM-5: a committed write succeeds when stale cleanup fails, and the next write retries it', async () => {
    const area = new RemoveFailingSyncArea()
    area.failRemoves = false
    const backend = new SyncStorageBackend(area)
    await backend.write(library(80))
    area.failRemoves = true

    await expect(backend.write(library(1))).resolves.toBeUndefined()

    expect(await backend.read()).toEqual(library(1))
    expect(area.storedKeys()).toContain('mytube:videos:1')
    area.failRemoves = false
    await backend.write(library(1))
    expect(area.storedKeys()).toEqual([META_KEY, 'mytube:videos:0'])
  })

  // A cleanup that failed, leaving chunks outside the committed snapshot, and a
  // next write that only fits once those are gone.
  async function leftoverChunksBlockingAWrite() {
    const area = new RemoveFailingSyncArea(nearQuotaItems(NEAR_FULL_VIDEOS, 950))
    const backend = new SyncStorageBackend(area)
    const full = await readSnapshot(backend)
    await backend.write({ ...full, videos: full.videos.slice(0, 200) })
    const committed = await readSnapshot(backend)
    const leftovers = area.storedKeys().filter((key) => {
      const { chunkCount } = area.peek(META_KEY) as { chunkCount: number }
      return key !== META_KEY && Number(key.split(':').pop()) >= chunkCount
    })
    expect(leftovers.length).toBeGreaterThan(0)
    // Metadata grows, not chunks: a write that adds chunks overwrites the leftovers
    // instead, and the slack in the last chunk absorbs most video edits.
    const categories = Array.from({ length: 40 }, (_, index) => ({ name: `${'c'.repeat(100)}${index}`, emoji: '📁' }))
    return { area, backend, full, committed, leftovers, next: { ...committed, categories } }
  }

  it('HEADROOM-5: leftovers that would keep the next write over the quota are removed first', async () => {
    const { area, backend, next, leftovers } = await leftoverChunksBlockingAWrite()
    area.failRemoves = false
    const opsBefore = area.ops.length

    await backend.write(next)

    expect(await backend.read()).toEqual(next)
    const { chunkCount } = area.peek(META_KEY) as { chunkCount: number }
    expect(area.storedKeys()).toHaveLength(chunkCount + 1)
    const [first, second] = setOrRemoveOps(area, opsBefore)
    expect(first).toEqual({ method: 'remove', keys: leftovers })
    expect(second.method).toBe('set')
  })

  it('HEADROOM-5: if those leftovers still cannot go, the write fails and the snapshot stays', async () => {
    const { area, backend, next, committed } = await leftoverChunksBlockingAWrite()
    const opsBefore = area.ops.length

    await expect(backend.write(next)).rejects.toThrow(/remove failure/i)

    expect(setOrRemoveOps(area, opsBefore)).toEqual([])
    expect(await backend.read()).toEqual(committed)
  })

  it('HEADROOM-5: a write too big even without leftovers removes nothing', async () => {
    const { area, backend, full, committed, leftovers } = await leftoverChunksBlockingAWrite()
    area.failRemoves = false
    const opsBefore = area.ops.length
    const extra = Array.from({ length: 30 }, (_, index) => video(`extraVideo${index}`))

    await expect(backend.write({ ...full, videos: [...full.videos, ...extra] })).rejects.toThrow(/quota/i)

    expect(setOrRemoveOps(area, opsBefore)).toEqual([])
    expect(area.storedKeys()).toEqual(expect.arrayContaining(leftovers))
    expect(await backend.read()).toEqual(committed)
  })

  it('HEADROOM-5: chunks of the committed snapshot are never removed before the set', async () => {
    const area = new FakeSyncArea()
    const backend = new SyncStorageBackend(area)
    await backend.write(library(80))
    const opsBefore = area.ops.length

    await backend.write(library(1))

    const ops = setOrRemoveOps(area, opsBefore)
    expect(ops.map((op) => op.method)).toEqual(['set', 'remove'])
  })
})
