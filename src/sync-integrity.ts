// Integrity, not authentication: synced values remain untrusted and the reducer
// still sanitizes them. Hashes detect chunks arriving out of order across devices.
import { SYNC_STORAGE_LIMITS } from './storage-limits'

// Chrome storage can reorder object properties when it serializes native
// dictionaries. Sort keys recursively, but preserve video/category array order.
export function canonicalJson(value: unknown): string | undefined {
  return JSON.stringify(value, (_key, entry: unknown) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return entry
    return Object.fromEntries(Object.entries(entry).sort(([left], [right]) =>
      left < right ? -1 : left > right ? 1 : 0))
  })
}

export async function chunkDigest(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(value))
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Validate the actual intermediate key set before a write can change storage. */
export function checkSyncQuota(items: Record<string, unknown>): void {
  const { perItemBytes, totalBytes, maxItems } = SYNC_STORAGE_LIMITS
  const entries = Object.entries(items)
  if (entries.length > maxItems) throw new Error(`Sync quota: ${entries.length} items exceeds ${maxItems}`)
  let total = 0
  for (const [key, value] of entries) {
    const bytes = new TextEncoder().encode(key + JSON.stringify(value)).length
    if (bytes > perItemBytes) throw new Error(`Sync quota: ${key} uses ${bytes} bytes; limit ${perItemBytes}`)
    total += bytes
  }
  if (total > totalBytes) throw new Error(`Sync quota: ${total} bytes exceeds ${totalBytes}`)
}
