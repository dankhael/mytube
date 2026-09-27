// Builds the designed Chrome Web Store listing images (1280×800 screenshots,
// the 440×280 small tile and the 1400×560 marquee) plus the promo video's
// YouTube thumbnail (docs/promo-video/) and the support form header
// (docs/support/): captures clean stills of
// the real packaged extension, then lays them into marketing boards styled
// after the Dopamine Toll store set, in MyTube's own brand.
// English boards go to docs/store-assets/listing/, pt-BR to listing/pt-BR/.
// Run: npm run store:promo                              (build + capture + render, all languages)
//      node scripts/make-store-promo.mjs render         (re-render boards, no capture)
//      node scripts/make-store-promo.mjs all pt-BR      (one language)

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extensionId } from './store-assets/browser.mjs'
import { prepareHome } from './promo-video/home-scenes.mjs'
import { captureHomeStills, localizeLibrary } from './store-promo/capture-home.mjs'
import { COPY } from './store-promo/copy.mjs'
import { CAPTURE_LOCALES } from './store-promo/locales.mjs'
import { captureYoutubeStills } from './store-promo/capture-youtube.mjs'
import { renderBoards } from './store-promo/render-boards.mjs'
import { VIDEO_BOARDS } from './store-promo/boards-video.mjs'
import { FORMS_BOARDS } from './store-promo/boards-forms.mjs'
import { createStillShooter, launchStillBrowser } from './store-promo/stills.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const listingDir = join(root, 'docs', 'store-assets', 'listing')
const videoDir = join(root, 'docs', 'promo-video')
const supportDir = join(root, 'docs', 'support')

// English is the listing's default and stays at listing/; other languages get
// a subfolder (the dashboard takes screenshots per listing locale).
function outDirFor(lang) {
  return lang === 'en' ? listingDir : join(listingDir, lang)
}

const stillsDirFor = (lang) => join(root, 'build', 'store-promo', 'stills', lang)

// YouTube first: its save lands a video in the library the home stills show.
async function captureStills(lang) {
  const loc = CAPTURE_LOCALES[lang]
  const context = await launchStillBrowser(join(root, 'dist'), loc)
  try {
    const id = await extensionId(context)
    const home = await prepareHome(context, id)
    await localizeLibrary(home, loc)
    const shoot = createStillShooter(stillsDirFor(lang))
    await captureYoutubeStills(context, home, shoot, loc)
    await captureHomeStills(context, id, shoot, loc)
  } finally {
    await context.close()
  }
}

async function renderLanguage(lang) {
  const stillsDir = stillsDirFor(lang)
  const written = await renderBoards({ root, stillsDir, outDir: outDirFor(lang), copy: COPY[lang] })
  // The video thumbnail and the support form header are English-only.
  if (lang === 'en') {
    const extras = [
      { outDir: videoDir, boards: VIDEO_BOARDS },
      { outDir: supportDir, boards: FORMS_BOARDS },
    ]
    for (const { outDir, boards } of extras) {
      written.push(...(await renderBoards({ root, stillsDir, outDir, copy: COPY.en, boards })))
    }
  }
  return written
}

const [stage = 'all', ...langArgs] = process.argv.slice(2)
if (!['all', 'capture', 'render'].includes(stage)) {
  throw new Error(`unknown stage "${stage}"; expected all | capture | render, then [languages: en pt-BR]`)
}
const langs = langArgs.length ? langArgs : Object.keys(CAPTURE_LOCALES)
for (const lang of langs) {
  if (!CAPTURE_LOCALES[lang])
    throw new Error(`unknown language "${lang}"; expected one of ${Object.keys(CAPTURE_LOCALES)}`)
  if (stage !== 'render') await captureStills(lang)
  if (stage !== 'capture') for (const file of await renderLanguage(lang)) console.log(file)
}
