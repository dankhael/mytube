// @vitest-environment jsdom
// SVG element builder specs for the vanilla-DOM surfaces (popup + content
// script). Carries the PUI-2 / HICON-4 coverage that lived in the retired
// string-based popup/category-icon renderer; the builder itself exists because
// YouTube's Trusted Types forbid innerHTML in the content script.

import { describe, expect, it } from 'vitest'
import { ALL_ICONS, IconKey } from './category-icon'
import { ICON_SHAPES, categoryIconElement, iconSvgElement } from './category-icon-svg'

describe('category-icon-svg (element builder)', () => {
  it('PUI-2: iconSvgElement returns an inline <svg> with currentColor stroke', () => {
    const svg = iconSvgElement('gamepad')
    expect(svg.tagName.toLowerCase()).toBe('svg')
    expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg')
    expect(svg.getAttribute('stroke')).toBe('currentColor')
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
    expect(svg.children.length).toBeGreaterThan(0)
  })

  it('every IconKey has geometry, so no icon can render blank', () => {
    for (const key of ALL_ICONS) {
      expect(ICON_SHAPES[key].length, key).toBeGreaterThan(0)
      expect(iconSvgElement(key).children.length, key).toBeGreaterThan(0)
    }
  })

  it('PUI-2: categoryIconElement renders the name-mapped icon when no explicit icon', () => {
    expect(categoryIconElement({ name: 'Games' }).isEqualNode(iconSvgElement('gamepad'))).toBe(true)
    expect(categoryIconElement({ name: 'Whatever' }).isEqualNode(iconSvgElement('bookmark'))).toBe(
      true,
    )
  })

  it('HICON-4: categoryIconElement honours an explicit icon over the name guess', () => {
    expect(categoryIconElement({ name: 'Games', icon: 'book' }).isEqualNode(iconSvgElement('book'))).toBe(
      true,
    )
  })

  it('S3: an out-of-set icon value falls back to the default geometry', () => {
    const bogus = 'not-an-icon' as IconKey
    expect(iconSvgElement(bogus).isEqualNode(iconSvgElement('bookmark'))).toBe(true)
  })
})
