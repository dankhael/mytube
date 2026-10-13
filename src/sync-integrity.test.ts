import { expect, it } from 'vitest'
import { chunkDigest } from './sync-integrity'

it('hashes storage-equivalent objects identically despite native key reordering', async () => {
  const original = { videos: [{ title: 'Title', id: 'testVideo01', watched: false }] }
  const reordered = { videos: [{ id: 'testVideo01', watched: false, title: 'Title' }] }
  expect(await chunkDigest(original)).toBe(await chunkDigest(reordered))
})

it('preserves array order and changed values in the fingerprint', async () => {
  expect(await chunkDigest({ videos: [1, 2] })).not.toBe(await chunkDigest({ videos: [2, 1] }))
  expect(await chunkDigest({ watched: false })).not.toBe(await chunkDigest({ watched: true }))
})
