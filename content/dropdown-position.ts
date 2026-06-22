// Pure geometry for placing the portaled category menu relative to its button.
// Extracted from content.ts so the placement math (flip-when-no-room-below,
// viewport clamping) is unit-testable without the YouTube DOM / chrome runtime.

export interface AnchorRect {
  top: number
  right: number
  bottom: number
}

export interface Viewport {
  width: number
  height: number
}

export interface MenuPlacement {
  top: number
  right: number
}

export const DROPDOWN_MARGIN = 8 // keep this gap from every viewport edge
const ANCHOR_GAP = 4 // gap between the button and the menu

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

// Place the menu under the button, but flip it above when there isn't room
// below — a save from the top of a /watch page sits the action bar at the
// viewport bottom, and opening downward left the menu off-screen and
// unreachable (GitHub save-menu report). Both axes are clamped so the menu
// always lands fully inside the viewport, whatever the button's position.
export function placeDropdown(
  button: AnchorRect,
  menuHeight: number,
  viewport: Viewport,
): MenuPlacement {
  const roomBelow = viewport.height - button.bottom - ANCHOR_GAP
  const roomAbove = button.top - ANCHOR_GAP
  const openUp = roomBelow < menuHeight && roomAbove >= menuHeight

  const rawTop = openUp ? button.top - ANCHOR_GAP - menuHeight : button.bottom + ANCHOR_GAP
  const maxTop = Math.max(DROPDOWN_MARGIN, viewport.height - menuHeight - DROPDOWN_MARGIN)
  const top = Math.round(clamp(rawTop, DROPDOWN_MARGIN, maxTop))

  const right = Math.round(Math.max(DROPDOWN_MARGIN, viewport.width - button.right))
  return { top, right }
}
