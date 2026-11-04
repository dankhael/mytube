// Thin interface over the raw key-value store, so the reducer in storage.ts can
// be unit-tested against an in-memory fake instead of the real chrome.storage.
// (CLAUDE.md: "Wrap third-party libs behind a thin interface owned by this project.")

import { StorageData } from './types'
import { browserPlatform } from './browser-platform'
import { SYNC_STORAGE_LIMITS } from './storage-limits'
import { canonicalJson, chunkDigest, checkSyncQuota, storedForm, syncQuotaViolation } from './sync-integrity'

export interface StorageBackend {
  // Returns undefined when nothing has been persisted yet.
  read(): Promise<StorageData | undefined>
  write(data: StorageData): Promise<void>
  bytesInUse(): Promise<number>
}

// The home banner measures total usage for the sharded layout. Per-item limits
// still apply to each chunk and metadata and are checked before writes.
export interface SyncQuotaLimits {
  totalBytes: number
  perItemBytes?: number
}

export const SYNC_QUOTA_LIMITS: SyncQuotaLimits = {
  totalBytes: SYNC_STORAGE_LIMITS.totalBytes,
}

// The raw key-value seam under the Chrome backend (finding R1): exactly the
// surface of chrome.storage.sync the sharding needs, so the layout is testable
// against an in-memory FakeSyncArea with a per-item quota. `get(null)` returns
// every stored key (chrome's contract).
export interface SyncArea {
  get(keys: string[] | null): Promise<Record<string, unknown>>
  set(items: Record<string, unknown>): Promise<void>
  remove(keys: string[]): Promise<void>
  getBytesInUse(keys: string[] | null): Promise<number>
}

export class BrowserSyncArea implements SyncArea {
  get(keys: string[] | null): Promise<Record<string, unknown>> {
    return browserPlatform().sync.get(keys)
  }
  set(items: Record<string, unknown>): Promise<void> {
    return browserPlatform().sync.set(items)
  }
  remove(keys: string[]): Promise<void> {
    return browserPlatform().sync.remove(keys)
  }
  getBytesInUse(keys: string[] | null): Promise<number> {
    return browserPlatform().sync.getBytesInUse(keys)
  }
}

export const LEGACY_KEY = 'mytube'
export const META_KEY = 'mytube:meta'
export const CHUNK_PREFIX = 'mytube:videos:'

// Target serialized size per video chunk. Comfortably under the 8,192-byte
// per-item quota so re-serialization variance can't push a chunk over (R1).
const CHUNK_TARGET_BYTES = 6_000

export function isMyTubeKey(key: string): boolean {
  return key === LEGACY_KEY || key === META_KEY || key.startsWith(CHUNK_PREFIX)
}

export interface ShardedMeta {
  generation: number
  chunkCount: number
  chunkHashes?: string[]
  categories: StorageData['categories']
  settings: StorageData['settings']
}

/** Storage key of one chunk. @example chunkKey(2) // 'mytube:videos:2' */
export function chunkKey(index: number): string {
  return `${CHUNK_PREFIX}${index}`
}

/** Position of a chunk from its key. @example chunkIndex('mytube:videos:2') // 2 */
export function chunkIndex(key: string): number {
  return Number(key.slice(CHUNK_PREFIX.length))
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length
}

/** Whether a stored value has the metadata shape. @example isShardedMeta(all[META_KEY]) */
export function isShardedMeta(value: unknown): value is ShardedMeta {
  return (
    typeof value === 'object' &&
    value !== null &&
    Number.isSafeInteger((value as ShardedMeta).generation) &&
    (value as ShardedMeta).generation >= 0 &&
    Number.isSafeInteger((value as ShardedMeta).chunkCount) &&
    (value as ShardedMeta).chunkCount >= 0 &&
    // One item is reserved for metadata; remaining items may contain chunks.
    (value as ShardedMeta).chunkCount < SYNC_STORAGE_LIMITS.maxItems
  )
}

// Greedy pack videos into chunks under the target size. A single oversized video
// still gets its own chunk (the length guard guarantees progress), and an empty
// library produces zero chunks — meta is still written.
/** @example chunkVideos(data.videos).length // how many chunk keys this library needs */
export function chunkVideos(videos: StorageData['videos']): StorageData['videos'][] {
  const chunks: StorageData['videos'][] = []
  let current: StorageData['videos'] = []
  let currentBytes = 2 // for the enclosing []
  for (const video of videos) {
    const size = byteLength(JSON.stringify(video)) + 1 // + separator
    if (current.length > 0 && currentBytes + size > CHUNK_TARGET_BYTES) {
      chunks.push(current)
      current = []
      currentBytes = 2
    }
    current.push(video)
    currentBytes += size
  }
  if (current.length > 0) chunks.push(current)
  return chunks
}

// Only chunks that changed go in the write (ROB-15).
function snapshotItems(
  meta: ShardedMeta, chunks: StorageData['videos'][], current: Record<string, unknown>,
): Record<string, unknown> {
  const toSet: Record<string, unknown> = { [META_KEY]: meta }
  chunks.forEach((videos, index) => {
    const key = chunkKey(index)
    const next = { videos }
    if (canonicalJson(current[key]) !== canonicalJson(next)) toSet[key] = next
  })
  return toSet
}

// A shard layout written before fingerprints existed (1.0.x). A library with no
// meta at all isn't one: it has nothing to be near the quota with.
function neverFingerprinted(oldMeta: unknown): boolean {
  return isShardedMeta(oldMeta) && oldMeta.chunkHashes === undefined
}

// The keys of the next snapshot. A library's first hashes cost about 67 bytes per
// chunk, more than a delete frees within ~1.1 KB of the quota, so they wait for a
// write that has room instead of blocking the delete that would make room
// (HEADROOM-1). A library that has hashes never loses them (HEADROOM-3).
async function snapshotToSet(
  stored: StorageData, chunks: StorageData['videos'][], current: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const oldMeta = current[META_KEY]
  const meta: ShardedMeta = {
    generation: isShardedMeta(oldMeta) ? oldMeta.generation + 1 : 1,
    chunkCount: chunks.length,
    categories: stored.categories,
    settings: stored.settings,
  }
  const chunkHashes = await Promise.all(chunks.map((videos) => chunkDigest({ videos })))
  const fingerprinted = snapshotItems({ ...meta, chunkHashes }, chunks, current)
  const fits = syncQuotaViolation({ ...current, ...fingerprinted }) === undefined
  return fits || !neverFingerprinted(oldMeta) ? fingerprinted : snapshotItems(meta, chunks, current)
}

// Chunks outside the committed snapshot: a cleanup that failed (HEADROOM-5) or a
// stray from another device. Reads ignore them (ROB-16), so unlike the chunks the
// snapshot declares, they can go before the set without tearing anything.
function orphanedChunks(current: Record<string, unknown>): string[] {
  const oldMeta = current[META_KEY]
  if (!isShardedMeta(oldMeta)) return []
  return Object.keys(current).filter(
    (key) => key.startsWith(CHUNK_PREFIX) && chunkIndex(key) >= oldMeta.chunkCount,
  )
}

interface WritePlan {
  current: Record<string, unknown>
  toSet: Record<string, unknown>
  orphans: string[]
}

// Orphans only go first when they are what's keeping the write over the quota.
// Otherwise the cleanup after the set takes them, and a rejected write has touched
// nothing (ARCH-6): the caller checks the quota on this plan before removing.
async function planWrite(
  stored: StorageData, chunks: StorageData['videos'][], current: Record<string, unknown>,
): Promise<WritePlan> {
  const toSet = await snapshotToSet(stored, chunks, current)
  const orphans = orphanedChunks(current)
  if (orphans.length === 0 || !syncQuotaViolation({ ...current, ...toSet })) {
    return { current, toSet, orphans: [] }
  }
  const settled = Object.fromEntries(Object.entries(current).filter(([key]) => !orphans.includes(key)))
  return { current: settled, toSet: await snapshotToSet(stored, chunks, settled), orphans }
}

// Persists one StorageData snapshot sharded across many sync keys so the binding
// limit becomes the 102,400-byte total instead of the 8,192-byte per-item quota
// (finding R1). The sharding is invisible above StorageBackend: the reducer and
// every reducer test see a plain read()/write() over one StorageData.
export class SyncStorageBackend implements StorageBackend {
  constructor(private readonly area: SyncArea = new BrowserSyncArea()) {}

  async read(): Promise<StorageData | undefined> {
    const all = await this.area.get(null)
    const meta = all[META_KEY]

    if (isShardedMeta(meta)) {
      const data = await assembleSnapshot(meta, all)
      // Interrupted migration left the legacy key behind — retry its removal,
      // but the sharded layout already won (ROB-14).
      if (all[LEGACY_KEY] !== undefined) await this.area.remove([LEGACY_KEY])
      return data
    }

    if (meta !== undefined || Object.keys(all).some((key) => key.startsWith(CHUNK_PREFIX))) {
      throw new Error(`Invalid sync metadata at ${META_KEY}: expected a complete snapshot`)
    }

    const legacy = all[LEGACY_KEY]
    if (legacy !== undefined) {
      // First read after upgrade: migrate the single legacy key into shards,
      // then remove it — never the reverse, so a crash can't lose data (ROB-13).
      const data = legacy as StorageData
      await this.writeSharded(data, all)
      await this.area.remove([LEGACY_KEY])
      return data
    }

    return undefined
  }

  async write(data: StorageData): Promise<void> {
    const all = await this.area.get(null)
    // A background read may race with incoming remote chunks. Never overwrite
    // an incomplete snapshot merely because an earlier reducer read succeeded.
    if (all[META_KEY] !== undefined) {
      if (!isShardedMeta(all[META_KEY])) throw new Error(`Invalid sync metadata at ${META_KEY}`)
      await assembleSnapshot(all[META_KEY], all)
    } else if (Object.keys(all).some((key) => key.startsWith(CHUNK_PREFIX))) {
      throw new Error(`Missing sync metadata at ${META_KEY}: refusing to overwrite orphan chunks`)
    }
    await this.writeSharded(data, all)
  }

  private async writeSharded(data: StorageData, current: Record<string, unknown>): Promise<void> {
    // Before chunking, hashing and the quota check, so all three see what storage
    // will really hold; every write path (save, import, backfill, migration) lands here.
    const stored = storedForm(data)
    const chunks = chunkVideos(stored.videos)
    const plan = await planWrite(stored, chunks, current)
    // Include stale/legacy keys until removal actually succeeds. A quota error
    // must not partially mutate the snapshot even with a non-atomic backend.
    checkSyncQuota({ ...plan.current, ...plan.toSet })
    if (plan.orphans.length > 0) await this.area.remove(plan.orphans)
    await this.area.set(plan.toSet)
    await this.removeStaleChunks(plan.current, chunks.length)
  }

  // Remove chunk keys left over from a previously larger library (ROB-17). By now
  // the new snapshot is committed and stale chunks are ignored on read (ROB-16), so
  // a failure here isn't a failed write: the next write finds them again and retries,
  // and reporting it would say a delete didn't happen when it did (HEADROOM-5).
  private async removeStaleChunks(current: Record<string, unknown>, chunkCount: number): Promise<void> {
    const stale = Object.keys(current).filter(
      (key) => key.startsWith(CHUNK_PREFIX) && chunkIndex(key) >= chunkCount,
    )
    if (stale.length === 0) return
    try {
      await this.area.remove(stale)
    } catch (error) {
      console.error(JSON.stringify({
        source: 'mytube.storage', task: 'removeStaleChunks', keys: stale,
        error: error instanceof Error ? error.message : String(error),
      }))
    }
  }

  async bytesInUse(): Promise<number> {
    return this.area.getBytesInUse(null)
  }
}

/**
 * Absent hashes are fine (HEADROOM, 1.0.x layouts); present ones must all be digests.
 * @example hasValidChunkHashes({ ...meta, chunkHashes: ['short'] }) // false
 */
export function hasValidChunkHashes(meta: ShardedMeta): boolean {
  const hashes: unknown = meta.chunkHashes
  if (hashes === undefined) return true
  return Array.isArray(hashes) && hashes.length === meta.chunkCount &&
    hashes.every((hash) => typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash))
}

// Assemble exactly the chunks meta declares; a stray chunk beyond chunkCount
// (older generation, torn cross-device sync) is ignored and never rewritten
// during the read (ROB-16).
async function assembleSnapshot(meta: ShardedMeta, all: Record<string, unknown>): Promise<StorageData> {
  if (!hasValidChunkHashes(meta)) {
    throw new Error(`Invalid chunk hashes at ${META_KEY}: expected ${meta.chunkCount} SHA-256 digests`)
  }
  const videos: StorageData['videos'] = []
  for (let index = 0; index < meta.chunkCount; index++) {
    const key = chunkKey(index)
    const chunk = all[key] as { videos?: StorageData['videos'] } | undefined
    if (!chunk || !Array.isArray(chunk.videos)) {
      throw new Error(`Incomplete sync chunk ${key}: expected videos array; retry after synchronization`)
    }
    if (meta.chunkHashes && await chunkDigest({ videos: chunk.videos }) !== meta.chunkHashes[index]) {
      throw new Error(`Inconsistent sync chunk ${key}: fingerprint mismatch; retry after synchronization`)
    }
    videos.push(...chunk.videos)
  }
  return { categories: meta.categories, videos, settings: meta.settings }
}
