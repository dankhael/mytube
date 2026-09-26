// Captures of the injected chrome on youtube.com (dark mode): the card Save
// pill, its category picker, the /watch action-bar pill, the playlist import
// button and picker, and the opt-in home reminder.
// These ride YouTube's live DOM, so they are the first thing to break when it
// shifts — the selectors mirror content/content.ts and content/playlist-import.ts.

import { parkCursor } from './browser.mjs'
import { updateSettings, waitForImages } from './seed.mjs'

const SEARCH_URL = 'https://www.youtube.com/results?search_query=blender+open+movie&hl=en'
const PLAYLISTS_URL = 'https://www.youtube.com/@BlenderOfficial/playlists?hl=en'
const HOME_URL = 'https://www.youtube.com/?hl=en'

// YouTube renders progressively; the content script only injects after its own
// MutationObserver fires, so every step waits on a real node rather than a
// fixed sleep — except this settle, which lets thumbnails paint before a shot.
const PAINT_MS = 1500

async function openYoutube(context, url) {
  const page = await context.newPage()
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await parkCursor(page)
  return page
}

// Reveals a card's Save pill: it only reaches opacity 1 while its card is
// hovered (`.mytube-wrapper:hover .mytube-btn` in content.ts).
async function hoverCardPill(page, cardSelector) {
  const card = page.locator(`${cardSelector}:has(.mytube-btn)`).first()
  await card.scrollIntoViewIfNeeded()
  await card.hover()
  const pill = card.locator('.mytube-btn').first()
  await pill.waitFor({ state: 'visible' })
  return pill
}

// Everything that can settle settles *before* the hover: about a second in,
// YouTube swaps the thumbnail for its inline video preview, and the shot has to
// land before that.
async function captureSearchCard(context, shot) {
  const page = await openYoutube(context, SEARCH_URL)
  await page.locator('ytd-video-renderer .mytube-btn').first().waitFor()
  await page.waitForTimeout(PAINT_MS)
  await waitForImages(page)
  await hoverCardPill(page, 'ytd-video-renderer')
  await shot(page, 'youtube-save-card-1280x800')
  const href = await page.locator('ytd-video-renderer a#video-title').first().getAttribute('href')
  await page.close()
  return new URL(href, 'https://www.youtube.com').toString()
}

// A playing video screenshots as whatever frame it happens to be on — usually
// the fade-in black. Park it a quarter in, paused, for a representative frame.
async function freezePlayer(page) {
  await page.evaluate(() => {
    const player = document.querySelector('video')
    if (!player) return
    player.pause()
    if (Number.isFinite(player.duration)) player.currentTime = player.duration * 0.25
  })
  await page.waitForTimeout(PAINT_MS)
}

// The picker is portaled to <html> and right-aligned to its button, so it is
// shot from a sidebar suggestion (far from the left edge) where it lands whole.
async function captureWatchPage(context, watchUrl, shot) {
  const page = await openYoutube(context, watchUrl)
  await page.locator('.mytube-watch-wrapper .mytube-btn').waitFor()
  await page.waitForTimeout(PAINT_MS)
  await freezePlayer(page)
  await shot(page, 'youtube-watch-save-1280x800')
  const pill = await hoverCardPill(page, 'yt-lockup-view-model')
  await pill.click()
  await page.locator('.mytube-dropdown').waitFor()
  await shot(page, 'youtube-save-menu-1280x800')
  await page.close()
}

async function firstPlaylistUrl(context) {
  const page = await openYoutube(context, PLAYLISTS_URL)
  const href = await page.locator('a[href*="list="]').first().getAttribute('href')
  const list = new URL(href, 'https://www.youtube.com').searchParams.get('list')
  await page.close()
  return `https://www.youtube.com/playlist?list=${list}&hl=en`
}

// `--floating` is the fallback the content script uses when it found no header
// host, so its absence is the "landed in the header" signal — whichever of
// YouTube's two header layouts this playlist happens to render.
const HEADER_BUTTON = '#mytube-import-btn:not(.mytube-import-btn--floating)'
const PLAYLIST_ATTEMPTS = 3

// The import button lands in the playlist header only if that header is already
// rendered on the scan that creates it; lose that race and it stays a floating
// pill forever (scanPlaylistPage is idempotent and never re-homes it). Reload
// until it is header-hosted, then settle for whatever the last attempt gave.
async function openPlaylistWithHeaderButton(context, url) {
  const page = await openYoutube(context, url)
  for (let attempt = 1; attempt <= PLAYLIST_ATTEMPTS; attempt++) {
    await page.locator('#mytube-import-btn').waitFor({ state: 'visible' })
    const hosted = await page.locator(HEADER_BUTTON).count()
    if (hosted > 0 || attempt === PLAYLIST_ATTEMPTS) return page
    await page.reload({ waitUntil: 'domcontentloaded' })
  }
  return page
}

async function capturePlaylistImport(context, shot) {
  const page = await openPlaylistWithHeaderButton(context, await firstPlaylistUrl(context))
  await page.waitForTimeout(PAINT_MS)
  await shot(page, 'youtube-playlist-import-1280x800')
  await page.locator('#mytube-import-btn').click()
  await page.locator('.mytube-dropdown').waitFor()
  await shot(page, 'youtube-playlist-import-menu-1280x800')
  await page.close()
}

// The nudge is opt-in and only shows with an unwatched backlog on the YouTube
// home (watch-reminders, REMIND-8..10), so the setting is flipped on for the
// shot and back off afterwards.
async function captureHomeReminder(context, settingsPage, shot) {
  await updateSettings(settingsPage, { remindOnYoutubeHome: true })
  const page = await openYoutube(context, HOME_URL)
  await page.locator('#mytube-nudge').waitFor({ state: 'visible' })
  await page.waitForTimeout(PAINT_MS)
  await shot(page, 'youtube-home-reminder-1280x800')
  await page.close()
  await updateSettings(settingsPage, { remindOnYoutubeHome: false })
}

export async function captureYoutubeScreens(context, settingsPage, shot) {
  const watchUrl = await captureSearchCard(context, shot)
  await captureWatchPage(context, watchUrl, shot)
  await capturePlaylistImport(context, shot)
  await captureHomeReminder(context, settingsPage, shot)
}
