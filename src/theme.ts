// Accent color presets (spec THEME). The whole extension re-themes off a single
// hue knob — `--accent-h` in styles/theme-tokens.css. This maps a user-chosen
// preset to that hue and applies it at runtime, so persisted Settings.accent can
// recolor both surfaces (popup + new-tab) without editing source.

export type AccentPreset = 'violet' | 'mint' | 'red' | 'amber' | 'blue' | 'pink'

// Hue is the OKLCH H channel fed to --accent-h. Violet 290 preserves today's
// default; Mint/Red/Amber are the four documented in theme-tokens.css.
const ACCENT_HUES: Record<AccentPreset, number> = {
  violet: 290,
  mint: 168,
  red: 25,
  amber: 64,
  blue: 250,
  pink: 350,
}

// Default preserves the look the extension shipped with (--accent-h: 290).
export const DEFAULT_ACCENT: AccentPreset = 'violet'

// Stable picker order (insertion order of ACCENT_HUES).
export const ACCENT_PRESETS = Object.keys(ACCENT_HUES) as AccentPreset[]

export function isAccentPreset(value: unknown): value is AccentPreset {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ACCENT_HUES, value)
}

export function accentHue(preset: AccentPreset): number {
  return ACCENT_HUES[preset]
}

// Applies the chosen accent to a root element by setting the --accent-h knob.
// Unknown/garbage values fall back to the default preset (THEME-4) rather than
// writing an invalid hue. Example: applyAccent(document.documentElement, 'mint').
export function applyAccent(root: HTMLElement, accent: unknown): void {
  const preset = isAccentPreset(accent) ? accent : DEFAULT_ACCENT
  root.style.setProperty('--accent-h', String(accentHue(preset)))
}
