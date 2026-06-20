// @vitest-environment jsdom
// Executable spec for specs/theme-color.spec.md (THEME-1..4). The pure preset→hue
// mapping and the --accent-h application; the picker/runtime wiring live with the
// popup and new-tab tests.

import { describe, expect, it } from 'vitest'
import { ACCENT_PRESETS, DEFAULT_ACCENT, accentHue, applyAccent } from './theme'
import { DEFAULT_SETTINGS } from './types'

describe('theme-color.spec — accent presets', () => {
  it('THEME-1: settings default to the violet accent (today’s --accent-h: 290)', () => {
    expect(DEFAULT_ACCENT).toBe('violet')
    expect(DEFAULT_SETTINGS.accent).toBe('violet')
    expect(accentHue(DEFAULT_ACCENT)).toBe(290)
  })

  it('THEME-2: each named preset maps to its documented hue', () => {
    const expected = { violet: 290, mint: 168, red: 25, amber: 64, blue: 250, pink: 350 } as const
    for (const preset of ACCENT_PRESETS) {
      expect(accentHue(preset), preset).toBe(expected[preset])
    }
    expect(ACCENT_PRESETS).toEqual(Object.keys(expected))
  })

  it('THEME-3: applyAccent writes the preset hue to --accent-h on the root', () => {
    const root = document.createElement('div')
    applyAccent(root, 'mint')
    expect(root.style.getPropertyValue('--accent-h')).toBe('168')
  })

  it('THEME-4: applyAccent falls back to the default hue for unknown values', () => {
    const root = document.createElement('div')
    applyAccent(root, 'puce')
    expect(root.style.getPropertyValue('--accent-h')).toBe('290')
  })
})
