// Executable spec for specs/storage-robustness.spec.md (ROB-12..ROB-17).
// The sharding lives below the StorageBackend interface, so it is tested through
// ChromeSyncBackend over an injected FakeSyncArea that enforces the 8,192-byte
// per-item quota (finding R1). The reducer and its tests never see the seam.

import { describe, expect, it } from 'vitest'
import { FakeSyncArea, QUOTA_BYTES_PER_ITEM, SyncOp } from '../test/fake-sync-area'
import { ChromeSyncBackend, LEGACY_KEY, META_KEY } from './storage-backend'
import { DEFAULT_SETTINGS, StorageData, Video } from './types'
import { MyTubeStore } from './storage'

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
    const backend = new ChromeSyncBackend(area)
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
      const backend = new ChromeSyncBackend(area)
      await expect(backend.read()).rejects.toThrow(/sync|chunk/i)
      await expect(backend.write(data)).rejects.toThrow(/sync|chunk/i)
      expect(area.ops.every((op) => op.method === 'get')).toBe(true)
    }
  })

  it('ARCH-6: a failed legacy migration retains the original snapshot', async () => {
    const legacy = library(2)
    const area = new FakeSyncArea({ [LEGACY_KEY]: legacy, foreign: 'x'.repeat(9_000) })
    await expect(new ChromeSyncBackend(area).read()).rejects.toThrow(/quota/i)
    expect(area.peek(LEGACY_KEY)).toEqual(legacy)
    expect(area.ops.every((op) => op.method === 'get')).toBe(true)
  })

  it('ARCH-4: detects mixed snapshots and recovers when matching chunks arrive', async () => {
    const area = new FakeSyncArea()
    const backend = new ChromeSyncBackend(area)
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
    const backend = new ChromeSyncBackend(area)
    expect(await backend.read()).toEqual(data)
    await backend.write(data)
    expect(area.peek(META_KEY)).toHaveProperty('chunkHashes')
    expect(await backend.read()).toEqual(data)
    expect(area.setKeysWithPrefix('mytube:videos:')).toEqual([])
  })

  it('ARCH-6: oversized metadata and total usage fail before any mutation', async () => {
    for (const data of [library(500), { ...library(2), categories: [{ name: 'x'.repeat(9000), emoji: 'A' }] }]) {
      const area = new FakeSyncArea()
      const backend = new ChromeSyncBackend(area)
      await backend.write(library(1))
      const before = area.ops.length
      await expect(backend.write(data)).rejects.toThrow(/quota/i)
      expect(area.ops.slice(before).every((op) => op.method === 'get')).toBe(true)
      expect(await backend.read()).toEqual(library(1))
    }
  })
  it('ROB-12: a library larger than 8 KB round-trips with no key over quota', async () => {
    const area = new FakeSyncArea()
    const backend = new ChromeSyncBackend(area)
    const data = library(80)
    // Sanity: this library really does exceed a single 8 KB item.
    expect(new TextEncoder().encode(JSON.stringify(data)).length).toBeGreaterThan(QUOTA_BYTES_PER_ITEM)

    await backend.write(data)

    expect(await backend.read()).toEqual(data)
    for (const key of area.storedKeys()) {
      const bytes = new TextEncoder().encode(key + JSON.stringify(area.peek(key))).length
      expect(bytes, `key ${key} over quota`).toBeLessThanOrEqual(QUOTA_BYTES_PER_ITEM)
    }
    expect(area.storedKeys().length).toBeGreaterThan(2) // meta + multiple chunks
  })

  it('ROB-13: legacy single-key data migrates (shards set before legacy remove)', async () => {
    const data = library(3)
    const area = new FakeSyncArea({ [LEGACY_KEY]: data })
    const backend = new ChromeSyncBackend(area)

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
    const backend = new ChromeSyncBackend(area)
    await backend.write(data) // produces the sharded layout (meta + chunks)
    // Simulate a crash that left the old legacy key behind alongside the shards.
    await area.set({ [LEGACY_KEY]: library(1) })

    const read = await backend.read()

    expect(read).toEqual(data) // sharded data wins, not the stale legacy snapshot
    expect(area.storedKeys()).not.toContain(LEGACY_KEY) // removal retried
  })

  it('ROB-15: writing an identical snapshot re-sets no chunk key', async () => {
    const area = new FakeSyncArea()
    const backend = new ChromeSyncBackend(area)
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
    const backend = new ChromeSyncBackend(area)
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
    const backend = new ChromeSyncBackend(area)
    await backend.write(library(80))
    const chunkKeysAfterLarge = area.storedKeys().filter((k) => k.startsWith('mytube:videos:'))

    await backend.write(library(2))

    const chunkKeysAfterSmall = area.storedKeys().filter((k) => k.startsWith('mytube:videos:'))
    expect(chunkKeysAfterSmall.length).toBeLessThan(chunkKeysAfterLarge.length)
    expect(await backend.read()).toEqual(library(2))
  })
})
