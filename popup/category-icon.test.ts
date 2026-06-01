// Category → icon mapping specs (Node). See specs/popup-redesign.spec.md.

import { describe, expect, it } from 'vitest'
import { DEFAULT_ICON, categoryIcon, categorySvg } from './category-icon'

describe('popup-redesign.spec (category icon)', () => {
  it('PUI-9: maps known categories to specific icons', () => {
    expect(categoryIcon('Games')).toBe('gamepad')
    expect(categoryIcon('RPG')).toBe('box')
    expect(categoryIcon('Educational')).toBe('book')
    expect(categoryIcon('Entertainment')).toBe('grid')
    expect(categoryIcon('Uncategorized')).toBe('inbox')
  })

  it('PUI-9: matching is case-insensitive and works on Portuguese names', () => {
    expect(categoryIcon('JOGOS')).toBe('gamepad')
    expect(categoryIcon('Música relax')).toBe('music')
    expect(categoryIcon('Sem categoria')).toBe('inbox')
  })

  it('PUI-9: unmatched and empty names fall back to the default; never throws', () => {
    expect(categoryIcon('Some Random Category 123')).toBe(DEFAULT_ICON)
    expect(categoryIcon('')).toBe(DEFAULT_ICON)
    expect(() => categoryIcon(undefined as unknown as string)).not.toThrow()
    expect(categoryIcon(undefined as unknown as string)).toBe(DEFAULT_ICON)
  })

  it('PUI-2: categorySvg returns an inline <svg> for rendering in the tile', () => {
    const svg = categorySvg('Games')
    expect(svg).toContain('<svg')
    expect(svg).toContain('currentColor')
  })
})
