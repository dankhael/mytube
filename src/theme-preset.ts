// Theme presets (spec crt-theme). A second single-knob mirror of src/theme.ts:
// where accent turns the --accent-h hue, the theme preset toggles a `data-theme`
// attribute on :root and ALL skin styling lives under [data-theme='smpte'] in
// CSS (theme-tokens.css + surface stylesheets). Aurora is the unprefixed
// default look, so applying it means removing the attribute (CRT-3).

export type ThemePreset = 'aurora' | 'smpte'

// Aurora preserves the look the extension ships with (CRT-1).
export const DEFAULT_THEME: ThemePreset = 'aurora'

// Stable picker order: default first, special skin second.
export const THEME_PRESETS: ThemePreset[] = ['aurora', 'smpte']

export function isThemePreset(value: unknown): value is ThemePreset {
  return value === 'aurora' || value === 'smpte'
}

// Applies the chosen preset to a root element by toggling the data-theme knob.
// Unknown/garbage values fall back to the default (CRT-4) rather than writing a
// junk attribute. Example: applyThemePreset(document.documentElement, 'smpte').
export function applyThemePreset(root: HTMLElement, theme: unknown): void {
  const preset = isThemePreset(theme) ? theme : DEFAULT_THEME
  if (preset === DEFAULT_THEME) {
    root.removeAttribute('data-theme')
    return
  }
  root.setAttribute('data-theme', preset)
}
