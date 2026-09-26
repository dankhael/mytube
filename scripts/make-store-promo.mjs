// Builds the designed Chrome Web Store listing images (1280×800 screenshots,
// the 440×280 small tile and the 1400×560 marquee): captures clean stills of
// the real packaged extension, then lays them into marketing boards styled
// after the Dopamine Toll store set, in MyTube's own brand.
// Run: npm run store:promo                          (build + capture + render)
//      node scripts/make-store-promo.mjs render     (re-render boards, no capture)

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extensionId } from './store-assets/browser.mjs'
import { prepareHome } from './promo-video/home-scenes.mjs'
import { captureHomeStills } from './store-promo/capture-home.mjs'
import { captureYoutubeStills } from './store-promo/capture-youtube.mjs'
import { renderBoards } from './store-promo/render-boards.mjs'
import { createStillShooter, launchStillBrowser } from './store-promo/stills.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const stillsDir = join(root, 'build', 'store-promo', 'stills')
const outDir = join(root, 'docs', 'store-assets', 'listing')

// YouTube first: its save lands a video in the library the home stills show.
async function captureStills() {
  const context = await launchStillBrowser(join(root, 'dist'))
  try {
    const id = await extensionId(context)
    const home = await prepareHome(context, id)
    const shoot = createStillShooter(stillsDir)
    await captureYoutubeStills(context, home, shoot)
    await captureHomeStills(context, id, shoot)
  } finally {
    await context.close()
  }
}

const [stage = 'all'] = process.argv.slice(2)
if (!['all', 'capture', 'render'].includes(stage)) {
  throw new Error(`unknown stage "${stage}"; expected all | capture | render`)
}
if (stage !== 'render') await captureStills()
if (stage !== 'capture') {
  for (const file of await renderBoards({ root, stillsDir, outDir })) console.log(file)
}
