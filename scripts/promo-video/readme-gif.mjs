// The README's demo GIF: the "save from YouTube → open your home" stretch of
// the 1080p cut. GitHub won't play repo-relative video in a README, so a GIF
// it is — 800px at 12 fps with a per-clip palette keeps it around 2 MB.
// The window comes from the cut's own timeline, so a re-record never leaves
// the GIF cutting mid-scene.

import { readFileSync } from 'node:fs'
import { ffmpeg } from './ffmpeg.mjs'

const GIF_WIDTH = 800
const GIF_FPS = 12
// Skip the cross-fade on each end, so the GIF opens and closes on a clean frame.
const EDGE_S = 0.3

function stampSeconds(stamp) {
  const [minutes, seconds] = stamp.split(':')
  return Number(minutes) * 60 + Number(seconds)
}

/**
 * Start and duration (seconds) covering scene `fromId` up to where scene
 * `untilId` begins, read from a compose timeline (compose.mjs timelineText).
 * @example gifWindow('0:03.0  yt-save  …\n0:15.9  home-search  …', 'yt-save', 'home-search') // { start: 3.3, duration: 12.3 }
 */
export function gifWindow(timeline, fromId, untilId) {
  const starts = new Map(
    timeline
      .split('\n')
      .map((line) => line.trim().split(/\s+/))
      .filter(([stamp, id]) => /^\d+:\d+(\.\d+)?$/.test(stamp) && id)
      .map(([stamp, id]) => [id, stampSeconds(stamp)]),
  )
  for (const id of [fromId, untilId]) {
    if (!starts.has(id))
      throw new Error(`timeline has no scene "${id}"; found: ${[...starts.keys()].join(', ')}`)
  }
  const start = starts.get(fromId) + EDGE_S
  const duration = starts.get(untilId) - EDGE_S - start
  return { start: Number(start.toFixed(2)), duration: Number(duration.toFixed(2)) }
}

/**
 * Cuts the save-then-home stretch of `video` into an optimized GIF at `outFile`.
 * @example await exportReadmeGif({ video: 'build/promo-video/mytube-promo-1080p.mp4', timelineFile, outFile: 'docs/readme/demo.gif' })
 */
export async function exportReadmeGif({ video, timelineFile, outFile }) {
  const { start, duration } = gifWindow(readFileSync(timelineFile, 'utf8'), 'yt-save', 'home-search')
  const palette =
    'split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];' +
    '[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle'
  const vf = `fps=${GIF_FPS},scale=${GIF_WIDTH}:-1:flags=lanczos,${palette}`
  await ffmpeg(['-ss', String(start), '-t', String(duration), '-i', video, '-vf', vf, outFile])
  return outFile
}
