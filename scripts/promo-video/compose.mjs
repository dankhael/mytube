// Composes a finished cut for one output format (formats.mjs): every take is
// framed on the stage as a segment (window, caption, optional zoom, and — in
// the vertical cut — a slice that pans with the pointer), then the segments
// are chained with cross-fades in storyboard order. Writes the MP4 plus a
// timeline of where each scene starts, for laying narration and music on top.

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { H264, ffmpeg, probeSeconds } from './ffmpeg.mjs'
import { TAKE } from './formats.mjs'
import { captionMarkup, introCard, outroCard, stageMarkup } from './markup.mjs'
import { POPUP_BACKDROP } from './popup-scene.mjs'
import { focusCropX, followCropXs, sendcmdScript } from './reframe.mjs'
import { openStillRenderer } from './render-stills.mjs'
import { FPS, STORYBOARD, TRANSITION_S } from './storyboard.mjs'

const ZOOM_EASE_S = 0.8

// ImageMagick draws the rounded-corner alpha masks (top corners stay square:
// they sit flush under the title bar). The only other binary the cut needs.
function roundedMask(workDir, name, width, height, radius) {
  const file = join(workDir, `${name}.png`)
  const shape = `roundrectangle 0,-${radius * 2} ${width - 1},${height - 1} ${radius},${radius}`
  const args = ['-size', `${width}x${height}`, 'xc:black', '-fill', 'white', '-draw', shape, file]
  const result = spawnSync('magick', args)
  if (result.status !== 0) throw new Error(`magick failed drawing mask ${file}: ${result.stderr}`)
  return file
}

function readSidecar(clipsDir, id, kind) {
  const file = join(clipsDir, `${id}.${kind}.json`)
  if (!existsSync(file))
    throw new Error(`missing ${file}; re-record: node scripts/make-promo-video.mjs record ${id}`)
  return JSON.parse(readFileSync(file, 'utf8'))
}

// Eased zoom onto the saved focus box: smoothstep from 1× to `zoom` over
// ZOOM_EASE_S. The take is upscaled 2× first so the pan doesn't stair-step.
function zoomFilter(focus, box) {
  const progress = `clip((on/${FPS}-${focus.from})/${ZOOM_EASE_S},0,1)`
  const eased = `(${progress})*(${progress})*(3-2*(${progress}))`
  const cx = (box.x + box.width / 2) * 2
  const cy = (box.y + box.height / 2) * 2
  return (
    `scale=${TAKE.width * 2}:${TAKE.height * 2},` +
    `zoompan=z='1+${focus.zoom - 1}*${eased}':x='clip(${cx}-iw/zoom/2,0,iw-iw/zoom)'` +
    `:y='clip(${cy}-ih/zoom/2,0,ih-ih/zoom)':d=1:s=${TAKE.width}x${TAKE.height}:fps=${FPS}`
  )
}

// Vertical slice of the take: pinned (`vertical.x`), parked on the zoom's
// focus, or panning with the pointer via a per-frame sendcmd script.
function cropFilter(scene, format, ctx) {
  const crop = `w=${format.cropWidth}:h=${TAKE.height}:y=0`
  const size = { takeWidth: TAKE.width, cropWidth: format.cropWidth }
  if (scene.vertical?.x !== undefined) return `crop=${crop}:x=${scene.vertical.x}`
  if (scene.focus) {
    const x = focusCropX(readSidecar(ctx.clipsDir, scene.id, 'focus'), focusFor(scene, format).zoom, size)
    return `crop=${crop}:x=${x}`
  }
  const trail = readSidecar(ctx.clipsDir, scene.id, 'pointer')
  const frames = Math.ceil(ctx.seconds * FPS) + 1
  const xs = followCropXs(trail, { frames, fps: FPS, speed: scene.speed ?? 1, ...size })
  const script = join(ctx.workDir, `follow-${scene.id}.cmd`)
  writeFileSync(script, sendcmdScript(xs, FPS))
  return `sendcmd=f='${script}',crop@follow=${crop}:x=${xs[0]}`
}

// The vertical slice is narrower than the frame, so a scene may ask for a
// gentler zoom there (`focus.verticalZoom`).
function focusFor(scene, format) {
  if (!scene.focus) return null
  const zoom = format.cropWidth ? (scene.focus.verticalZoom ?? scene.focus.zoom) : scene.focus.zoom
  return { ...scene.focus, zoom }
}

function takeFilter(scene, format, ctx) {
  const steps = [`setpts=PTS/${scene.speed ?? 1}`, `fps=${FPS}`]
  const focus = focusFor(scene, format)
  if (focus) steps.push(zoomFilter(focus, readSidecar(ctx.clipsDir, scene.id, 'focus')))
  if (format.cropWidth && scene.layout === 'window') steps.push(cropFilter(scene, format, ctx))
  return steps.join(',')
}

function captionFilter(format, seconds) {
  const fadeIn = 0.35
  const fadeOut = Math.max(seconds - 0.6, fadeIn + 0.5)
  return (
    `[2:v]format=rgba,fade=in:st=${fadeIn}:d=0.45:alpha=1,fade=out:st=${fadeOut}:d=0.4:alpha=1[cap];` +
    `[framed][cap]overlay=0:y='${format.caption.y}+max(0,1-(t-${fadeIn})/0.45)*16':eval=frame[out]`
  )
}

// Window layout: the take fills the window's content box; popup layout: the
// popup take floats at its toolbar anchor over the pre-drawn home still.
function placementFilter(scene, format, ctx) {
  const { window: w, popup } = format
  const isPopup = scene.layout === 'popup'
  const size = isPopup ? popup : { width: w.width, height: w.contentHeight }
  const at = isPopup ? popup : { x: w.x, y: w.contentY }
  return (
    `[1:v]${takeFilter(scene, format, ctx)},scale=${size.width}:${size.height}:flags=lanczos,format=rgba[take];` +
    `[3:v]format=gray[mask];[take][mask]alphamerge[shaped];` +
    `[0:v][shaped]overlay=${at.x}:${at.y}:shortest=1[framed];`
  )
}

async function renderSceneSegment(scene, format, stills, dirs) {
  const take = join(dirs.clipsDir, `${scene.id}.mp4`)
  if (!existsSync(take))
    throw new Error(`missing take ${take}; run: node scripts/make-promo-video.mjs record ${scene.id}`)
  const seconds = (await probeSeconds(take)) / (scene.speed ?? 1)
  const isPopup = scene.layout === 'popup'
  const backdropSrc = isPopup ? pathToFileURL(join(dirs.clipsDir, POPUP_BACKDROP)).href : null
  const stage = await stills.stage(
    `stage-${scene.id}`,
    stageMarkup(dirs.root, format, { url: scene.url, backdropSrc }),
  )
  const caption = await stills.caption(`caption-${scene.id}`, captionMarkup(dirs.root, format, scene.caption))
  const out = join(dirs.workDir, `segment-${scene.id}.mp4`)
  const still = (file) => ['-loop', '1', '-t', seconds.toFixed(3), '-i', file]
  const graph = placementFilter(scene, format, { ...dirs, seconds }) + captionFilter(format, seconds)
  // prettier-ignore
  await ffmpeg([
    ...still(stage), '-i', take, ...still(caption), ...still(isPopup ? dirs.popupMask : dirs.windowMask),
    '-filter_complex', graph, '-map', '[out]', '-t', seconds.toFixed(3), '-r', String(FPS), ...H264, out,
  ])
  return { id: scene.id, file: out, seconds }
}

async function renderCardSegment(scene, format, stills, root) {
  const html = scene.id === 'intro' ? introCard(root, format) : outroCard(root, format)
  const file = await stills.card(`segment-${scene.id}`, html, scene.seconds)
  return { id: scene.id, file, seconds: scene.seconds }
}

// Each xfade starts TRANSITION_S before the running cut ends, so scene k
// begins at the sum of the earlier lengths minus one overlap per seam.
function chainCrossfades(segments) {
  const starts = [0]
  const filters = []
  let label = '0:v'
  let length = segments[0].seconds
  segments.slice(1).forEach((segment, index) => {
    const offset = length - TRANSITION_S
    starts.push(offset)
    const next = `v${index + 1}`
    filters.push(
      `[${label}][${index + 1}:v]xfade=transition=fade:duration=${TRANSITION_S}:offset=${offset.toFixed(3)}[${next}]`,
    )
    label = next
    length = offset + segment.seconds
  })
  return { graph: filters.join(';'), label, starts, length }
}

function timelineText(segments, starts, length) {
  const stamp = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`
  const rows = segments.map((segment, i) => {
    const caption = STORYBOARD.find((scene) => scene.id === segment.id).caption ?? '(title card)'
    return `${stamp(starts[i])}  ${segment.id.padEnd(14)} ${caption}`
  })
  return `${rows.join('\n')}\n${stamp(length)}  end\n`
}

async function renderSegments(format, dirs) {
  const stills = await openStillRenderer(dirs.workDir, format)
  const segments = []
  try {
    for (const scene of STORYBOARD) {
      const isCard = scene.layout === 'card'
      const render = isCard
        ? renderCardSegment(scene, format, stills, dirs.root)
        : renderSceneSegment(scene, format, stills, dirs)
      segments.push(await render)
      console.log(`[${format.name}] segment ${scene.id} (${segments.at(-1).seconds.toFixed(1)}s)`)
    }
  } finally {
    await stills.close()
  }
  return segments
}

/**
 * Renders all segments of `format` and the final cross-faded cut; returns a
 * summary line.
 * @example await composeVideo({ root, outDir: 'build/promo-video', clipsDir: 'build/promo-video/clips', format: VERTICAL })
 */
export async function composeVideo({ root, outDir, clipsDir, format }) {
  const workDir = join(outDir, 'work', format.name)
  const { window: w, popup } = format
  mkdirSync(workDir, { recursive: true })
  const segments = await renderSegments(format, {
    root,
    clipsDir,
    workDir,
    windowMask: roundedMask(workDir, 'mask-window', w.width, w.contentHeight, 14),
    popupMask: roundedMask(workDir, 'mask-popup', popup.width, popup.height, 12),
  })
  const { graph, label, starts, length } = chainCrossfades(segments)
  const output = join(outDir, `mytube-promo-${format.name}.mp4`)
  const inputs = segments.flatMap((segment) => ['-i', segment.file])
  const encode = [...H264, '-crf', '17', '-movflags', '+faststart']
  await ffmpeg([...inputs, '-filter_complex', graph, '-map', `[${label}]`, ...encode, output])
  // Both formats share one timeline (same takes, same order), so either writes it.
  writeFileSync(join(outDir, 'timeline.txt'), timelineText(segments, starts, length))
  return `${output} (${length.toFixed(1)}s)`
}
