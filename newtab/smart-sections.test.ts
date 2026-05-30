// Pure selector specs for the home smart sections. See specs/home-smart-sections.spec.md.

import { describe, expect, it } from 'vitest'
import { DUST_AGE_DAYS, selectGatheringDust, selectRecentlyAdded } from './smart-sections'
import { Video } from '../src/types'

const DAY = 24 * 60 * 60 * 1000
const NOW = 1_000_000_000_000

function vid(id: string, addedAt: number, watched = false): Video {
  return { id, title: id, thumbnail: 't', channelName: 'C', category: 'A', addedAt, watched }
}

describe('home-smart-sections.spec', () => {
  it('SMART-1: recently added is newest-first and excludes watched', () => {
    const out = selectRecentlyAdded([
      vid('old', NOW - 5 * DAY),
      vid('new', NOW - 1 * DAY),
      vid('seen', NOW, true),
    ])
    expect(out.map((v) => v.id)).toEqual(['new', 'old'])
  })

  it('SMART-1: recently added is capped by count', () => {
    const many = Array.from({ length: 20 }, (_, i) => vid(`v${i}`, NOW - i * DAY))
    expect(selectRecentlyAdded(many, 12)).toHaveLength(12)
  })

  it('SMART-2: gathering dust = unwatched older than the threshold, oldest first', () => {
    const out = selectGatheringDust(
      [
        vid('fresh', NOW - 2 * DAY), // too recent
        vid('dusty', NOW - (DUST_AGE_DAYS + 5) * DAY),
        vid('dustier', NOW - (DUST_AGE_DAYS + 40) * DAY),
        vid('old-but-seen', NOW - 100 * DAY, true), // watched → excluded
      ],
      NOW,
    )
    expect(out.map((v) => v.id)).toEqual(['dustier', 'dusty'])
  })

  it('SMART-6: gathering dust is empty when nothing is old enough', () => {
    const out = selectGatheringDust([vid('a', NOW - 3 * DAY), vid('b', NOW)], NOW)
    expect(out).toEqual([])
  })
})
