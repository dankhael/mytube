// Browser session for the promo recordings: the packaged extension loaded into
// a headless Chromium with the page overlay (visible cursor) on.
// - Headless, because a headed window gets resized by tiling window managers
//   and the screencast only sends the part on screen (clips came out
//   262–1413px wide). The full `chromium` channel is the headless build that
//   still loads extensions.
// - Pages are laid out at the format's take size in CSS px (formats.mjs), not
//   scaled up: the screencast ignores an emulated deviceScaleFactor and sends
//   1× frames.

import { chromium } from '@playwright/test'
import { join } from 'node:path'
import { enablePageOverlay } from './page-overlay.mjs'
import { createPointer } from './pointer.mjs'
import { startScreencast } from './screencast.mjs'

// Signed-out YouTube ignores prefers-color-scheme in headless; PREF f6=400 is
// its own "dark theme" flag, which the injected MyTube chrome is styled for.
// `hl` pins YouTube's UI language to match the take.
function youtubeDarkCookie(hl) {
  return { name: 'PREF', value: `f6=400&hl=${hl}`, domain: '.youtube.com', path: '/', secure: true }
}

/**
 * Headless Chromium with the extension loaded, laying pages out at `viewport`.
 * `deviceScaleFactor` only affects screenshots (stills): the screencast used
 * for video takes stays at 1× regardless. `locale` / `youtubeHl` set the
 * browser and YouTube languages (the store-promo pt-BR stills).
 * @example const context = await launchRecordingBrowser('dist', VERTICAL.take)
 */
export async function launchRecordingBrowser(
  extensionPath,
  viewport,
  { deviceScaleFactor = 1, locale = 'en-US', youtubeHl = 'en' } = {},
) {
  const context = await chromium.launchPersistentContext('', {
    headless: true,
    channel: 'chromium',
    locale,
    colorScheme: 'dark',
    viewport,
    deviceScaleFactor,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  })
  await enablePageOverlay(context)
  await context.addCookies([youtubeDarkCookie(youtubeHl)])
  return context
}

/**
 * Records `act(pointer)` on `page` into `<clipsDir>/<id>.mp4` at the page's
 * own viewport, with a short still hold on both ends so transitions have
 * something to dissolve over.
 * @example
 *   await recordScene(page, 'home-search', clipsDir, async (pointer) => pointer.click(button))
 */
export async function recordScene(page, id, clipsDir, act, { hold = 700 } = {}) {
  const viewport = page.viewportSize()
  const pointer = createPointer(page, {
    x: viewport.width * 0.7,
    y: viewport.height * 0.62,
  })
  await pointer.park()
  const recording = await startScreencast(page, viewport, join(clipsDir, `${id}.mp4`))
  await page.waitForTimeout(hold)
  await act(pointer)
  await page.waitForTimeout(hold)
  await recording.stop()
  console.log(`recorded ${id}`)
}
