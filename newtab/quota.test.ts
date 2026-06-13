// Executable spec for specs/storage-robustness.spec.md (ROB-1, ROB-2).
// The banner must warn against the *binding* sync limit — pre-shard that is the
// 8,192-byte per-item quota, not the 102,400-byte total (finding R1).

import { describe, expect, it } from 'vitest'
import { bindingQuotaLimit, shouldWarnQuota } from './quota'

describe('storage-robustness.spec — quota helper', () => {
  it('ROB-1: the binding limit is the lower of total and per-item', () => {
    expect(bindingQuotaLimit({ totalBytes: 102_400, perItemBytes: 8_192 })).toBe(8_192)
    expect(bindingQuotaLimit({ totalBytes: 102_400 })).toBe(102_400)
  })

  it('ROB-2: the warning fires at 80% of the binding limit', () => {
    expect(shouldWarnQuota(6_554, 8_192)).toBe(true)
    expect(shouldWarnQuota(6_553, 8_192)).toBe(false)
    expect(shouldWarnQuota(81_920, 102_400)).toBe(true)
  })
})
