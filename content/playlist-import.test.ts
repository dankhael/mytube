// @vitest-environment jsdom
// Regression test: navigating (SPA) from /feed/playlists into a playlist left the
// import button floating bottom-right — over the miniplayer — until a hard
// reload, because placement was decided once, before the header rendered. The
// live header lookup stays Manual acceptance (IMPORT-DOM-1); this pins the
// re-placement rule given a host (or none).

import { beforeEach, describe, expect, it } from 'vitest'
import { placeImportButton } from './playlist-import'

const FLOATING = 'mytube-import-btn--floating'

function makeButton(): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.className = 'mytube-import-btn'
  return btn
}

describe('playlist-import — placeImportButton', () => {
  beforeEach(() => {
    // Floating buttons live on <html>, outside <body> — clear both.
    document.querySelectorAll('.mytube-import-btn').forEach((el) => el.remove())
    document.body.innerHTML = ''
  })

  it('floats the button when no header host is rendered yet', () => {
    const btn = makeButton()
    placeImportButton(btn, null)
    expect(btn.classList.contains(FLOATING)).toBe(true)
    expect(btn.parentElement).toBe(document.documentElement)
  })

  it('moves a floating button into the header once it renders', () => {
    const btn = makeButton()
    placeImportButton(btn, null)
    const host = document.body.appendChild(document.createElement('div'))
    placeImportButton(btn, host)
    expect(btn.parentElement).toBe(host)
    expect(btn.classList.contains(FLOATING)).toBe(false)
  })

  it('moves the button to a new header host after YouTube re-renders it', () => {
    const btn = makeButton()
    const oldHost = document.body.appendChild(document.createElement('div'))
    placeImportButton(btn, oldHost)
    const newHost = document.body.appendChild(document.createElement('div'))
    placeImportButton(btn, newHost)
    expect(btn.parentElement).toBe(newHost)
    expect(document.querySelectorAll('.mytube-import-btn')).toHaveLength(1)
  })

  it('keeps an already-floating button in place while the header is missing', () => {
    const btn = makeButton()
    placeImportButton(btn, null)
    placeImportButton(btn, null)
    expect(document.documentElement.querySelectorAll('.mytube-import-btn')).toHaveLength(1)
  })
})
