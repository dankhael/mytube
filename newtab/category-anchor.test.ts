// Unit specs for the chip ↔ section anchor helpers (spec home-category-chips).
// Pure functions: no jsdom needed — `getElementById` is injected.

import { describe, expect, it, vi } from 'vitest'
import { scrollToCategory, sectionDomId } from './category-anchor'

describe('category-anchor', () => {
  it('sectionDomId namespaces the category name', () => {
    expect(sectionDomId('Jogos')).toBe('cat-section:Jogos')
  })

  it('scrollToCategory smooth-scrolls the matching section into view', () => {
    const scrollIntoView = vi.fn()
    const doc = { getElementById: vi.fn().mockReturnValue({ scrollIntoView }) }
    scrollToCategory('Jogos', doc as unknown as Document)
    expect(doc.getElementById).toHaveBeenCalledWith('cat-section:Jogos')
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })

  it('scrollToCategory is a no-op when the section is absent', () => {
    const doc = { getElementById: vi.fn().mockReturnValue(null) }
    expect(() => scrollToCategory('Missing', doc as unknown as Document)).not.toThrow()
  })
})
