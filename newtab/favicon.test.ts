// @vitest-environment jsdom
// Executable spec for specs/theme-color.spec.md (THEME-10 favicon swap). The
// new-tab page repoints its favicon at the accent-colored mark once settings load.

import { afterEach, describe, expect, it } from 'vitest'
import { applyAccentFavicon } from './favicon'

afterEach(() => document.head.replaceChildren())

function iconHref(): string {
  return document.querySelector<HTMLLinkElement>('link[rel="icon"]')!.href
}

describe('theme-color.spec — favicon', () => {
  it('THEME-10: reuses the existing <link rel="icon"> and swaps it to the accent svg', () => {
    const link = document.createElement('link')
    link.rel = 'icon'
    link.href = '/icons/icon48.png'
    document.head.appendChild(link)

    applyAccentFavicon(document, 'mint')

    expect(document.querySelectorAll('link[rel="icon"]').length).toBe(1)
    expect(iconHref()).toMatch(/^data:image\/svg\+xml,/)
    expect(decodeURIComponent(iconHref())).toContain('oklch(0.815 0.125 168)')
  })

  it('THEME-10: creates a favicon link when none exists', () => {
    applyAccentFavicon(document, 'violet')
    expect(decodeURIComponent(iconHref())).toContain('oklch(0.815 0.125 290)')
  })
})
