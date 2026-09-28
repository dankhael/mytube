// Smoke E2E: loads the real built extension into Chromium and proves the two
// MV3 entry points come up — the background service worker registers (so we can
// read the extension id) and the packaged curated-home page actually renders.
//
// Run with: npm run test:e2e  (builds dist/ first, then `playwright test`)
// Requires: npx playwright install chromium. Extensions need a headed context.

import { test, expect, chromium, type BrowserContext } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const extensionPath = join(here, '..', 'dist')

let context: BrowserContext

test.beforeAll(async () => {
  context = await chromium.launchPersistentContext('', {
    headless: false,
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

test.afterAll(async () => {
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
