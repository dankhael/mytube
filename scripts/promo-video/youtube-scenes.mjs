// Scenes played on youtube.com: saving a result card, importing a playlist and
// the home reminder nudge. Selectors mirror content/content.ts and
// content/playlist-import.ts — the same ones the store shots rely on
// (scripts/store-assets/youtube-shots.mjs), so both break together if YouTube
// shifts its DOM.

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { updateSettings, waitForImages } from '../store-assets/seed.mjs'
import { recordScene } from './session.mjs'

const SEARCH_URL = 'https://www.youtube.com/results?search_query=blender+open+movie&hl=en&gl=US'
const PLAYLISTS_URL = 'https://www.youtube.com/@BlenderOfficial/playlists?hl=en&gl=US'
const HOME_URL = 'https://www.youtube.com/?hl=en&gl=US'
const PAINT_MS = 1500
// A small playlist keeps the import's auto-scroll short on camera.
const MAX_PLAYLIST_VIDEOS = 25

async function openYoutube(context, url, readySelector) {
  const page = await context.newPage()
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.locator(readySelector).first().waitFor({ timeout: 30_000 })
  await page.waitForTimeout(PAINT_MS)
  await waitForImages(page)
  return page
}

function dropdownItem(page, category) {
  return page.locator('.mytube-dropdown .mytube-dropdown-item', { hasText: category }).first()
}

// Tucks the card's top edge just under YouTube's 56px sticky header, which
// also scrolls any sponsored slot above it out of shot.
async function frameCard(page, card) {
  const box = await card.boundingBox()
  if (!box) throw new Error(`result card has no box; expected a rendered ytd-video-renderer`)
  await page.mouse.wheel(0, box.y - 76)
  await page.waitForTimeout(PAINT_MS)
  await waitForImages(page)
}

async function recordSaveCard(context, clipsDir) {
  const page = await openYoutube(context, SEARCH_URL, 'ytd-video-renderer .mytube-btn')
  const card = page.locator('ytd-video-renderer:has(.mytube-btn)').first()
  await frameCard(page, card)
  await recordScene(page, 'yt-save', clipsDir, async (pointer) => {
    await pointer.glide(card.locator('a#video-title').first(), 900)
    await page.waitForTimeout(500)
    await pointer.click(card.locator('.mytube-btn').first(), 450)
    await page.locator('.mytube-dropdown').waitFor()
    await page.waitForTimeout(700)
    await pointer.click(dropdownItem(page, 'Design'), 600)
    await page.locator('#mytube-toast.mytube-toast--show').waitFor()
    await page.waitForTimeout(1600)
  })
  await page.close()
}

// Picks the channel's smallest playlist that still has a few rows, read off
// the "N videos" badge each playlist tile carries.
async function smallPlaylistUrl(context) {
  const page = await openYoutube(context, PLAYLISTS_URL, 'a[href*="list="]')
  const list = await page.evaluate((max) => {
    const tiles = [...document.querySelectorAll('a[href*="list="]')]
    const sized = tiles.map((a) => {
      const box = a.closest('yt-lockup-view-model, ytd-grid-playlist-renderer, ytd-rich-item-renderer') ?? a
      const match = box.textContent.match(/(\d+)\s+videos?/i)
      return {
        list: new URL(a.href).searchParams.get('list'),
        count: match ? Number(match[1]) : Infinity,
      }
    })
    const fits = sized
      .filter((p) => p.list && p.count >= 4 && p.count <= max)
      .sort((a, b) => a.count - b.count)
    return (fits[0] ?? sized.find((p) => p.list))?.list
  }, MAX_PLAYLIST_VIDEOS)
  await page.close()
  if (!list) throw new Error(`no playlist link found on ${PLAYLISTS_URL}; expected a[href*="list="] tiles`)
  return `https://www.youtube.com/playlist?list=${list}&hl=en&gl=US`
}

async function recordPlaylistImport(context, clipsDir) {
  const page = await openYoutube(context, await smallPlaylistUrl(context), '#mytube-import-btn')
  await recordScene(page, 'yt-playlist', clipsDir, async (pointer) => {
    await pointer.click(page.locator('#mytube-import-btn'), 1000)
    await page.locator('.mytube-dropdown').waitFor()
    await page.waitForTimeout(700)
    await pointer.click(dropdownItem(page, 'Design'), 600)
    await page.locator('#mytube-toast.mytube-toast--show').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(1800)
  })
  await page.close()
}

// The nudge is opt-in (watch-reminders, REMIND-8..10): switched on for the
// take and back off after, like the store shot does.
async function recordHomeReminder(context, settingsPage, clipsDir) {
  await updateSettings(settingsPage, { remindOnYoutubeHome: true })
  const page = await openYoutube(context, HOME_URL, '#mytube-nudge')
  // The nudge is a small pill in a big empty page; the composer zooms onto it.
  const box = await page.locator('#mytube-nudge').boundingBox()
  writeFileSync(join(clipsDir, 'yt-reminder.focus.json'), JSON.stringify(box))
  await recordScene(page, 'yt-reminder', clipsDir, async (pointer) => {
    await pointer.glide(page.locator('#mytube-nudge .mytube-nudge-text'), 1100)
    await page.waitForTimeout(1200)
    await pointer.glide(page.locator('#mytube-nudge .mytube-nudge-open'), 700)
    await page.waitForTimeout(1000)
  })
  await page.close()
  await updateSettings(settingsPage, { remindOnYoutubeHome: false })
}

export { recordSaveCard, recordPlaylistImport, recordHomeReminder }
// Shared with the store-promo stills (scripts/store-promo/capture-youtube.mjs).
export { SEARCH_URL, HOME_URL, openYoutube, dropdownItem, frameCard }
