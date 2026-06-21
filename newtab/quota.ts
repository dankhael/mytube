// Quota-warning math for the home banner (finding R1, ROB-1/ROB-2).
// The banner must track the *binding* chrome.storage.sync limit: pre-shard the
// 8,192-byte per-item quota binds long before the 102,400-byte total; after
// sharding only the total binds. Kept as min() over whatever the storage layout
// declares, as defense in depth if the layout changes again.

import { SyncQuotaLimits } from '../src/storage-backend'

export const WARN_RATIO = 0.8

export function bindingQuotaLimit(limits: SyncQuotaLimits): number {
  if (limits.perItemBytes === undefined) return limits.totalBytes
  return Math.min(limits.totalBytes, limits.perItemBytes)
}

export function shouldWarnQuota(bytesInUse: number, limitBytes: number): boolean {
  return bytesInUse >= WARN_RATIO * limitBytes
}
