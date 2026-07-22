// @vitest-environment jsdom
// Regression test for the home-save "no timestamp" bug: extractDuration must read
// a clock label out of both YouTube overlay shapes and reject the non-duration
// text that shares those slots. The live selectors themselves stay Manual
// acceptance (the DOM shifts); this only pins the reader logic against known
// fragments so the badge-shape class fix can't silently regress.

import { describe, expect, it } from 'vitest'
import { extractDuration } from './extract-card'

function fragment(html: string): HTMLElement {
  const el = document.createElement('div')
  el.innerHTML = html
  return el
}

describe('extract-card — extractDuration', () => {
  it('reads the classic time-status overlay (whitespace trimmed)', () => {
    const card = fragment(
      '<ytd-thumbnail-overlay-time-status-renderer><span id="text">\n  12:34 </span></ytd-thumbnail-overlay-time-status-renderer>',
    )
    expect(extractDuration(card)).toBe('12:34')
  })

  it('reads the newer badge-shape text node (div.badge-shape, not <badge-shape>)', () => {
    const card = fragment(
      '<div class="badge-shape badge-shape-wiz"><div class="badge-shape-wiz__text">1:02:03</div></div>',
    )
    expect(extractDuration(card)).toBe('1:02:03')
  })

  it('ignores non-duration badges that share the slot (4K, AO VIVO)', () => {
    const card = fragment(
      '<div class="badge-shape-wiz__text">4K</div>' +
        '<ytd-thumbnail-overlay-time-status-renderer><span id="text">AO VIVO</span></ytd-thumbnail-overlay-time-status-renderer>',
    )
    expect(extractDuration(card)).toBeUndefined()
  })

  it('falls back to scanning the thumbnail region for an unknown badge class', () => {
    // A bare clock OUTSIDE the thumbnail must be ignored (scope guard); the
    // future-named badge INSIDE the thumbnail is the one that wins.
    const card = fragment(
      '<span id="video-title">12:00</span>' +
        '<ytd-thumbnail><a id="thumbnail"><div class="some-future-badge-class">15:20</div></a></ytd-thumbnail>',
    )
    expect(extractDuration(card)).toBe('15:20')
  })

  it('returns undefined when the card has no duration overlay', () => {
    expect(extractDuration(fragment('<span>no time here</span>'))).toBeUndefined()
  })
})
