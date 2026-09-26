// Stills of the curated home and the toolbar popup for the store boards: the
// full home, search, the new-category and move modals, the chip row, the
// accent/theme variants and the popup with its settings.

import { POPUP_VIEWPORT } from '../promo-video/formats.mjs'
import { openHome } from '../promo-video/home-scenes.mjs'
import { updateSettings, waitForImages } from '../store-assets/seed.mjs'
import { hideCursor } from './stills.mjs'

const NEW_CATEGORY = 'Blender Films'
// Top band of the home (header, chips, first card row) — the part that
// visibly re-colors with the accent.
const HOME_TOP = { x: 0, y: 0, width: 1440, height: 560 }
const MODAL = '.fixed.inset-0 > div'

async function freshHome(context, id) {
  const page = await openHome(context, id)
  await page.getByRole('heading', { name: 'Welcome back.' }).waitFor()
  await waitForImages(page)
  await hideCursor(page)
  return page
}

async function shootSearch(page, shoot) {
  const search = page.getByPlaceholder(/search your library/i)
  await search.fill('bunny')
  await page.waitForTimeout(500)
  await shoot(page, 'home-search')
  await search.fill('')
}

async function shootNewCategory(page, shoot) {
  await page.getByRole('button', { name: /^Category$/ }).click()
  await page.getByPlaceholder(/react tutorials/i).fill(NEW_CATEGORY)
  await page.getByRole('button', { name: 'film', exact: true }).click()
  await shoot(page.locator(MODAL).first(), 'modal-new-category')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await page.locator('.fixed.inset-0').waitFor({ state: 'detached' })
}

// `.vact` order is watched / move / more (VideoCard.tsx).
async function shootMove(page, shoot) {
  const card = page.locator('.vcard').first()
  await card.hover()
  await card.locator('.vact').nth(1).click()
  await page.getByRole('heading', { name: /move video to/i }).waitFor()
  await shoot(page.locator(MODAL).first(), 'modal-move')
  await page.locator(`${MODAL} button`, { hasText: NEW_CATEGORY }).click()
  await page.locator('.fixed.inset-0').waitFor({ state: 'detached' })
  await page.mouse.move(2, 2)
}

async function shootLooks(page, shoot) {
  for (const accent of ['mint', 'amber', 'pink']) {
    await updateSettings(page, { accent })
    await page.waitForTimeout(400)
    await shoot(page, `home-accent-${accent}`, { clip: HOME_TOP })
  }
  await updateSettings(page, { accent: 'violet', theme: 'smpte' })
  await page.waitForTimeout(600)
  await shoot(page, 'home-smpte', { clip: HOME_TOP })
  await updateSettings(page, { theme: 'aurora' })
}

async function shootPopup(context, id, shoot) {
  const page = await context.newPage()
  await page.setViewportSize(POPUP_VIEWPORT)
  await page.goto(`chrome-extension://${id}/popup/popup.html`)
  await page.locator('#list li').first().waitFor()
  await hideCursor(page)
  for (const name of ['Design', 'Music']) await page.locator('.cat-row', { hasText: name }).click()
  await waitForImages(page)
  await page.mouse.move(2, 2)
  await shoot(page, 'popup')
  await page.locator('#config').click()
  await page.locator('.cfg-modal').waitFor()
  await page.waitForTimeout(350) // backdrop fade
  await shoot(page, 'popup-settings')
  await page.close()
}

/**
 * Captures every home/popup still into the shooter's folder.
 * @example await captureHomeStills(context, extensionId, shoot)
 */
export async function captureHomeStills(context, id, shoot) {
  const page = await freshHome(context, id)
  await shoot(page, 'home')
  await shoot(page.locator('.cat-chips'), 'chips')
  await shootSearch(page, shoot)
  await shootNewCategory(page, shoot)
  await shootMove(page, shoot)
  await shootLooks(page, shoot)
  await page.close()
  await shootPopup(context, id, shoot)
}
