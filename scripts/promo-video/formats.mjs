// Output formats of the promo: the same takes framed for a landscape player
// (YouTube, the store listing) and for vertical feeds (Shorts, Reels, TikTok).
// Everything positional lives here so markup.mjs and compose.mjs stay
// format-agnostic.

// Takes are filmed at 1440×900 (session.mjs PAGE_VIEWPORT).
export const TAKE = { width: 1440, height: 900 }

function windowBox({ x, y, width, cropWidth }) {
  const titlebar = 42
  const contentHeight = Math.round((width * TAKE.height) / cropWidth)
  return { x, y, width, titlebar, contentY: y + titlebar, contentHeight }
}

// The window is sized so a 1440×900 take scales by 0.978 — close enough to 1:1
// to stay crisp. The caption sits in the band under the window.
const landscapeWindow = windowBox({ x: 256, y: 36, width: 1408, cropWidth: TAKE.width })

export const LANDSCAPE = {
  name: '1080p',
  frame: { width: 1920, height: 1080 },
  window: landscapeWindow,
  cropWidth: null,
  popup: { width: 408, height: 720, x: 256 + 1408 - 408 - 18, y: landscapeWindow.contentY + 6 },
  caption: { y: landscapeWindow.contentY + landscapeWindow.contentHeight + 14, height: 110, font: 36 },
  brandBar: null,
}

// Vertical: a 720px-wide (4:5) slice of each take, following the pointer, is
// magnified ~1.4× into a 1000px window so UI text reads on a phone. Brand and
// caption sit above it; the bottom ~250px stays clear because Shorts/Reels
// paint their own title and buttons there.
const verticalWindow = windowBox({ x: 40, y: 400, width: 1000, cropWidth: 720 })

export const VERTICAL = {
  name: 'vertical',
  frame: { width: 1080, height: 1920 },
  window: verticalWindow,
  cropWidth: 720,
  popup: { width: 612, height: 1080, x: 40 + 1000 - 612 - 16, y: verticalWindow.contentY + 12 },
  caption: { y: 205, height: 190, font: 54 },
  brandBar: { y: 80 },
}

export const FORMATS = [LANDSCAPE, VERTICAL]
