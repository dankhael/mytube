// Every capture of the curated home (the packaged new-tab page): first run,
// populated library, search, the card action menu, the move/new-category modals
// and the SMPTE theme skin.

import { VIEWPORT, parkCursor } from './browser.mjs'
import { clearStore, seedLibrary, updateSettings, waitForImages } from './seed.mjs'

export async function openHome(context, id) {
  const page = await context.newPage()
  await page.setViewportSize(VIEWPORT)
  await page.goto(`chrome-extension://${id}/newtab/index.html`)
  await page.getByText('MyTube').first().waitFor()
  await parkCursor(page)
  return page
}

// Right-hand card actions only paint on hover; `.vact` order is
// watched / move / more (VideoCard.tsx). Scrolls home first so the shot always
// frames the header, whatever the previous capture left on screen.
async function hoverFirstCard(page) {
  await page.evaluate(() => window.scrollTo(0, 0))
  const card = page.locator('.vcard').first()
  await card.hover()
  return card
}

// Both modals hang off ModalShell, which only closes on a backdrop click (the
// Escape binding lives in AddCategoryModal, not the shell), so dismiss by
// clicking a corner of the overlay.
async function closeModal(page) {
  await page.mouse.click(12, VIEWPORT.height - 12)
  await page.locator('.fixed.inset-0').waitFor({ state: 'detached' })
  await parkCursor(page)
}

async function captureCardMenu(page, shot) {
  const card = await hoverFirstCard(page)
  await card.locator('.vact').nth(2).click()
  await page.locator('.vmenu').first().waitFor()
  await shot(page, 'home-card-actions-1280x800')
  await page.mouse.click(640, 130) // click-away on the greeting — no card to open there
  await parkCursor(page)
}

async function captureMoveModal(page, shot) {
  const card = await hoverFirstCard(page)
  await card.locator('.vact').nth(1).click()
  await page.getByRole('heading', { name: /move video to/i }).waitFor()
  await shot(page, 'home-move-video-1280x800')
  await closeModal(page)
}

async function captureNewCategoryModal(page, shot) {
  await page.getByRole('button', { name: /^Category$/ }).click()
  await page.getByRole('heading', { name: /new category/i }).waitFor()
  await page.getByPlaceholder(/react tutorials/i).fill('Podcasts')
  await shot(page, 'home-new-category-1280x800')
  await closeModal(page)
}

async function captureSearch(page, shot) {
  const search = page.getByPlaceholder(/search your library/i)
  await search.fill('you')
  await page.waitForTimeout(400)
  await shot(page, 'home-search-1280x800')
  await search.fill('')
}

// The SMPTE skin is a whole-surface re-skin driven by one stored setting; flip
// it, re-read, shoot, then hand the page back on Aurora (crt-theme, CRT-7).
async function captureSmpteTheme(page, shot) {
  await updateSettings(page, { theme: 'smpte' })
  await page.reload()
  await page.getByRole('heading', { name: 'Welcome back.' }).waitFor()
  await waitForImages(page)
  await shot(page, 'home-smpte-theme-1280x800')
  await updateSettings(page, { theme: 'aurora' })
  await page.reload()
}

export async function captureHomeScreens(context, id, shot) {
  const page = await openHome(context, id)
  await clearStore(page)
  await shot(page, 'home-welcome-1280x800')
  await seedLibrary(page)
  await waitForImages(page)
  await shot(page, 'home-library-1280x800')
  await captureSearch(page, shot)
  await captureCardMenu(page, shot)
  await captureMoveModal(page, shot)
  await captureNewCategoryModal(page, shot)
  await captureSmpteTheme(page, shot)
  await page.close()
}
