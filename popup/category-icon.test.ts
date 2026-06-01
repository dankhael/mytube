// Popup inline-SVG icon rendering specs (Node). The mapping itself is tested in
// src/category-icon.test.ts; here we cover the SVG layer + explicit-icon override.
// See specs/home-icon-tiles.spec.md.

import { describe, expect, it } from 'vitest'
import { categorySvg, iconSvg } from './category-icon'

describe('popup category-icon (svg)', () => {
  it('PUI-2: iconSvg returns an inline <svg> with currentColor stroke', () => {
    const svg = iconSvg('gamepad')
    expect(svg).toContain('<svg')
    expect(svg).toContain('currentColor')
  })

  it('PUI-2: categorySvg renders the name-mapped icon when no explicit icon', () => {
    // bookmark default geometry vs gamepad geometry differ — assert they're not equal.
    expect(categorySvg({ name: 'Games' })).toBe(iconSvg('gamepad'))
    expect(categorySvg({ name: 'Whatever' })).toBe(iconSvg('bookmark'))
  })

  it('HICON-4: categorySvg honours an explicit icon over the name guess', () => {
    expect(categorySvg({ name: 'Games', icon: 'book' })).toBe(iconSvg('book'))
  })
})
