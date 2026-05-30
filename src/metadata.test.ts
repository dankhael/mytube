// Regression specs for the metadata-backfill fix (placeholder title/channel).
// The oEmbed network call itself is external I/O — covered by manual acceptance.

import { describe, expect, it } from 'vitest'
import { MISSING_CHANNEL, MISSING_TITLE, needsEnrichment } from './metadata'

describe('metadata.spec', () => {
  it('META-1: a video missing title or channel needs enrichment', () => {
    expect(needsEnrichment({ title: MISSING_TITLE, channelName: 'Canal X' })).toBe(true)
    expect(needsEnrichment({ title: 'Vídeo real', channelName: MISSING_CHANNEL })).toBe(true)
    expect(needsEnrichment({ title: '', channelName: '' })).toBe(true)
  })

  it('META-2: a fully-scraped video does not need enrichment', () => {
    expect(needsEnrichment({ title: 'Vídeo real', channelName: 'Canal X' })).toBe(false)
  })
})
