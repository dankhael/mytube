// Builds the MyTube promo video from the real packaged extension: films each
// scene in a headless Chromium, renders the title cards and captions, and
// composes a 1920×1080 cut and a 1080×1920 vertical one (H.264) — silent, so
// music and narration can be laid in by hand (see docs/promo-video/NARRATION.md).
// Each format films its own takes (the vertical one with pages in portrait).
// Arguments after the stage are format names and/or scene ids; none = all.
// Run: npm run promo:video                                (build + record + compose both)
//      node scripts/make-promo-video.mjs compose          (re-cut, no re-record)
//      node scripts/make-promo-video.mjs all vertical     (one format only)
//      node scripts/make-promo-video.mjs record vertical home-search   (one retake)
//      node scripts/make-promo-video.mjs gif              (README demo GIF from the 1080p cut)

import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { composeVideo } from './promo-video/compose.mjs'
import { FORMATS, pickFormats } from './promo-video/formats.mjs'
import { recordAllScenes } from './promo-video/record.mjs'
import { exportReadmeGif } from './promo-video/readme-gif.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'build', 'promo-video')
const clipsDir = join(outDir, 'clips')
mkdirSync(clipsDir, { recursive: true })

const [stage = 'all', ...names] = process.argv.slice(2)
if (stage === 'gif') {
  const video = join(outDir, 'mytube-promo-1080p.mp4')
  const timelineFile = join(outDir, 'timeline-1080p.txt')
  console.log(
    await exportReadmeGif({ video, timelineFile, outFile: join(root, 'docs', 'readme', 'demo.gif') }),
  )
  process.exit(0)
}
if (!['all', 'record', 'compose'].includes(stage)) {
  throw new Error(
    `unknown stage "${stage}"; expected all | record | compose | gif, then [format names] [scene ids]`,
  )
}
const formatNames = new Set(FORMATS.map((format) => format.name))
const sceneIds = names.filter((name) => !formatNames.has(name))

for (const format of pickFormats(names)) {
  const formatClips = join(clipsDir, format.name)
  mkdirSync(formatClips, { recursive: true })
  if (stage !== 'compose') {
    const only = sceneIds.length ? new Set(sceneIds) : null
    await recordAllScenes(join(root, 'dist'), formatClips, format.take, only)
  }
  if (stage !== 'record') {
    console.log(`\n${await composeVideo({ root, outDir, clipsDir: formatClips, format })}`)
  }
}
