// @vitest-environment jsdom
// Executable spec for specs/crt-theme.spec.md (CRT-2..4): the theme preset is a
// single attribute knob — applyThemePreset toggles data-theme on a root element,
// and everything visual hangs off [data-theme='smpte'] in CSS.

import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME, THEME_PRESETS, applyThemePreset, isThemePreset } from './theme-preset'

describe('theme presets', () => {
  it('exposes the two presets with aurora as the default', () => {
    expect(THEME_PRESETS).toEqual(['aurora', 'smpte'])
    expect(DEFAULT_THEME).toBe('aurora')
  })

  it('guards the preset union', () => {
    expect(isThemePreset('aurora')).toBe(true)
    expect(isThemePreset('smpte')).toBe(true)
    expect(isThemePreset('vaporwave')).toBe(false)
    expect(isThemePreset(42)).toBe(false)
    expect(isThemePreset(undefined)).toBe(false)
  })

  it('CRT-2: applyThemePreset(root, "smpte") sets data-theme="smpte"', () => {
    const root = document.createElement('div')
    applyThemePreset(root, 'smpte')
    expect(root.getAttribute('data-theme')).toBe('smpte')
  })

  it('CRT-3: applyThemePreset(root, "aurora") removes the attribute from a themed root', () => {
    const root = document.createElement('div')
    applyThemePreset(root, 'smpte')
    applyThemePreset(root, 'aurora')
    expect(root.hasAttribute('data-theme')).toBe(false)
  })

  it('CRT-4: an unknown/garbage theme falls back to aurora (no junk attribute)', () => {
    const root = document.createElement('div')
    applyThemePreset(root, 'smpte')
    applyThemePreset(root, 'crt-9000')
    expect(root.hasAttribute('data-theme')).toBe(false)
  })
})
