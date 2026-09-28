// Shared category → icon mapping specs (Node).
// See specs/popup-redesign.spec.md (PUI-9) and specs/home-icon-tiles.spec.md.

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { DEFAULT_ICON, categoryIcon, resolveCategoryIcon } from './category-icon'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')
const sourcesIn = (dir: string) =>
  readdirSync(join(root, dir), { recursive: true })
    .map(String)
    .filter((file) => /\.(ts|tsx)$/.test(file) && !file.includes('.test.'))
    .map((file) => join(dir, file))

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

describe('home-icon-tiles.spec (one mapping)', () => {
  it('HICON-8: home and popup both resolve icons through the shared resolver', () => {
    // Popup tiles go through categoryIconElement, which delegates to the resolver.
    expect(read('popup/render.ts')).toContain('categoryIconElement(category)')
    expect(read('src/category-icon-svg.ts')).toMatch(
      /categoryIconElement[\s\S]*resolveCategoryIcon\(category\)/,
    )
    // Every home component that shows a category's icon imports the same resolver.
    for (const file of ['CategorySection', 'CategoryChips', 'SaveToModal', 'AddCategoryModal']) {
      expect(read(`newtab/components/${file}.tsx`)).toMatch(
        /import \{[^}]*resolveCategoryIcon[^}]*\} from '..\/..\/src\/category-icon'/,
      )
    }
  })

  it('HICON-8: the name → icon rules exist in exactly one module (no duplicated mapping)', () => {
    const files = ['src', 'newtab', 'popup', 'content'].flatMap(sourcesIn)
    const withRules = files.filter((file) => /\[\s*'rpg'\s*,\s*'box'\s*\]/.test(read(file)))
    expect(withRules).toEqual([join('src', 'category-icon.ts')])
  })
})
