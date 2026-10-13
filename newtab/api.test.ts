import { afterEach, expect, it, vi } from 'vitest'
import { getBytesInUse } from './api'
import { SYNC_QUOTA_LIMITS } from '../src/storage-backend'
import { bindingQuotaLimit } from './quota'

afterEach(() => vi.restoreAllMocks())

it('ARCH-1: measures all sync keys against the sharded total quota', async () => {
  const usage = vi.spyOn(chrome.storage.sync, 'getBytesInUse')
    .mockImplementation((() => Promise.resolve(82_000)) as never)
  expect(await getBytesInUse()).toBe(82_000)
  expect(usage).toHaveBeenCalledWith(null)
  expect(bindingQuotaLimit(SYNC_QUOTA_LIMITS)).toBe(102_400)
})
