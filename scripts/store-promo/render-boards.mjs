// Renders every board to a PNG at its exact store size. Boards are plain HTML
// documents (boards-*.mjs) written to a work folder and screenshotted at 1×,
// so the file dimensions are exactly what the Chrome Web Store demands.

import { chromium } from '@playwright/test'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { PROMO_BOARDS } from './boards-promo.mjs'
import { SHOT_BOARDS } from './boards-shots.mjs'

export const BOARDS = [...SHOT_BOARDS, ...PROMO_BOARDS]

function stillResolver(stillsDir) {
  return (name) => {
    const file = join(stillsDir, `${name}.png`)
    if (!existsSync(file))
      throw new Error(`missing still ${file}; run: node scripts/make-store-promo.mjs capture`)
    return pathToFileURL(file).href
  }
}

async function renderBoard(page, board, html, workDir, outDir) {
  const htmlFile = join(workDir, board.file.replace(/\.png$/, '.html'))
  writeFileSync(htmlFile, html)
  await page.setViewportSize(board.size)
  await page.goto(pathToFileURL(htmlFile).href)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => [...document.images].every((image) => image.complete))
  const out = join(outDir, board.file)
  await page.locator('.board').screenshot({ path: out })
  return out
}

/**
 * Renders `boards` (default: the store listing set) in one language (`copy`,
 * from copy.mjs) from the stills into `outDir`; returns the written paths.
 * @example await renderBoards({ root, stillsDir: 'build/store-promo/stills/en', outDir: 'docs/store-assets/listing', copy: COPY.en })
 */
export async function renderBoards({ root, stillsDir, outDir, copy, boards = BOARDS }) {
  // One HTML work folder per output folder, so languages never overwrite each other.
  const workDir = join(root, 'build', 'store-promo', 'boards', relative(root, outDir))
  mkdirSync(workDir, { recursive: true })
  mkdirSync(outDir, { recursive: true })
  const still = stillResolver(stillsDir)
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    const written = []
    for (const board of boards)
      written.push(await renderBoard(page, board, board.html(root, still, copy), workDir, outDir))
    return written
  } finally {
    await browser.close()
  }
}
