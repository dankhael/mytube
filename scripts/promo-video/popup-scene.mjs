// The toolbar popup scene. The real popup is a browser-owned bubble a page
// can't film, so the popup page is recorded on its own at its 340px column
// width and composed over a still of the home, anchored under a toolbar icon.

import { join } from 'node:path'
import { waitForImages } from '../store-assets/seed.mjs'
import { scrollHomeToTop } from './home-scenes.mjs'
import { POPUP_VIEWPORT, recordScene } from './session.mjs'

export const POPUP_BACKDROP = 'popup-backdrop.png'

async function openPopup(context, id) {
  const page = await context.newPage()
  await page.setViewportSize(POPUP_VIEWPORT)
  await page.goto(`chrome-extension://${id}/popup/popup.html`)
  await page.locator('#list li').first().waitFor()
  await waitForImages(page)
  return page
}

// Categories render collapsed (popup/render.ts); opening them is the action.
export async function recordPopup(context, id, homePage, clipsDir) {
  await scrollHomeToTop(homePage)
  await homePage.mouse.move(2, 2)
  await homePage.screenshot({ path: join(clipsDir, POPUP_BACKDROP) })
  const page = await openPopup(context, id)
  await recordScene(
    page,
    'popup',
    clipsDir,
    async (pointer) => {
      for (const name of ['Design', 'Music']) {
        await pointer.click(page.locator('.cat-row', { hasText: name }), 700)
        await waitForImages(page)
        await page.waitForTimeout(900)
      }
      await pointer.glide(page.locator('#open'), 700)
      await page.waitForTimeout(900)
    },
    { viewport: POPUP_VIEWPORT },
  )
  await page.close()
}
