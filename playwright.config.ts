import { defineConfig } from '@playwright/test'

// Chrome extensions can only be loaded with a persistent context and a headed
// (or new-headless) browser, so each spec drives its own context. Keep it serial.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },
})
