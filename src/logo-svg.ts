// The MyTube mark as standalone SVG markup, colored for a given accent. Shared by
// the new-tab favicon (data URI) and the toolbar action icon raster in the service
// worker, so both recolor with the accent setting (THEME-10/11). Colors mirror the
// --accent, --accent-2 and --accent-ink tokens (styles/theme-tokens.css) evaluated
// at the preset's hue, so the standalone mark matches the in-app one.

import { AccentPreset, DEFAULT_ACCENT, accentHue, isAccentPreset } from './theme'

// Path data lifted verbatim from icons/icon.svg (the toolbar source of truth):
// the rounded play-badge with a bookmark notch, and the play triangle cutout.
export const BADGE_PATH =
  'M64 24H192C202.609 24 212.783 28.2143 220.284 35.7157C227.786 43.2172 232 53.3913 232 64V168C232 178.609 227.786 188.783 220.284 196.284C212.783 203.786 202.609 208 192 208H156.8C155.33 207.997 153.5 208 152 208C150.5 208 139.5 208 138 208L129.5 218L106.8 244.24C105.906 245.407 104.755 246.353 103.438 247.005C102.12 247.656 100.67 247.997 99.2 248H64C53.3913 248 43.2172 243.786 35.7157 236.284C28.2143 228.783 24 218.609 24 208V64C24 53.3913 28.2143 43.2172 35.7157 35.7157C43.2172 28.2143 53.3913 24 64 24Z'
export const PLAY_PATH =
  'M107.2 84.8L168 122.4C169 122.953 169.834 123.765 170.415 124.75C170.995 125.734 171.302 126.857 171.302 128C171.302 129.143 170.995 130.266 170.415 131.25C169.834 132.235 169 133.047 168 133.6L107.2 171.2C106.219 171.805 105.093 172.135 103.941 172.153C102.789 172.172 101.653 171.879 100.653 171.305C99.6534 170.732 98.8272 169.899 98.2617 168.895C97.6961 167.89 97.4122 166.752 97.44 165.6V90.4C97.4122 89.2479 97.6961 88.1096 98.2617 87.1054C98.8272 86.1012 99.6534 85.2683 100.653 84.6948C101.653 84.1212 102.789 83.8282 103.941 83.8467C105.093 83.8653 106.219 84.1946 107.2 84.8Z'

export interface AccentColors {
  light: string // gradient start (--accent)
  deep: string // gradient end (--accent-2)
  ink: string // play-triangle cutout (--accent-ink)
}

// Concrete colors for the accent — unknown/garbage falls back to the default.
export function accentColors(accent: unknown): AccentColors {
  const preset: AccentPreset = isAccentPreset(accent) ? accent : DEFAULT_ACCENT
  const h = accentHue(preset)
  return {
    light: `oklch(0.815 0.125 ${h})`,
    deep: `oklch(0.72 0.135 ${h})`,
    ink: `oklch(0.205 0.045 ${h})`,
  }
}

// Full SVG document for the mark, ready to embed as a favicon data URI or
// rasterize for the toolbar icon. 256×256 with an explicit intrinsic size so
// createImageBitmap can rasterize it in the service worker.
export function accentLogoSvg(accent: unknown): string {
  const c = accentColors(accent)
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" fill="none">' +
    '<defs><linearGradient id="g" x1="24" y1="24" x2="247.386" y2="231.43" gradientUnits="userSpaceOnUse">' +
    `<stop stop-color="${c.light}"/><stop offset="1" stop-color="${c.deep}"/></linearGradient></defs>` +
    `<path d="${BADGE_PATH}" fill="url(#g)"/>` +
    `<path d="${PLAY_PATH}" fill="${c.ink}"/>` +
    '</svg>'
  )
}
