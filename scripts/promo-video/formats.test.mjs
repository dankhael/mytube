import { describe, expect, it } from 'vitest'
import { FORMATS, LANDSCAPE, VERTICAL, pickFormats } from './formats.mjs'

describe('pickFormats', () => {
  it('returns every format when none is named', () => {
    expect(pickFormats([])).toEqual(FORMATS)
    expect(pickFormats(['home-search'])).toEqual(FORMATS)
  })

  it('returns only the named formats, ignoring scene ids mixed in', () => {
    expect(pickFormats(['vertical', 'home-search'])).toEqual([VERTICAL])
    expect(pickFormats(['1080p'])).toEqual([LANDSCAPE])
  })
})

describe('format geometry', () => {
  it.each(FORMATS)('$name: the window keeps its take aspect ratio and fits the frame', (format) => {
    const { window: w, take, frame } = format
    expect(w.contentHeight / w.width).toBeCloseTo(take.height / take.width, 2)
    expect(w.x + w.width).toBeLessThanOrEqual(frame.width)
    expect(w.contentY + w.contentHeight).toBeLessThanOrEqual(frame.height)
  })

  it.each(FORMATS)('$name: the popup sits inside the window content', (format) => {
    const { window: w, popup } = format
    expect(popup.x).toBeGreaterThanOrEqual(w.x)
    expect(popup.y + popup.height).toBeLessThanOrEqual(w.contentY + w.contentHeight)
  })
})
