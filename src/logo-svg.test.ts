// Executable spec for specs/theme-color.spec.md (THEME-10/11 color logic). The
// standalone mark — used by the favicon and the toolbar icon raster — colors
// itself from the accent; rasterization/favicon DOM wiring are tested separately
// (jsdom) or by hand (the service-worker canvas path).

import { describe, expect, it } from 'vitest'
import { accentColors, accentLogoSvg } from './logo-svg'

describe('theme-color.spec — accent logo svg', () => {
  it('THEME-10: colors derive from the accent hue (mint → 168)', () => {
    const c = accentColors('mint')
    expect(c.light).toBe('oklch(0.815 0.125 168)')
    expect(c.deep).toBe('oklch(0.72 0.135 168)')
    expect(c.ink).toBe('oklch(0.205 0.045 168)')
  })

  it('THEME-10: unknown accent falls back to the default hue (290)', () => {
    expect(accentColors('puce').light).toBe('oklch(0.815 0.125 290)')
  })

  it('THEME-10: the svg embeds the accent colors and a sized root for rasterizing', () => {
    const svg = accentLogoSvg('red')
    expect(svg).toContain('width="256" height="256"')
    expect(svg).toContain('stop-color="oklch(0.815 0.125 25)"')
    expect(svg).toContain('stop-color="oklch(0.72 0.135 25)"')
    expect(svg).toContain('fill="oklch(0.205 0.045 25)"')
    expect(svg).not.toMatch(/#A89CFF|#8B7BFF|#0C2A22/i)
  })
})
