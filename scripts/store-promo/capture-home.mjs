// Stills of the curated home and the toolbar popup for the store boards: the
// full home, search, the new-category and move modals, the chip row, the
// accent/theme variants and the popup with its settings. Every on-screen text
// the capture looks for comes from the locale (locales.mjs).

import { POPUP_VIEWPORT } from '../promo-video/formats.mjs'
import { openHome } from '../promo-video/home-scenes.mjs'
import { sendMessage, updateSettings, waitForImages } from '../store-assets/seed.mjs'
import { hideCursor } from './stills.mjs'

// Top band of the home (header, chips, first card row) — the part that
// visibly re-colors with the accent.
const HOME_TOP = { x: 0, y: 0, width: 1440, height: 560 }
const MODAL = '.fixed.inset-0 > div'

async function freshHome(context, id, loc) {
  const page = await openHome(context, id)
  await page.getByRole('heading', { name: loc.ui.welcome }).waitFor()
  await waitForImages(page)
  await hideCursor(page)
  return page
}

async function shootSearch(page, shoot, loc) {
  const search = page.getByPlaceholder(loc.ui.search)
  await search.fill('bunny')
  await page.waitForTimeout(500)
  await shoot(page, 'home-search')
  await search.fill('')
}

async function shootNewCategory(page, shoot, loc) {
  await page.getByRole('button', { name: loc.ui.categoryButton }).click()
  await page.getByPlaceholder(loc.ui.namePlaceholder).fill(loc.newCategory)
  await page.getByRole('button', { name: 'film', exact: true }).click()
  await shoot(page.locator(MODAL).first(), 'modal-new-category')
  await page.getByRole('button', { name: loc.ui.create, exact: true }).click()
  await page.locator('.fixed.inset-0').waitFor({ state: 'detached' })
}

// `.vact` order is watched / move / more (VideoCard.tsx).
async function shootMove(page, shoot, loc) {
  const card = page.locator('.vcard').first()
  await card.hover()
  await card.locator('.vact').nth(1).click()
  await page.getByRole('heading', { name: loc.ui.moveHeading }).waitFor()
  await shoot(page.locator(MODAL).first(), 'modal-move')
  await page.locator(`${MODAL} button`, { hasText: loc.newCategory }).click()
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

async function shootPopup(context, id, shoot, loc) {
  const page = await context.newPage()
  await page.setViewportSize(POPUP_VIEWPORT)
  await page.goto(`chrome-extension://${id}/popup/popup.html`)
  await page.locator('#list li').first().waitFor()
  await hideCursor(page)
  for (const name of loc.popupOpen) await page.locator('.cat-row', { hasText: name }).click()
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
 * Puts the seeded (English) library into `loc`'s language: interface language
 * plus category renames. A no-op for English.
 * @example await localizeLibrary(homePage, CAPTURE_LOCALES['pt-BR'])
 */
export async function localizeLibrary(page, loc) {
  for (const [oldName, category] of Object.entries(loc.renames)) {
    await sendMessage(page, { action: 'UPDATE_CATEGORY', oldName, ...category })
  }
  await updateSettings(page, { language: loc.language })
}

/**
 * Captures every home/popup still into the shooter's folder.
 * @example await captureHomeStills(context, extensionId, shoot, CAPTURE_LOCALES.en)
 */
export async function captureHomeStills(context, id, shoot, loc) {
  const page = await freshHome(context, id, loc)
  await shoot(page, 'home')
  await shoot(page.locator('.cat-chips'), 'chips')
  await shootSearch(page, shoot, loc)
  await shootNewCategory(page, shoot, loc)
  await shootMove(page, shoot, loc)
  await shootLooks(page, shoot)
  await page.close()
  await shootPopup(context, id, shoot, loc)
}
