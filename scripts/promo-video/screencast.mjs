// Records a page through the DevTools screencast instead of Playwright's
// `recordVideo`: that one encodes a ~1 Mbps VP8 stream, too soft for a promo.
// The screencast hands over near-lossless JPEG frames stamped with their paint
// time; they are re-timed into a constant-rate H.264 clip afterwards.

import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { FPS } from './storyboard.mjs'
import { H264, ffmpeg } from './ffmpeg.mjs'

// Frames only arrive when something repaints, so an idle stretch is simply the
// previous frame held until the next stamp — which the concat list encodes.
function concatList(frames, endStamp) {
  const lines = ['ffconcat version 1.0']
  frames.forEach((frame, index) => {
    const next = index + 1 < frames.length ? frames[index + 1].stamp : endStamp
    lines.push(`file '${basename(frame.file)}'`, `duration ${Math.max(next - frame.stamp, 0.001).toFixed(4)}`)
  })
  // The concat demuxer drops the last entry's duration unless it is repeated.
  lines.push(`file '${basename(frames.at(-1).file)}'`)
  return lines.join('\n')
}

// A take can open with a stray frame at another size (seen: 1440×812 while the
// viewport settles). The concat demuxer sizes the whole clip from its first
// frame, which squashed every later one — so off-size frames are dropped, and
// the output is pinned to the requested size regardless.
function framesAtSize(frames, size, outFile) {
  const matching = frames.filter((frame) => frame.width === size.width && frame.height === size.height)
  if (matching.length > 0) return matching
  const seen = [...new Set(frames.map((frame) => `${frame.width}×${frame.height}`))].join(', ')
  throw new Error(
    `screencast for ${outFile} has no ${size.width}×${size.height} frame; got ${seen || 'none'}`,
  )
}

async function encodeClip(framesDir, frames, size, endStamp, outFile) {
  const listFile = join(framesDir, 'frames.ffconcat')
  writeFileSync(listFile, concatList(framesAtSize(frames, size, outFile), endStamp))
  const vf = `fps=${FPS},scale=${size.width}:${size.height}`
  await ffmpeg(['-f', 'concat', '-safe', '0', '-i', listFile, '-vf', vf, ...H264, outFile])
}

function freshDir(dir) {
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
}

// Writes each pushed frame to disk as it arrives and acks it — the screencast
// stalls until every frame is acknowledged.
function collectFrames(cdp, framesDir) {
  const frames = []
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const file = join(framesDir, `f${String(frames.length).padStart(5, '0')}.jpg`)
    writeFileSync(file, Buffer.from(data, 'base64'))
    const size = { width: Math.round(metadata.deviceWidth), height: Math.round(metadata.deviceHeight) }
    frames.push({ file, stamp: metadata.timestamp, ...size })
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => undefined)
  })
  return frames
}

/**
 * Starts recording `page`; the returned `stop()` encodes everything since into
 * `outFile` (H.264 at FPS).
 * @example
 *   const recording = await startScreencast(page, { width: 1440, height: 900 }, 'build/clip.mp4')
 *   await page.click('button')
 *   await recording.stop()
 */
export async function startScreencast(page, size, outFile) {
  const framesDir = `${outFile}.frames`
  freshDir(framesDir)
  const cdp = await page.context().newCDPSession(page)
  const frames = collectFrames(cdp, framesDir)
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 95,
    maxWidth: size.width,
    maxHeight: size.height,
  })
  const stop = async () => {
    const endStamp = Date.now() / 1000
    await cdp.send('Page.stopScreencast')
    await cdp.detach()
    await encodeClip(framesDir, frames, size, endStamp, outFile)
    // KEEP_FRAMES=1 keeps the raw screencast JPEGs for debugging a bad take.
    if (!process.env.KEEP_FRAMES) rmSync(framesDir, { recursive: true, force: true })
  }
  return { stop }
}
