// Executable spec for specs/salvar-button.spec.md (SALVAR-MENU-*) — the geometry
// that places the portaled category menu relative to its button. The DOM wiring
// (portal, scroll tracking) stays Manual acceptance; this is the pure math.

import { describe, expect, it } from 'vitest'
import { DROPDOWN_MARGIN, placeDropdown } from './dropdown-position'

const viewport = { width: 1000, height: 800 }

describe('salvar-button.spec — category menu placement', () => {
  it('SALVAR-MENU-1: opens just below the button when there is room', () => {
    const { top, right } = placeDropdown({ top: 100, right: 400, bottom: 130 }, 200, viewport)
    expect(top).toBe(134) // button.bottom + 4 gap
    expect(right).toBe(600) // viewport.width - button.right
  })

  it('SALVAR-MENU-2: flips above the button when there is no room below', () => {
    // The /watch action bar pinned to the viewport bottom — opening downward put
    // the menu off-screen and unreachable (the reported top-of-page save bug).
    const { top } = placeDropdown({ top: 740, right: 400, bottom: 770 }, 200, viewport)
    expect(top).toBe(536) // button.top - 4 - 200, fully on-screen
  })

  it('SALVAR-MENU-3: clamps the right edge so the menu never leaves the viewport', () => {
    const { right } = placeDropdown({ top: 100, right: 1004, bottom: 130 }, 200, viewport)
    expect(right).toBe(DROPDOWN_MARGIN)
  })

  it('SALVAR-MENU-4: clamps the top to the margin when the menu is taller than both gaps', () => {
    const { top } = placeDropdown({ top: 400, right: 400, bottom: 430 }, 790, viewport)
    expect(top).toBe(DROPDOWN_MARGIN)
  })
})
