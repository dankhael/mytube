// Thin interface over the raw key-value store, so the reducer in storage.ts can
// be unit-tested against an in-memory fake instead of the real chrome.storage.
// (CLAUDE.md: "Wrap third-party libs behind a thin interface owned by this project.")

import { StorageData } from './types'
import { browserPlatform } from './browser-platform'
import { canonicalJson, chunkDigest, checkSyncQuota } from './sync-integrity'

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
  totalBytes: 102_400,
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
const CHUNK_PREFIX = 'mytube:videos:'

// Target serialized size per video chunk. Comfortably under the 8,192-byte
// per-item quota so re-serialization variance can't push a chunk over (R1).
const CHUNK_TARGET_BYTES = 6_000

export function isMyTubeKey(key: string): boolean {
  return key === LEGACY_KEY || key === META_KEY || key.startsWith(CHUNK_PREFIX)
}

interface ShardedMeta {
  generation: number
  chunkCount: number
  chunkHashes?: string[]
  categories: StorageData['categories']
  settings: StorageData['settings']
}

function chunkKey(index: number): string {
  return `${CHUNK_PREFIX}${index}`
}

function chunkIndex(key: string): number {
  return Number(key.slice(CHUNK_PREFIX.length))
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length
}

function isShardedMeta(value: unknown): value is ShardedMeta {
  return (
    typeof value === 'object' &&
    value !== null &&
    Number.isSafeInteger((value as ShardedMeta).generation) &&
    (value as ShardedMeta).generation >= 0 &&
    Number.isSafeInteger((value as ShardedMeta).chunkCount) &&
    (value as ShardedMeta).chunkCount >= 0 && (value as ShardedMeta).chunkCount < 512
  )
}

// Greedy pack videos into chunks under the target size. A single oversized video
// still gets its own chunk (the length guard guarantees progress), and an empty
// library produces zero chunks — meta is still written.
function chunkVideos(videos: StorageData['videos']): StorageData['videos'][] {
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
    const oldMeta = current[META_KEY]
    const generation = isShardedMeta(oldMeta) ? oldMeta.generation + 1 : 1
    const chunks = chunkVideos(data.videos)

    const meta: ShardedMeta = {
      generation,
      chunkCount: chunks.length,
      chunkHashes: await Promise.all(chunks.map((videos) => chunkDigest({ videos }))),
      categories: data.categories,
      settings: data.settings,
    }

    const toSet: Record<string, unknown> = { [META_KEY]: meta }
    chunks.forEach((videos, index) => {
      const key = chunkKey(index)
      const next = { videos }
      // Skip chunks whose serialized content is unchanged (ROB-15).
      if (canonicalJson(current[key]) !== canonicalJson(next)) toSet[key] = next
    })
    // Include stale/legacy keys until removal actually succeeds. A quota error
    // must not partially mutate the snapshot even with a non-atomic backend.
    checkSyncQuota({ ...current, ...toSet })
    await this.area.set(toSet)

    // Remove chunk keys left over from a previously larger library (ROB-17).
    const stale = Object.keys(current).filter(
      (key) => key.startsWith(CHUNK_PREFIX) && chunkIndex(key) >= chunks.length,
    )
    if (stale.length > 0) await this.area.remove(stale)
  }

  async bytesInUse(): Promise<number> {
    return this.area.getBytesInUse(null)
  }
}

// Assemble exactly the chunks meta declares; a stray chunk beyond chunkCount
// (older generation, torn cross-device sync) is ignored and never rewritten
// during the read (ROB-16).
async function assembleSnapshot(meta: ShardedMeta, all: Record<string, unknown>): Promise<StorageData> {
  if (meta.chunkHashes !== undefined && (
    !Array.isArray(meta.chunkHashes) || meta.chunkHashes.length !== meta.chunkCount ||
    !meta.chunkHashes.every((hash) => typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash))
  )) throw new Error(`Invalid chunk hashes at ${META_KEY}: expected ${meta.chunkCount} SHA-256 digests`)
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

// Keep existing test/integration imports compatible while native ownership
// moves to browser-platform; the storage format itself is browser-independent.
export { SyncStorageBackend as ChromeSyncBackend, BrowserSyncArea as ChromeSyncArea }
