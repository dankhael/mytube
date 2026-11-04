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

// Unicode "Cs": with the u flag this matches only unpaired surrogates, because a
// valid pair reads as a single astral code point.
const LONE_SURROGATE = /\p{Cs}/gu

/**
 * `value` as storage will hand it back: UTF-8 can't hold a lone surrogate, so it
 * returns as U+FFFD, and undefined fields are dropped. Hashes must be computed on
 * this form. Hashing the raw text made a confirmed save unreadable forever, since
 * the stored chunk could never match its fingerprint again.
 * @example storedForm({ title: 'a\ud83d' }) // { title: 'a\ufffd' }
 */
export function storedForm<T>(value: T): T {
  return JSON.parse(JSON.stringify(value), (_key, entry: unknown) =>
    typeof entry === 'string' ? entry.replace(LONE_SURROGATE, '\ufffd') : entry) as T
}

export async function chunkDigest(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(value))
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

const INT32_LIMIT = 2 ** 31
// Where Chromium's number printing switches to exponent form.
const EXPONENT_FORM_FROM = 1e12

function extraNumberBytes(value: number): number {
  const fitsInt32 = value >= -INT32_LIMIT && value < INT32_LIMIT
  if (!Number.isInteger(value) || fitsInt32) return 0
  if (Math.abs(value) < EXPONENT_FORM_FROM) return '.0'.length
  return value.toExponential().length - String(value).length
}

function extraTextBytes(text: string): number {
  const angles = text.split('<').length - 1
  const separators = text.match(/[\u2028\u2029]/g)?.length ?? 0
  return angles * ('\\u003C'.length - 1) + separators * ('\\u2028'.length - 3)
}

// Bytes Chromium's JSON writer spends on `value` beyond what JSON.stringify shows.
// Numbers outside int32 are doubles there, so Date.now() prints as
// 1.730000000123e+12, 5 bytes longer. Measured with getBytesInUse in real Chromium;
// the e2e keeps comparing against it. On a browser that counts plain JSON this
// only makes the preflight a little conservative.
function extraChromiumBytes(value: unknown): number {
  if (typeof value === 'number') return extraNumberBytes(value)
  if (typeof value === 'string') return extraTextBytes(value)
  if (Array.isArray(value)) return value.reduce<number>((sum, entry) => sum + extraChromiumBytes(entry), 0)
  if (typeof value !== 'object' || value === null) return 0
  return Object.entries(value).reduce((sum, [key, entry]) =>
    sum + extraTextBytes(key) + extraChromiumBytes(entry), 0)
}

/**
 * Bytes one key costs against the sync quota, as Chromium counts them. Counting
 * plain JSON let writes past the preflight that the browser then refused.
 * @example syncItemBytes('k', 1730000000123) // 19
 */
export function syncItemBytes(key: string, value: unknown): number {
  return new TextEncoder().encode(key + JSON.stringify(value)).length + extraChromiumBytes(value)
}

/**
 * What's wrong with this key set for sync storage, or undefined if it fits.
 * @example syncQuotaViolation({ 'mytube:meta': meta }) // undefined
 */
export function syncQuotaViolation(items: Record<string, unknown>): string | undefined {
  const { perItemBytes, totalBytes, maxItems } = SYNC_STORAGE_LIMITS
  const entries = Object.entries(items)
  if (entries.length > maxItems) return `Sync quota: ${entries.length} items exceeds ${maxItems}`
  let total = 0
  for (const [key, value] of entries) {
    const bytes = syncItemBytes(key, value)
    if (bytes > perItemBytes) return `Sync quota: ${key} uses ${bytes} bytes; limit ${perItemBytes}`
    total += bytes
  }
  return total > totalBytes ? `Sync quota: ${total} bytes exceeds ${totalBytes}` : undefined
}

/**
 * Validate the actual intermediate key set before a write can change storage.
 * @example checkSyncQuota({ ...current, ...toSet }) // throws when it doesn't fit
 */
export function checkSyncQuota(items: Record<string, unknown>): void {
  const violation = syncQuotaViolation(items)
  if (violation) throw new Error(violation)
}
