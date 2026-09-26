// Stills of MyTube's chrome on youtube.com for the store boards: a result card
// with its Save pill, the category menu, the save toast, the saved state, and
// the home reminder nudge. Rides the live site like the video scenes, with the
// same helpers (promo-video/youtube-scenes.mjs).

import { HOME_URL, SEARCH_URL, dropdownItem, frameCard, openYoutube } from '../promo-video/youtube-scenes.mjs'
import { updateSettings } from '../store-assets/seed.mjs'
import { hideCursor } from './stills.mjs'

async function shootSaveFlow(context, shoot) {
  const page = await openYoutube(context, SEARCH_URL, 'ytd-video-renderer .mytube-btn')
  await hideCursor(page)
  const card = page.locator('ytd-video-renderer:has(.mytube-btn)').first()
  await frameCard(page, card)
  await card.locator('a#video-title').first().hover()
  await card.locator('.mytube-btn').first().waitFor({ state: 'visible' })
  await shoot(card, 'yt-card')
  await card.locator('.mytube-btn').first().click()
  await shoot(page.locator('.mytube-dropdown'), 'yt-menu')
  await dropdownItem(page, 'Design').click()
  const toast = page.locator('#mytube-toast.mytube-toast--show')
  await toast.waitFor()
  await page.waitForTimeout(400) // slide-in transition
  await shoot(toast, 'yt-toast')
  await shoot(card, 'yt-card-saved')
  await page.close()
}

// Opt-in (REMIND-8..10): switched on for the shot, off again after.
async function shootNudge(context, settingsPage, shoot) {
  await updateSettings(settingsPage, { remindOnYoutubeHome: true })
  const page = await openYoutube(context, HOME_URL, '#mytube-nudge')
  await hideCursor(page)
  await shoot(page.locator('#mytube-nudge'), 'yt-nudge')
  await page.close()
  await updateSettings(settingsPage, { remindOnYoutubeHome: false })
}

/**
 * Captures every youtube.com still; `settingsPage` is any extension page (it
 * sends the settings messages).
 * @example await captureYoutubeStills(context, homePage, shoot)
 */
export async function captureYoutubeStills(context, settingsPage, shoot) {
  await shootSaveFlow(context, shoot)
  await shootNudge(context, settingsPage, shoot)
}
