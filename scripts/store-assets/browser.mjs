// Browser plumbing shared by every store-asset capture: launching Chromium with
// the packaged extension loaded, resolving its runtime id, and writing PNGs.

import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

export const VIEWPORT = { width: 1280, height: 800 }

// The popup is a fixed 340px column (popup.css) with a 600px min-height; the
// viewport matches so the shot has no dead chrome around it.
export const POPUP_VIEWPORT = { width: 340, height: 600 }

// `locale` pins both YouTube's UI language and the extension's own first-run
// language detection (service-worker.ts reads navigator.language), so the assets
// come out English on any machine. `colorScheme` puts YouTube in dark mode,
// which is what the injected MyTube chrome is designed against.
export async function launchWithExtension(extensionPath) {
  return chromium.launchPersistentContext('', {
    headless: false,
    locale: 'en-US',
    colorScheme: 'dark',
    viewport: VIEWPORT,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  })
}

export async function extensionId(context) {
  let [worker] = context.serviceWorkers()
  if (!worker) worker = await context.waitForEvent('serviceworker')
  return new URL(worker.url()).host
}

// Captures run headed, so whatever the machine's real pointer happens to sit on
// paints as a hover state. Synthesizing a move to a dead corner takes ownership
// of the page's mouse position, which clears it.
export function parkCursor(page) {
  return page.mouse.move(2, 2)
}

export function createShooter(outputDir) {
  mkdirSync(outputDir, { recursive: true })
  const taken = []
  const shot = async (page, name) => {
    await page.screenshot({ path: join(outputDir, `${name}.png`) })
    taken.push(name)
  }
  return { shot, taken }
}
