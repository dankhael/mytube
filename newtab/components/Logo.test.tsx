// @vitest-environment jsdom
// Logo mark themes with the accent (specs/theme-color.spec.md THEME-9): the
// gradient stops and play-cutout read the --accent* tokens (which follow
// --accent-h) instead of hardcoded violet, so the mark recolors with the setting.

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import Logo from './Logo'

afterEach(cleanup)

describe('theme-color.spec — Logo mark', () => {
  it('THEME-9: gradient stops and cutout use accent tokens, not hardcoded hex', () => {
    const { container } = render(<Logo />)
    const svg = container.querySelector('svg')!

    const stops = [...svg.querySelectorAll('stop')].map((s) => s.getAttribute('style') ?? '')
    expect(stops).toEqual([
      expect.stringContaining('var(--accent)'),
      expect.stringContaining('var(--accent-2)'),
    ])

    const cutout = svg.querySelectorAll('path')[1]
    expect(cutout.getAttribute('style')).toContain('var(--accent-ink)')

    expect(svg.outerHTML).not.toMatch(/#A89CFF|#8B7BFF|#0C2A22/i)
  })
})
