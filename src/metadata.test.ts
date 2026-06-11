// Regression specs for the metadata-backfill fix (placeholder title/channel).
// The oEmbed network call itself is external I/O — covered by manual acceptance.
// SEC-18/SEC-19 (specs/security-hardening.spec.md) bound that call with a fake.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { MISSING_CHANNEL, MISSING_TITLE, fetchVideoMetadata, needsEnrichment } from './metadata'

// Named fake for the only external I/O here (CLAUDE.md: no inline stubs).
class FakeOembedFetch {
  lastInit: RequestInit | undefined

  // What AbortSignal.timeout(8_000) raises when the endpoint hangs.
  timingOut(): typeof fetch {
    return () => Promise.reject(new DOMException('The operation timed out.', 'TimeoutError'))
  }

  answering(payload: { title: string; author_name: string }): typeof fetch {
    return (_input: RequestInfo | URL, init?: RequestInit) => {
      this.lastInit = init
      return Promise.resolve({ ok: true, json: async () => payload } as Response)
    }
  }
}

describe('metadata.spec', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('META-1: a video missing title or channel needs enrichment', () => {
    expect(needsEnrichment({ title: MISSING_TITLE, channelName: 'Canal X' })).toBe(true)
    expect(needsEnrichment({ title: 'Vídeo real', channelName: MISSING_CHANNEL })).toBe(true)
    expect(needsEnrichment({ title: '', channelName: '' })).toBe(true)
  })

  it('META-2: a fully-scraped video does not need enrichment', () => {
    expect(needsEnrichment({ title: 'Vídeo real', channelName: 'Canal X' })).toBe(false)
  })

  it('SEC-18: a timed-out fetch resolves null like any other failed lookup', async () => {
    vi.stubGlobal('fetch', new FakeOembedFetch().timingOut())
    await expect(fetchVideoMetadata('dQw4w9WgXcQ')).resolves.toBeNull()
  })

  it('SEC-19: the happy path is unchanged and the fetch carries an abort signal', async () => {
    const fake = new FakeOembedFetch()
    vi.stubGlobal('fetch', fake.answering({ title: 'Vídeo real', author_name: 'Canal X' }))
    await expect(fetchVideoMetadata('dQw4w9WgXcQ')).resolves.toEqual({
      title: 'Vídeo real',
      channelName: 'Canal X',
    })
    expect(fake.lastInit?.signal).toBeInstanceOf(AbortSignal)
  })
})
