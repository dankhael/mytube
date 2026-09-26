// The branded 440x280 small promotional tile. Not a UI capture: it is a
// standalone page built here from the shipped icon so the store tile always
// carries the real mark.

import { readFileSync } from 'node:fs'

const PROMO_VIEWPORT = { width: 440, height: 280 }

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

export async function capturePromo(context, iconPath, shot) {
  const page = await context.newPage()
  await page.setViewportSize(PROMO_VIEWPORT)
  await page.setContent(promoMarkup(readFileSync(iconPath, 'utf8')), { waitUntil: 'load' })
  await shot(page, 'small-promo-440x280')
  await page.close()
}
