// Smoke E2E: loads the real built extension into Chromium and proves the two
// MV3 entry points come up — the background service worker registers (so we can
// read the extension id), the home renders, and library mutations survive reload.
//
// Run with: npm run test:e2e  (builds dist/ first, then `playwright test`)
// Requires: npx playwright install chromium. MYTUBE_HEADLESS=1 opts into new headless.

import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test'
import type { Message, MessageResponse, StorageData } from '../src/types'
import { META_KEY } from '../src/storage-backend'
import { SYNC_STORAGE_LIMITS } from '../src/storage-limits'
import { hashlessItems, nearQuotaItems, syncBytes } from '../test/near-quota-library'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const extensionPath = join(here, '..', 'dist')

let context: BrowserContext

// Each test owns a fresh temporary profile, even when the preceding test fails.
test.beforeEach(async () => {
  context = await chromium.launchPersistentContext('', {
    // Opt-in new headless Chromium also loads extensions, useful on CI hosts.
    channel: 'chromium',
    headless: process.env.MYTUBE_HEADLESS === '1',
    // The extension picks its UI language from the service worker's
    // navigator.language on first run, and SMOKE-1 asserts the English copy.
    // `locale` only reaches pages, not the worker; on Linux Chromium reads the
    // language from the environment, so pin that too — otherwise a pt_BR
    // machine renders the Portuguese home and fails the smoke.
    locale: 'en-US',
    env: { ...process.env, LANG: 'en_US.UTF-8', LANGUAGE: 'en_US' },
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  })
})

async function request(page: Page, message: Message): Promise<MessageResponse> {
  const response = await page.evaluate((payload) => chrome.runtime.sendMessage(payload), message)
  expect(response.ok, JSON.stringify(response)).toBe(true)
  return response
}

test('ARCH-7: saves survive reload and acknowledged edits/deletes persist', async () => {
  const id = await extensionId()
  const page = await context.newPage()
  await page.goto(`chrome-extension://${id}/newtab/index.html`)
  await request(page, { action: 'ADD_CATEGORY', name: 'Architecture smoke', emoji: '📁' })
  await request(page, {
    action: 'SAVE_VIDEO', category: 'Architecture smoke',
    video: {
      id: 'testVideo01', title: 'Architecture persistence smoke', channelName: 'Test channel',
      thumbnail: 'https://i.ytimg.com/vi/testVideo01/mqdefault.jpg',
    },
  })
  await page.reload()
  await request(page, { action: 'GET_ALL' })
  await expect(page.getByText('Architecture persistence smoke').first()).toBeVisible()
  await page.getByTitle('Mark as watched').first().click()
  await expect.poll(async () => {
    const response = await request(page, { action: 'GET_ALL' })
    return response.ok && 'data' in response && response.data?.videos[0]?.watched
  }).toBe(true)
  await page.reload()
  const saved = await request(page, { action: 'GET_ALL' })
  expect(saved).toMatchObject({ ok: true, data: { videos: [{ id: 'testVideo01', watched: true }] } })

  await request(page, { action: 'DELETE_VIDEO', id: 'testVideo01' })
  await page.reload()
  await expect(page.getByRole('heading', { name: /curated by you/i })).toBeVisible()
  expect(await request(page, { action: 'GET_ALL' })).toMatchObject({ ok: true, data: { videos: [] } })
  await page.close()
})

// FakeSyncArea only imitates this; the bug lived in what real chrome.storage does
// to a lone surrogate, so the proof has to run against it too.
test('regression: text storage rewrites never locks the library', async () => {
  const id = await extensionId()
  const page = await context.newPage()
  await page.goto(`chrome-extension://${id}/newtab/index.html`)
  const titles = [`${'x'.repeat(299)}😀`, 'bad \ud83d end']
  for (const title of titles) {
    await request(page, {
      action: 'SAVE_VIDEO', category: 'Surrogate \ud83d smoke',
      video: { id: 'testVideo02', title, channelName: 'Test channel', thumbnail: '' },
    })
    await page.reload()
    const saved = await request(page, { action: 'GET_ALL' })
    expect(saved).toMatchObject({ ok: true, data: { videos: [{ id: 'testVideo02' }] } })
    await request(page, { action: 'DELETE_VIDEO', id: 'testVideo02' })
    await page.reload()
    expect(await request(page, { action: 'GET_ALL' })).toMatchObject({ ok: true, data: { videos: [] } })
  }
  await page.close()
})

// Seeds the storage a 1.0.x install leaves behind: no write path can produce it now.
async function seedSyncStorage(page: Page, items: Record<string, unknown>): Promise<number> {
  return page.evaluate(async (seed) => {
    await chrome.storage.sync.clear()
    await chrome.storage.sync.set(seed)
    return chrome.storage.sync.getBytesInUse(null)
  }, items)
}

function allVideos(items: Record<string, unknown>): StorageData['videos'] {
  return Object.keys(items).filter((key) => key !== META_KEY)
    .flatMap((key) => (items[key] as { videos: StorageData['videos'] }).videos)
}

async function storedVideoCount(page: Page): Promise<number> {
  const response = await request(page, { action: 'GET_ALL' })
  return 'data' in response ? response.data?.videos.length ?? -1 : -1
}

// A preflight that counts less than Chrome passes writes the browser then refuses,
// so the only trustworthy check of the formula is the browser's own number.
test('regression: quota preflight counts bytes exactly as Chrome does', async () => {
  const id = await extensionId()
  const page = await context.newPage()
  await page.goto(`chrome-extension://${id}/newtab/index.html`)
  const items = {
    ...nearQuotaItems(40, 90_000),
    'mytube:videos:9': { videos: [{ title: 'a < b > c & \u2028 😀 "q"', addedAt: Date.now(), watchedAt: Date.now() }] },
  }
  expect(await seedSyncStorage(page, items)).toBe(syncBytes(items))
  await page.close()
})

test('HEADROOM-6: a nearly full library without fingerprints can delete from the home', async () => {
  const id = await extensionId()
  const page = await context.newPage()
  await page.goto(`chrome-extension://${id}/newtab/index.html`)
  const items = nearQuotaItems(358, 950)
  const { categories, settings } = items[META_KEY] as StorageData
  const afterDelete = hashlessItems({ categories, settings, videos: allVideos(items).slice(1) })
  // Chrome applies its quota before stale keys go, so this is the size that matters.
  expect(syncBytes({ ...items, ...afterDelete })).toBeLessThan(SYNC_STORAGE_LIMITS.totalBytes)
  const used = await seedSyncStorage(page, items)
  expect(used).toBe(syncBytes(items))
  expect(SYNC_STORAGE_LIMITS.totalBytes - used).toBeLessThanOrEqual(950)

  await page.reload()
  await page.getByTitle('More').first().click()
  await page.getByRole('button', { name: 'Remove' }).click()

  await expect.poll(() => storedVideoCount(page)).toBe(357)
  await page.reload()
  expect(await storedVideoCount(page)).toBe(357)
  await page.close()
})

// A failed remove can't be forced in real Chrome, so this seeds what one leaves
// behind: chunks past the committed count, keeping the next write over the quota.
test('HEADROOM-5: leftover chunks stop blocking writes in real Chrome', async () => {
  const id = await extensionId()
  const page = await context.newPage()
  await page.goto(`chrome-extension://${id}/newtab/index.html`)
  const items = nearQuotaItems(358, 100)
  items[META_KEY] = { ...(items[META_KEY] as object), chunkCount: 10 }
  await seedSyncStorage(page, items)
  await page.reload()
  const committedVideos = await storedVideoCount(page)

  await request(page, { action: 'ADD_CATEGORY', name: 'c'.repeat(300), emoji: '📁' })

  const keys = await page.evaluate(async () => Object.keys(await chrome.storage.sync.get(null)))
  expect(keys).not.toContain('mytube:videos:10')
  await page.reload()
  expect(await storedVideoCount(page)).toBe(committedVideos)
  await page.close()
})

test.afterEach(async () => {
  await context?.close()
})

async function extensionId(): Promise<string> {
  let [sw] = context.serviceWorkers()
  if (!sw) sw = await context.waitForEvent('serviceworker')
  // chrome-extension://<id>/...
  return new URL(sw.url()).host
}

test('SMOKE-1: the new tab page renders the curated-home welcome screen', async () => {
  const id = await extensionId()
  expect(id).toMatch(/^[a-z]{32}$/) // background service worker registered

  const page = await context.newPage()
  await page.goto(`chrome-extension://${id}/newtab/index.html`)

  await expect(page.getByRole('heading', { name: /curated by you/i })).toBeVisible()
  await expect(page.getByText('MyTube')).toBeVisible()
})
