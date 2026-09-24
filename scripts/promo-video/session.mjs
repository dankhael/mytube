// Browser session for the promo recordings: the packaged extension loaded into
// a headless Chromium with the page overlay (visible cursor) on.
// - Headless, because a headed window gets resized by tiling window managers
//   and the screencast only sends the part on screen (clips came out
//   262–1413px wide). The full `chromium` channel is the headless build that
//   still loads extensions.
// - Pages are laid out at 1440×900 CSS px, not scaled up from 1280×800: the
//   screencast ignores an emulated deviceScaleFactor and sends 1× frames.

import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { enablePageOverlay } from './page-overlay.mjs'
import { createPointer } from './pointer.mjs'
import { startScreencast } from './screencast.mjs'

export const PAGE_VIEWPORT = { width: 1440, height: 900 }
export const POPUP_VIEWPORT = { width: 340, height: 600 }

// Signed-out YouTube ignores prefers-color-scheme in headless; PREF f6=400 is
// its own "dark theme" flag, which the injected MyTube chrome is styled for.
const YOUTUBE_DARK_COOKIE = {
  name: 'PREF',
  value: 'f6=400&hl=en',
  domain: '.youtube.com',
  path: '/',
  secure: true,
}

export async function launchRecordingBrowser(extensionPath) {
  const context = await chromium.launchPersistentContext('', {
    headless: true,
    channel: 'chromium',
    locale: 'en-US',
    colorScheme: 'dark',
    viewport: PAGE_VIEWPORT,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  })
  await enablePageOverlay(context)
  await context.addCookies([YOUTUBE_DARK_COOKIE])
  return context
}

/**
 * Records `act(pointer)` on `page` into `<clipsDir>/<id>.mp4` (plus the
 * pointer's trail in `<id>.pointer.json`), with a short still hold on both
 * ends so transitions have something to dissolve over.
 * @example
 *   await recordScene(page, 'home-search', clipsDir, async (pointer) => pointer.click(button))
 */
export async function recordScene(page, id, clipsDir, act, { viewport = PAGE_VIEWPORT, hold = 700 } = {}) {
  const pointer = createPointer(page, {
    x: viewport.width * 0.7,
    y: viewport.height * 0.62,
  })
  await pointer.park()
  const startMs = Date.now()
  const recording = await startScreencast(page, viewport, join(clipsDir, `${id}.mp4`))
  await page.waitForTimeout(hold)
  await act(pointer)
  await page.waitForTimeout(hold)
  await recording.stop()
  writeFileSync(join(clipsDir, `${id}.pointer.json`), JSON.stringify(pointer.trailSince(startMs)))
  console.log(`recorded ${id}`)
}
