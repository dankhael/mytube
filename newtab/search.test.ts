// Search filter specs (Node). See specs/design-rework.spec.md (HOME-4).

import { describe, expect, it } from 'vitest'
import { filterVideos, matchesQuery } from './search'
import { Video } from '../src/types'

function vid(title: string, channelName: string): Video {
  return { id: title, title, thumbnail: 't', channelName, category: 'A', addedAt: 1, watched: false }
}

describe('design-rework.spec (search)', () => {
  it('HOME-4: matches title or channel, case-insensitive', () => {
    const v = vid('Aprenda React', 'Canal Dev')
    expect(matchesQuery(v, 'react')).toBe(true)
    expect(matchesQuery(v, 'DEV')).toBe(true)
    expect(matchesQuery(v, 'python')).toBe(false)
  })

  it('HOME-4: an empty query matches everything', () => {
    const list = [vid('A', 'x'), vid('B', 'y')]
    expect(filterVideos(list, '   ')).toHaveLength(2)
    expect(filterVideos(list, 'a')).toEqual([list[0]])
  })
})
