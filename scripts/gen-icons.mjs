// Generates the extension's PNG toolbar icons from the official icons/icon.svg.
// Chrome MV3 manifest icons must be raster (PNG) — SVG is the single source of
// truth here and the PNGs are derived, so editing icon.svg is all you need.
// Rasterizes via the Chromium that Playwright already provides (no new dep).
// Run: node scripts/gen-icons.mjs   (needs: npx playwright install chromium)

import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const iconsDir = join(dir, '..', 'icons')
const rawSvg = readFileSync(join(iconsDir, 'icon.svg'), 'utf8')

const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  for (const size of [16, 48, 128]) {
    // Render the SVG at the exact pixel size, then screenshot it with a
    // transparent background (the notch / outside the badge stays clear).
    const svg = rawSvg
      .replace(/width="\d+"/, `width="${size}"`)
      .replace(/height="\d+"/, `height="${size}"`)
    await page.setViewportSize({ width: size, height: size })
    await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`, {
      waitUntil: 'load',
    })
    const buf = await page.locator('svg').first().screenshot({ omitBackground: true })
    writeFileSync(join(iconsDir, `icon${size}.png`), buf)
    console.log(`icons/icon${size}.png`)
  }
} finally {
  await browser.close()
}
