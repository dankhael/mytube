// Generates the store / documentation artwork from the real packaged extension
// UI: the curated home, the toolbar popup and settings, the chrome injected on
// youtube.com, and the branded promo tile.
// Run: npm run store:assets (needs: npx playwright install chromium)

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createShooter, extensionId, launchWithExtension } from './store-assets/browser.mjs'
import { captureHomeScreens, openHome } from './store-assets/home-shots.mjs'
import { capturePopupScreens } from './store-assets/popup-shots.mjs'
import { captureYoutubeScreens } from './store-assets/youtube-shots.mjs'
import { capturePromo } from './store-assets/promo.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = join(root, 'docs', 'store-assets')
const { shot, taken } = createShooter(outputDir)

const context = await launchWithExtension(join(root, 'dist'))

try {
  const id = await extensionId(context)
  // Home first: it seeds the shared library every later surface reads.
  await captureHomeScreens(context, id, shot)
  await capturePopupScreens(context, id, shot)
  const settingsPage = await openHome(context, id)
  await captureYoutubeScreens(context, settingsPage, shot)
  await settingsPage.close()
  await capturePromo(context, join(root, 'icons', 'icon.svg'), shot)
} finally {
  await context.close()
  for (const name of taken) console.log(`docs/store-assets/${name}.png`)
}
