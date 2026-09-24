// Scenes played on the curated home (the packaged new-tab page): the library,
// search, creating a category, moving a video into it and the live theme flip.
// Recorded after the YouTube scenes so the videos saved there show up here.

import { clearStore, seedLibrary, updateSettings, waitForImages } from '../store-assets/seed.mjs'
import { recordScene } from './session.mjs'

const NEW_CATEGORY = 'Blender Films'

// Wheel in small notches so the scroll reads as a hand on a trackpad, not a jump.
async function smoothWheel(page, deltaY, notches = 24) {
  for (let notch = 0; notch < notches; notch++) {
    await page.mouse.wheel(0, deltaY / notches)
    await page.waitForTimeout(28)
  }
}

// `instant` beats the page's smooth scroll-behavior, and the wait covers the
// reload's late scroll restoration — otherwise a take opens mid-page.
export async function scrollHomeToTop(page) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForFunction(() => window.scrollY === 0)
  await page.waitForTimeout(300)
}

async function recordLibrary(page, clipsDir) {
  await page.waitForTimeout(800)
  await scrollHomeToTop(page)
  await recordScene(page, 'home-library', clipsDir, async (pointer) => {
    await pointer.moveTo(760, 430, 900)
    await smoothWheel(page, 900)
    await page.waitForTimeout(700)
    await smoothWheel(page, -900)
    await page.waitForTimeout(400)
    await pointer.click(page.locator('.cat-chip', { hasText: 'Design' }), 800)
    await page.waitForTimeout(1500)
  })
  await scrollHomeToTop(page)
}

async function recordSearch(page, clipsDir) {
  const search = page.getByPlaceholder(/search your library/i)
  await recordScene(page, 'home-search', clipsDir, async (pointer) => {
    await pointer.click(search, 800)
    await search.pressSequentially('bunny', { delay: 140 })
    await page.waitForTimeout(1600)
    await search.fill('')
    await page.waitForTimeout(500)
  })
}

async function recordNewCategory(page, clipsDir) {
  await recordScene(page, 'home-category', clipsDir, async (pointer) => {
    await pointer.click(page.getByRole('button', { name: /^Category$/ }), 800)
    const name = page.getByPlaceholder(/react tutorials/i)
    await name.waitFor()
    await page.waitForTimeout(300)
    await name.pressSequentially(NEW_CATEGORY, { delay: 90 })
    await pointer.click(page.getByRole('button', { name: 'film', exact: true }), 700)
    await page.waitForTimeout(400)
    await pointer.click(page.getByRole('button', { name: 'Create', exact: true }), 600)
    await page.locator('.fixed.inset-0').waitFor({ state: 'detached' })
    await page.locator('.cat-chip', { hasText: NEW_CATEGORY }).waitFor()
    await page.waitForTimeout(1000)
  })
}

// Card actions only paint on hover; `.vact` order is watched / move / more
// (VideoCard.tsx), same as the store shots rely on.
async function recordMove(page, clipsDir) {
  await scrollHomeToTop(page)
  const card = page.locator('.vcard').first()
  await recordScene(page, 'home-move', clipsDir, async (pointer) => {
    await pointer.glide(card, 900)
    await page.waitForTimeout(500)
    await pointer.click(card.locator('.vact').nth(1), 500)
    await page.getByRole('heading', { name: /move video to/i }).waitFor()
    await page.waitForTimeout(700)
    await pointer.click(page.locator('.fixed.inset-0 button', { hasText: NEW_CATEGORY }), 700)
    await page.locator('.fixed.inset-0').waitFor({ state: 'detached' })
    await page.waitForTimeout(700)
    await pointer.click(page.locator('.cat-chip', { hasText: NEW_CATEGORY }), 800)
    await page.waitForTimeout(1400)
  })
}

// Both knobs re-render live on the storage change (THEME-7, CRT-7), so they are
// filmed in place. The SMPTE skin alone is too subtle for video (scanlines on
// the thumbnails), so the accent hue cycles first; Violet + Aurora restored after.
const ACCENT_TOUR = ['mint', 'amber', 'pink', 'violet']

// Filmed in a tab of its own: by now the popup take has resized the shared
// headless window, and older tabs screencast cropped to 1440×813 after that.
async function recordThemeFlip(context, id, clipsDir) {
  const page = await openHome(context, id)
  await waitForImages(page)
  await recordScene(page, 'home-theme', clipsDir, async (pointer) => {
    await pointer.moveTo(1150, 330, 700)
    for (const accent of ACCENT_TOUR) {
      await updateSettings(page, { accent })
      await page.waitForTimeout(900)
    }
    await updateSettings(page, { theme: 'smpte' })
    await waitForImages(page)
    await page.waitForTimeout(1800)
  })
  await updateSettings(page, { theme: 'aurora', accent: 'violet' })
  await page.close()
}

async function openHome(context, id) {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${id}/newtab/index.html`)
  await page.getByText('MyTube').first().waitFor()
  return page
}

// Fresh library first: clears whatever a previous run left, then seeds the
// same sample the store shots use, in a throwaway tab. The scenes get a new
// tab: headless Chromium sometimes leaves an older tab screencasting at
// 1440×813 (bottom cropped) — after reloads, or after another tab resized the
// window — while a tab opened straight onto the home gets the full 1440×900.
export async function prepareHome(context, id) {
  const setup = await openHome(context, id)
  await clearStore(setup)
  await seedLibrary(setup)
  await setup.close()
  return openHome(context, id)
}

export async function recordHomeScenes(page, clipsDir) {
  await page.reload()
  await page.getByRole('heading', { name: 'Welcome back.' }).waitFor()
  await waitForImages(page)
  await recordLibrary(page, clipsDir)
  await recordSearch(page, clipsDir)
  await recordNewCategory(page, clipsDir)
  await recordMove(page, clipsDir)
}

export { recordThemeFlip }
