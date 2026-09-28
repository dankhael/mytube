// DEFCAT-4 (localized-default-categories.spec): the stored Uncategorized bucket
// is display-mapped to the interface language; every other name shows as typed.

import { describe, expect, it } from 'vitest'
import { categoryLabel } from './category-label'
import { UNCATEGORIZED } from './types'

describe('localized-default-categories.spec — display label', () => {
  it('DEFCAT-4: the Uncategorized bucket reads "Sem categoria" in pt-BR and "Uncategorized" in English', () => {
    expect(categoryLabel(UNCATEGORIZED, 'pt-BR')).toBe('Sem categoria')
    expect(categoryLabel(UNCATEGORIZED, 'en')).toBe('Uncategorized')
  })

  it('DEFCAT-4: user and default category names are shown exactly as stored', () => {
    expect(categoryLabel('Tutorials', 'pt-BR')).toBe('Tutorials')
    expect(categoryLabel('Música', 'en')).toBe('Música')
  })
})
