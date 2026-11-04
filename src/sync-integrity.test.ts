import { describe, expect, it } from 'vitest'
import { chunkDigest, storedForm } from './sync-integrity'

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
