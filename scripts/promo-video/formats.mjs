// Output formats of the promo: a landscape cut (YouTube, the store listing)
// and a vertical one (Shorts, Reels, TikTok). Each format films its own takes
// at its own viewport — the vertical cut is recorded with the pages laid out
// in portrait, so the whole UI is on screen instead of a slice of a landscape
// take. Everything positional lives here so markup.mjs and compose.mjs stay
// format-agnostic.

// The toolbar popup's real CSS size (popup.css: 340px column, 600px min-height).
export const POPUP_VIEWPORT = { width: 340, height: 600 }

const TITLEBAR = 42

function windowBox({ x, y, width, take }) {
  const contentHeight = Math.round((width * take.height) / take.width)
  return { x, y, width, titlebar: TITLEBAR, contentY: y + TITLEBAR, contentHeight }
}

// Pinned under the window's toolbar icon (right edge), at `scale`.
function popupBox(window, scale) {
  const width = Math.round(POPUP_VIEWPORT.width * scale)
  const height = Math.round(POPUP_VIEWPORT.height * scale)
  return { width, height, x: window.x + window.width - width - 18, y: window.contentY + 8 }
}

// 1440×900 takes scale by 0.978 into the window — close enough to 1:1 to stay
// crisp. The caption sits in the band under the window. The popup is blown up
// past the window's scale (1.2×) so its text reads at 1080p.
const LANDSCAPE_TAKE = { width: 1440, height: 900 }
const landscapeWindow = windowBox({ x: 256, y: 36, width: 1408, take: LANDSCAPE_TAKE })

export const LANDSCAPE = {
  name: '1080p',
  frame: { width: 1920, height: 1080 },
  take: LANDSCAPE_TAKE,
  window: landscapeWindow,
  popup: popupBox(landscapeWindow, 1.2),
  caption: { y: landscapeWindow.contentY + landscapeWindow.contentHeight + 14, height: 110, font: 36 },
  brandBar: null,
}

// 760px is the narrowest width where the home header (search, Watched,
// + Category) still fits on one row; at 640 the Category button falls off the
// edge. Scaled ~1.32× into a 1000px window, so UI text reads on a phone. The
// popup keeps the window's scale. The bottom ~180px stays clear because
// Shorts/Reels paint their own title and buttons there.
const VERTICAL_TAKE = { width: 760, height: 1040 }
const verticalWindow = windowBox({ x: 40, y: 330, width: 1000, take: VERTICAL_TAKE })

export const VERTICAL = {
  name: 'vertical',
  frame: { width: 1080, height: 1920 },
  take: VERTICAL_TAKE,
  window: verticalWindow,
  popup: popupBox(verticalWindow, verticalWindow.width / VERTICAL_TAKE.width),
  caption: { y: 150, height: 170, font: 50 },
  brandBar: { y: 56 },
}

export const FORMATS = [LANDSCAPE, VERTICAL]

/**
 * Formats named in `names` (all of them when none is named).
 * @example pickFormats(['vertical', 'home-search']) // [VERTICAL]
 */
export function pickFormats(names) {
  const named = FORMATS.filter((format) => names.includes(format.name))
  return named.length ? named : FORMATS
}
