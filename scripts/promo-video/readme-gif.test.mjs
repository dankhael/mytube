import { describe, expect, it } from 'vitest'
import { gifWindow } from './readme-gif.mjs'

// Shape written by compose.mjs timelineText.
const TIMELINE = `0:00.0  intro          (title card)
0:03.0  yt-save        Save any YouTube video in one click
0:08.8  home-library   Your own YouTube home, one click away
0:15.9  home-search    Find anything instantly
1:04.4  end
`

describe('gifWindow', () => {
  it('spans from one scene to the start of another, trimming the cross-fades', () => {
    expect(gifWindow(TIMELINE, 'yt-save', 'home-search')).toEqual({ start: 3.3, duration: 12.3 })
  })

  it('reads minutes past the first one', () => {
    expect(gifWindow(TIMELINE, 'home-search', 'end')).toEqual({ start: 16.2, duration: 47.9 })
  })

  it('names the scenes it did find when one is missing', () => {
    expect(() => gifWindow(TIMELINE, 'yt-save', 'popup')).toThrow(/no scene "popup".*yt-save/)
  })
})
