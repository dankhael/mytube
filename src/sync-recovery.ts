// Read-only tools for a library the fail-closed read refuses (spec sync-recovery,
// slice 1). Everything here goes straight to `area.get` and never through
// SyncStorageBackend.read(): that read is what's failing, and it can also write,
// migrating or removing the legacy key. Nothing in this module may set or remove.

import {
  CHUNK_PREFIX, META_KEY, SyncArea, ShardedMeta,
  chunkIndex, chunkKey, hasValidChunkHashes, isMyTubeKey, isShardedMeta,
} from './storage-backend'
import { chunkDigest } from './sync-integrity'
import { SyncChunkReport, SyncChunkState, SyncRecoveryPreview } from './types'

/**
 * Every MyTube key exactly as storage returned it, legacy `mytube` included.
 * @example JSON.stringify(await exportSyncKeys(area))
 */
export async function exportSyncKeys(area: SyncArea): Promise<Record<string, unknown>> {
  const all = await area.get(null)
  return Object.fromEntries(Object.entries(all).filter(([key]) => isMyTubeKey(key)))
}

function usableMeta(value: unknown): ShardedMeta | undefined {
  return isShardedMeta(value) && hasValidChunkHashes(value) ? value : undefined
}

function declaredChunkKeys(meta: ShardedMeta): string[] {
  return Array.from({ length: meta.chunkCount }, (_, index) => chunkKey(index))
}

// Without usable metadata nothing says which chunks belong, so show what's stored.
function storedChunkKeys(all: Record<string, unknown>): string[] {
  return Object.keys(all).filter((key) => key.startsWith(CHUNK_PREFIX))
    .sort((left, right) => chunkIndex(left) - chunkIndex(right))
}

// Same verdict a normal read reaches. No metadata means nothing to verify against,
// which is never a pass.
async function matchesFingerprint(videos: unknown[], meta: ShardedMeta | undefined, index: number): Promise<boolean> {
  if (!meta) return false
  if (!meta.chunkHashes) return true
  return await chunkDigest({ videos }) === meta.chunkHashes[index]
}

async function reportChunk(
  key: string, stored: unknown, meta: ShardedMeta | undefined, index: number,
): Promise<SyncChunkReport> {
  if (stored === undefined) return { key, state: 'missing', videoCount: 0, possiblyRewritten: false }
  const videos = (stored as { videos?: unknown } | null)?.videos
  if (!Array.isArray(videos)) return { key, state: 'malformed', videoCount: 0, possiblyRewritten: false }
  const videoCount = videos.length
  if (await matchesFingerprint(videos, meta, index)) {
    return { key, state: 'intact', videoCount, possiblyRewritten: false }
  }
  return { key, state: 'mismatching', videoCount, possiblyRewritten: JSON.stringify(videos).includes('�') }
}

function videosInState(chunks: SyncChunkReport[], state: SyncChunkState): number {
  return chunks.filter((chunk) => chunk.state === state).reduce((sum, chunk) => sum + chunk.videoCount, 0)
}

/**
 * What a blocked library still holds. Only intact chunks count as verified; a
 * mismatching one is reported apart, because a hash mismatch is never accepted on
 * its own, but its videos are there and the backup holds them.
 * @example const { verifiedVideos, unverifiedVideos } = await previewSyncRecovery(area)
 */
export async function previewSyncRecovery(area: SyncArea): Promise<SyncRecoveryPreview> {
  const all = await area.get(null)
  const stored = all[META_KEY]
  const meta = usableMeta(stored)
  const keys = meta ? declaredChunkKeys(meta) : storedChunkKeys(all)
  const chunks = await Promise.all(keys.map((key, index) => reportChunk(key, all[key], meta, index)))
  return {
    metadata: meta ? 'valid' : stored === undefined ? 'missing' : 'invalid',
    chunks,
    verifiedVideos: videosInState(chunks, 'intact'),
    unverifiedVideos: videosInState(chunks, 'mismatching'),
    unavailableChunks: chunks.filter(({ state }) => state === 'missing' || state === 'malformed').length,
  }
}
