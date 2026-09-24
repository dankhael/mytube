// Builds the MyTube promo video from the real packaged extension: films each
// scene in a headless Chromium, renders the title cards and captions, and
// composes a 1920×1080 cut and a 1080×1920 vertical one (H.264) — silent, so
// music and narration can be laid in by hand (see docs/promo-video/NARRATION.md).
// Run: npm run promo:video                 (build + record + compose both)
//      node scripts/make-promo-video.mjs compose          (re-cut, no re-record)
//      node scripts/make-promo-video.mjs compose vertical (one format only)
//      node scripts/make-promo-video.mjs record home-search yt-save   (retakes)

import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { composeVideo } from './promo-video/compose.mjs'
import { FORMATS } from './promo-video/formats.mjs'
import { recordAllScenes } from './promo-video/record.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'build', 'promo-video')
const clipsDir = join(outDir, 'clips')
mkdirSync(clipsDir, { recursive: true })

const [stage = 'all', ...names] = process.argv.slice(2)
if (!['all', 'record', 'compose'].includes(stage)) {
  throw new Error(`unknown stage "${stage}"; expected all | record [scene ids…] | compose [1080p|vertical]`)
}

if (stage !== 'compose') {
  await recordAllScenes(join(root, 'dist'), clipsDir, names.length ? new Set(names) : null)
}
if (stage !== 'record') {
  const wanted = stage === 'compose' && names.length ? names : FORMATS.map((format) => format.name)
  for (const format of FORMATS.filter((f) => wanted.includes(f.name))) {
    console.log(`\n${await composeVideo({ root, outDir, clipsDir, format })}`)
  }
}
