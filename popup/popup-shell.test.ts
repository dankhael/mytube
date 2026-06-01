// Static structural specs for the popup shell + theme wiring (Node).
// Reads the source files so the rework's wiring is asserted, not pixels.
// See specs/popup-redesign.spec.md.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const read = (rel: string) => readFileSync(join(here, rel), 'utf8')

const html = read('popup.html')
const css = read('popup.css')
const tokens = read('../styles/theme-tokens.css')

describe('popup-redesign.spec (shell + theme)', () => {
  it('PUI-1: the header has the logo mark, an unwatched count slot and the gear', () => {
    expect(html).toContain('<svg') // official mark
    expect(html).toMatch(/id="total"/)
    expect(html).toMatch(/id="config"/)
    expect(html).not.toMatch(/não assistidos|vídeos/) // no old total-videos copy
  })

  it('PUI-4: the footer button reads "Open my home", is accent-styled, not red', () => {
    expect(html).toContain('Open my home')
    expect(css).toMatch(/#open\s*\{[^}]*background:\s*var\(--accent\)/)
    expect(html).not.toMatch(/#ff0000/i)
    expect(css).not.toMatch(/#ff0000/i)
  })

  it('PUI-8: the popup consumes the shared token file and resolves the accent from it', () => {
    expect(css).toMatch(/@import\s+['"]\.\.\/styles\/theme-tokens\.css['"]/)
    expect(css).toContain('var(--accent)')
    // The single knob lives once in the shared file.
    expect(tokens).toContain(':root')
    expect(tokens.match(/--accent-h:/g)?.length).toBe(1)
  })
})
