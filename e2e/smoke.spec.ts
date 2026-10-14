// Smoke E2E: loads the real built extension into Chromium and proves the two
// MV3 entry points come up — the background service worker registers (so we can
// read the extension id), the home renders, and library mutations survive reload.
//
// Run with: npm run test:e2e  (builds dist/ first, then `playwright test`)
// Requires: npx playwright install chromium. MYTUBE_HEADLESS=1 opts into new headless.

import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test'
import type { Message, MessageResponse } from '../src/types'
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
