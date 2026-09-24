// Renders the self-drawn pieces of the promo from markup.mjs: title cards as
// frame-exact clips, and per-scene stage / caption PNGs. Cards are stepped, not
// screencast: every CSS animation is paused and seeked to each frame's time,
// so the motion is perfectly smooth whatever the machine's load.

import { chromium } from '@playwright/test'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { H264, ffmpeg } from './ffmpeg.mjs'
import { FPS } from './storyboard.mjs'

async function openMarkup(page, workDir, name, html) {
  const file = join(workDir, `${name}.html`)
  writeFileSync(file, html)
  await page.goto(pathToFileURL(file).href)
  await page.evaluate(() => document.fonts.ready)
}

function seekAnimations(page, ms) {
  return page.evaluate((time) => {
    for (const animation of document.getAnimations()) {
      animation.pause()
      animation.currentTime = time
    }
  }, ms)
}

async function renderCard(page, workDir, name, html, seconds) {
  await openMarkup(page, workDir, name, html)
  const framesDir = join(workDir, `${name}.frames`)
  rmSync(framesDir, { recursive: true, force: true })
  mkdirSync(framesDir, { recursive: true })
  const total = Math.round(seconds * FPS)
  for (let frame = 0; frame < total; frame++) {
    await seekAnimations(page, (frame * 1000) / FPS)
    await page.screenshot({
      path: join(framesDir, `f${String(frame).padStart(5, '0')}.png`),
    })
  }
  const outFile = join(workDir, `${name}.mp4`)
  await ffmpeg(['-framerate', String(FPS), '-i', join(framesDir, 'f%05d.png'), ...H264, outFile])
  rmSync(framesDir, { recursive: true, force: true })
  return outFile
}

async function renderPng(page, workDir, name, html, { frame, transparent = false, height = frame.height }) {
  await openMarkup(page, workDir, name, html)
  const path = join(workDir, `${name}.png`)
  const clip = { x: 0, y: 0, width: frame.width, height }
  await page.screenshot({ path, clip, omitBackground: transparent })
  return path
}

/**
 * Opens one headless page sized to `format.frame` for all still rendering and
 * hands back renderers.
 * @example
 *   const stills = await openStillRenderer(workDir, LANDSCAPE)
 *   await stills.card('intro', introCard(root, LANDSCAPE), 3.5)
 *   await stills.close()
 */
export async function openStillRenderer(workDir, format) {
  const frame = format.frame
  mkdirSync(workDir, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: frame })
  return {
    card: (name, html, seconds) => renderCard(page, workDir, name, html, seconds),
    stage: (name, html) => renderPng(page, workDir, name, html, { frame }),
    caption: (name, html) =>
      renderPng(page, workDir, name, html, { frame, transparent: true, height: format.caption.height }),
    close: () => browser.close(),
  }
}
