// Executable spec for specs/storage-robustness.spec.md (ROB-12..ROB-17).
// The sharding lives below the StorageBackend interface, so it is tested through
// ChromeSyncBackend over an injected FakeSyncArea that enforces the 8,192-byte
// per-item quota (finding R1). The reducer and its tests never see the seam.

import { describe, expect, it } from 'vitest'
import { FakeSyncArea, QUOTA_BYTES_PER_ITEM, SyncOp } from '../test/fake-sync-area'
import { ChromeSyncBackend, LEGACY_KEY, META_KEY } from './storage-backend'
import { DEFAULT_SETTINGS, StorageData, Video } from './types'

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
