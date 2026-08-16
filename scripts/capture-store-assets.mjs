// Generates Chrome Web Store artwork from the real packaged extension UI.
// Run: npm run store:assets (needs: npx playwright install chromium)

import { chromium } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const extensionPath = join(root, 'dist')
const outputDir = join(root, 'docs', 'store-assets')
const viewport = { width: 1280, height: 800 }

const sampleVideos = [
  video('dQw4w9WgXcQ', 'Rick Astley - Never Gonna Give You Up (Official Video)', 'Rick Astley', 'Music', '3:33'),
  video(
    'M7lc1UVf-VE',
    'YouTube Developers Live: Embedded Web Player Customization',
    'Google for Developers',
    'Tutorials',
  ),
  video('jNQXAC9IVRw', 'Me at the zoo', 'jawed', 'Entertainment', '0:19'),
  video(
    'aqz-KE-bpKQ',
    'Big Buck Bunny 60fps 4K - Official Blender Foundation Short Film',
    'Blender',
    'Design',
    '10:34',
  ),
  video('ysz5S6PUM-U', 'Chilled Serenity #5', 'Xquisite', 'Music'),
]

function video(id, title, channelName, category, duration = undefined) {
  return {
    action: 'SAVE_VIDEO',
    category,
    video: { id, title, channelName, duration, thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` },
  }
}

async function extensionId(context) {
  let [worker] = context.serviceWorkers()
  if (!worker) worker = await context.waitForEvent('serviceworker')
  return new URL(worker.url()).host
}

async function sendMessage(page, message) {
  const response = await page.evaluate(
    (payload) => new Promise((resolve) => chrome.runtime.sendMessage(payload, resolve)),
    message,
  )
  if (!response?.ok) throw new Error(`Seed message failed: ${JSON.stringify({ message, response })}`)
}

async function openHome(context, id) {
  const page = await context.newPage()
  await page.setViewportSize(viewport)
  await page.goto(`chrome-extension://${id}/newtab/index.html`)
  await page.getByText('MyTube').first().waitFor()
  return page
}

async function clearLibrary(page) {
  await page.evaluate(() => chrome.storage.sync.clear())
  await page.reload()
  await page.getByRole('heading', { name: /curated by you/i }).waitFor()
}

async function seedLibrary(page) {
  await sendMessage(page, { action: 'ADD_CATEGORY', name: 'Design', emoji: '🎨', icon: 'palette' })
  await sendMessage(page, { action: 'ADD_CATEGORY', name: 'Music', emoji: '🎵', icon: 'music' })
  for (const message of sampleVideos) await sendMessage(page, message)
  await sendMessage(page, { action: 'MARK_WATCHED', id: 'jNQXAC9IVRw', watched: true })
  await page.reload()
  await page.getByRole('heading', { name: 'Welcome back.' }).waitFor()
}

async function waitForImages(page) {
  await page
    .waitForFunction(() => Array.from(document.images).every((image) => image.complete), null, {
      timeout: 10_000,
    })
    .catch(() => undefined)
}

async function captureHomeScreens(context, id) {
  const page = await openHome(context, id)
  await clearLibrary(page)
  await page.screenshot({ path: join(outputDir, 'home-welcome-1280x800.png') })
  await seedLibrary(page)
  await waitForImages(page)
  await page.screenshot({ path: join(outputDir, 'home-library-1280x800.png') })
  await page.close()
}

function promoMarkup(icon) {
  return `<!doctype html>
    <html><head><style>
      * { box-sizing: border-box }
      html, body { margin: 0; width: 440px; height: 280px; overflow: hidden }
      body { display: grid; place-items: center; color: #f7f5ff; font-family: Arial, sans-serif;
        background: radial-gradient(circle at 18% 18%, #403870 0, transparent 40%),
          linear-gradient(145deg, #12101d, #211b38 60%, #171322) }
      main { width: 100%; padding: 36px 38px; display: flex; align-items: center; gap: 28px }
      .icon { width: 112px; height: 112px; flex: none; filter: drop-shadow(0 18px 28px #08070d99) }
      .icon svg { width: 100%; height: 100% }
      h1 { margin: 0 0 10px; font-size: 43px; letter-spacing: -2px }
      h1 span { font-weight: 800; color: #b6a8ff }
      p { margin: 0; max-width: 225px; color: #d9d3ec; font-size: 18px; line-height: 1.35 }
      small { display: block; margin-top: 12px; color: #9c92ba; font-size: 12px; letter-spacing: .08em;
        text-transform: uppercase }
    </style></head><body><main><div class="icon">${icon}</div><div>
      <h1>My<span>Tube</span></h1><p>Your YouTube home, curated by you.</p>
      <small>Save · Organize · Watch</small></div></main></body></html>`
}

async function capturePromo(context) {
  const page = await context.newPage()
  await page.setViewportSize({ width: 440, height: 280 })
  const icon = readFileSync(join(root, 'icons', 'icon.svg'), 'utf8')
  await page.setContent(promoMarkup(icon), { waitUntil: 'load' })
  await page.screenshot({ path: join(outputDir, 'small-promo-440x280.png') })
  await page.close()
}

mkdirSync(outputDir, { recursive: true })
const context = await chromium.launchPersistentContext('', {
  headless: false,
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
})

try {
  const id = await extensionId(context)
  await captureHomeScreens(context, id)
  await capturePromo(context)
  console.log('docs/store-assets/home-welcome-1280x800.png')
  console.log('docs/store-assets/home-library-1280x800.png')
  console.log('docs/store-assets/small-promo-440x280.png')
} finally {
  await context.close()
}
