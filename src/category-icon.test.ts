// Shared category → icon mapping specs (Node).
// See specs/popup-redesign.spec.md (PUI-9) and specs/home-icon-tiles.spec.md.

import { describe, expect, it } from 'vitest'
import { DEFAULT_ICON, categoryIcon, resolveCategoryIcon } from './category-icon'

describe('category-icon (mapping)', () => {
  it('PUI-9: maps known categories to specific icons', () => {
    expect(categoryIcon('Games')).toBe('gamepad')
    expect(categoryIcon('RPG')).toBe('box')
    expect(categoryIcon('Educational')).toBe('book')
    expect(categoryIcon('Entertainment')).toBe('grid')
    expect(categoryIcon('Uncategorized')).toBe('inbox')
  })

  it('PUI-9: covers the extended set (fitness, food, art, space, science, news, sport)', () => {
    expect(categoryIcon('Fitness')).toBe('dumbbell')
    expect(categoryIcon('Cooking & food')).toBe('utensils')
    expect(categoryIcon('Arte digital')).toBe('palette')
    expect(categoryIcon('Space & startups')).toBe('rocket')
    expect(categoryIcon('Science')).toBe('flask')
    expect(categoryIcon('Daily news')).toBe('newspaper')
    expect(categoryIcon('Sports')).toBe('trophy')
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

  it('HICON-3: with no explicit icon, resolve falls back to the name guess', () => {
    expect(resolveCategoryIcon({ name: 'Games' })).toBe('gamepad')
    expect(resolveCategoryIcon({ name: 'Whatever 99' })).toBe(DEFAULT_ICON)
  })

  it('HICON-4: an explicit icon overrides the name guess', () => {
    expect(resolveCategoryIcon({ name: 'Games', icon: 'book' })).toBe('book')
    expect(resolveCategoryIcon({ name: 'Random', icon: 'trophy' })).toBe('trophy')
  })
})
