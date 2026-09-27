// Still-capture plumbing for the store promo boards: a 2× browser session on
// the promo-video overlay (dark YouTube, ad slots hidden) with the cursor
// turned off, and a shooter that writes page or element screenshots.
// 2× so panels stay crisp when a board scales them down.

import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { launchRecordingBrowser } from '../promo-video/session.mjs'

export const STILL_VIEWPORT = { width: 1440, height: 900 }

// Stills never show the recording cursor; re-applied after every navigation
// because a reload drops injected styles.
export function hideCursor(page) {
  return page.addStyleTag({ content: '.promo-cursor{display:none!important}' })
}

/**
 * Headless 2× session with the extension loaded, for stills, with the
 * browser and YouTube in `loc`'s language.
 * @example const context = await launchStillBrowser('dist', CAPTURE_LOCALES.en)
 */
export function launchStillBrowser(extensionPath, loc) {
  const { browserLocale: locale, youtubeHl } = loc
  return launchRecordingBrowser(extensionPath, STILL_VIEWPORT, { deviceScaleFactor: 2, locale, youtubeHl })
}

/**
 * Screenshots a page (viewport, or `clip`) or a locator's element into
 * `<dir>/<name>.png`; transparent where the element has no background.
 * @example const shoot = createStillShooter('build/store-promo/stills'); await shoot(page, 'home')
 */
export function createStillShooter(dir) {
  mkdirSync(dir, { recursive: true })
  return async (target, name, { clip } = {}) => {
    const path = join(dir, `${name}.png`)
    await target.screenshot({ path, clip, animations: 'disabled' })
    console.log(`still ${name}`)
    return path
  }
}
