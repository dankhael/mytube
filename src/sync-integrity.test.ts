import { describe, expect, it } from 'vitest'
import { checkSyncQuota, chunkDigest, storedForm, syncItemBytes, syncQuotaViolation } from './sync-integrity'
import { SYNC_STORAGE_LIMITS } from './storage-limits'

it('hashes storage-equivalent objects identically despite native key reordering', async () => {
  const original = { videos: [{ title: 'Title', id: 'testVideo01', watched: false }] }
  const reordered = { videos: [{ id: 'testVideo01', watched: false, title: 'Title' }] }
  expect(await chunkDigest(original)).toBe(await chunkDigest(reordered))
})

it('preserves array order and changed values in the fingerprint', async () => {
  expect(await chunkDigest({ videos: [1, 2] })).not.toBe(await chunkDigest({ videos: [2, 1] }))
  expect(await chunkDigest({ watched: false })).not.toBe(await chunkDigest({ watched: true }))
})

describe('storedForm', () => {
  it('replaces lone surrogates at any depth and keeps real pairs', () => {
    const input = { title: 'a\ud83d', nested: [{ name: '\ude00b' }], emoji: '😀', count: 3 }
    expect(storedForm(input)).toEqual({
      title: 'a\ufffd', nested: [{ name: '\ufffdb' }], emoji: '😀', count: 3,
    })
  })

  it('drops undefined fields, as storage does', () => {
    expect(storedForm({ a: 1, b: undefined })).toEqual({ a: 1 })
    expect(Object.keys(storedForm({ a: 1, b: undefined }))).toEqual(['a'])
  })
})

describe('syncQuotaViolation', () => {
  const { perItemBytes, totalBytes, maxItems } = SYNC_STORAGE_LIMITS

  it('accepts a key set inside every limit', () => {
    expect(syncQuotaViolation({ a: 'x' })).toBeUndefined()
  })

  it('names the limit that was broken', () => {
    const manyItems = Object.fromEntries(Array.from({ length: maxItems + 1 }, (_, index) => [`k${index}`, 1]))
    const manyBytes = Object.fromEntries(Array.from({ length: 20 }, (_, index) => [`k${index}`, 'x'.repeat(perItemBytes - 100)]))
    expect(syncQuotaViolation(manyItems)).toContain(`${maxItems + 1} items`)
    expect(syncQuotaViolation({ big: 'x'.repeat(perItemBytes) })).toContain(`limit ${perItemBytes}`)
    expect(syncQuotaViolation(manyBytes)).toContain(`exceeds ${totalBytes}`)
  })

  it('checkSyncQuota throws that same message', () => {
    const big = { big: 'x'.repeat(perItemBytes) }
    expect(() => checkSyncQuota(big)).toThrow(syncQuotaViolation(big))
  })
})

describe('syncItemBytes', () => {
  // Each expected value is what getBytesInUse returned for key `k` in real Chromium.
  it.each<[string, unknown, number]>([
    ['small int', 5, 2],
    ['largest int32', 2147483647, 11],
    ['smallest int32', -2147483648, 12],
    ['just past int32', 2147483648, 13],
    ['just below int32', -2147483649, 14],
    ['double under 1e12', 999999999999, 15],
    ['1e12', 1e12, 6],
    ['Date.now()', 1730000000123, 19],
    ['Date.now() with a trailing zero', 1730000000120, 18],
    ['negative timestamp', -1730000000123, 20],
    ['fraction', 0.1, 4],
    ['boolean', true, 5],
    ['null', null, 5],
    ['angle bracket', '<a>', 11],
    ['closing bracket alone', '>', 4],
    ['line separator', '\u2028', 9],
    ['paragraph separator', '\u2029', 9],
    ['emoji', '📁', 7],
    ['angle bracket in an object key', { '<': 1 }, 13],
    ['timestamp nested in an array', { a: [{ t: 1730000000123 }] }, 33],
  ])('matches Chromium for %s', (_name, value, expected) => {
    expect(syncItemBytes('k', value)).toBe(expected)
  })

  it('skips undefined fields, as JSON does', () => {
    expect(syncItemBytes('k', { a: undefined })).toBe(syncItemBytes('k', {}))
  })
})
