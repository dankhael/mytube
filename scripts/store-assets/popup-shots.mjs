// Toolbar popup captures: the browsable category list and the settings modal
// behind its gear button. Shot at the popup's real 340px column width so the
// asset matches what the browser renders.

import { POPUP_VIEWPORT, parkCursor } from './browser.mjs'
import { waitForImages } from './seed.mjs'

async function openPopup(context, id) {
  const page = await context.newPage()
  await page.setViewportSize(POPUP_VIEWPORT)
  await page.goto(`chrome-extension://${id}/popup/popup.html`)
  await page.locator('#list li').first().waitFor()
  await waitForImages(page)
  await parkCursor(page)
  return page
}

// Categories render collapsed (render.ts); open two so the shot shows the
// browsable video rows, not just the counts.
async function expandCategories(page, names) {
  for (const name of names) {
    await page.locator('.cat-row', { hasText: name }).click()
    await page.locator('.cat.open').first().waitFor()
  }
  await waitForImages(page)
  await parkCursor(page) // drop the row hover the last click left behind
}

// The modal is taller than the popup column, so it takes two shots: the top
// half (language, sound, theme, accent) and the scrolled bottom half (shortcut
// and the two watch-reminder toggles).
async function captureSettings(page, shot) {
  await page.locator('#config').click()
  await page.locator('.cfg-modal').waitFor()
  await page.waitForTimeout(300) // let the backdrop fade finish
  await shot(page, 'popup-settings-340x600')
  await page.locator('.cfg-body').evaluate((body) => body.scrollTo(0, body.scrollHeight))
  await page.waitForTimeout(300)
  await shot(page, 'popup-settings-reminders-340x600')
}

export async function capturePopupScreens(context, id, shot) {
  const page = await openPopup(context, id)
  await expandCategories(page, ['Music', 'Tutorials'])
  await shot(page, 'popup-library-340x600')
  await captureSettings(page, shot)
  await page.close()
}
