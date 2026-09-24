// HTML for everything the promo draws itself: the animated intro/outro cards,
// the stage (brand backdrop + floating browser window) and the caption pill.
// All of it reuses the extension's own tokens and vendored fonts
// (styles/theme-tokens.css), so the video carries the product's exact look.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// Every export takes the output format (formats.mjs) so the same pieces lay
// out for both the landscape and the vertical cut.

function head(root, format, extraCss) {
  const tokens = pathToFileURL(join(root, 'styles', 'theme-tokens.css')).href
  return `<!doctype html><html><head><meta charset="utf-8">
    <link rel="stylesheet" href="${tokens}">
    <style>
      * { box-sizing: border-box }
      html, body { margin: 0; width: ${format.frame.width}px; height: ${format.frame.height}px; overflow: hidden }
      body { font-family: var(--font); color: var(--text) }
      .backdrop { position: absolute; inset: 0;
        background: radial-gradient(900px 600px at 18% 12%, oklch(0.42 0.12 290 / .55), transparent 70%),
          radial-gradient(800px 700px at 88% 92%, oklch(0.4 0.11 330 / .45), transparent 70%),
          linear-gradient(150deg, #0e0c17, #1a1530 55%, #120f1c) }
      ${extraCss}
    </style></head>`
}

function logo(root) {
  return readFileSync(join(root, 'icons', 'icon.svg'), 'utf8')
}

const CARD_CSS = `
  .card { position: absolute; inset: 0; display: grid; place-items: center; text-align: center }
  .mark { width: 220px; height: 220px; margin: 0 auto 34px; filter: drop-shadow(0 30px 60px #05040acc) }
  .mark svg { width: 100%; height: 100% }
  h1 { margin: 0; font: 800 132px/1 var(--font-display); letter-spacing: -5px }
  h1 span { color: var(--accent) }
  p { margin: 26px 0 0; font-size: 40px; color: var(--text-2) }
  .pill { display: inline-block; margin-top: 46px; padding: 18px 40px; border-radius: 999px;
    background: var(--accent); color: var(--accent-ink); font: 700 32px var(--font) }
  small { display: block; margin-top: 30px; font: 600 22px var(--font-mono); letter-spacing: .3em;
    text-transform: uppercase; color: var(--text-2) }
  .glow { position: absolute; left: 50%; top: 50%; width: 1100px; height: 1100px; margin: -550px;
    border-radius: 50%; background: radial-gradient(oklch(0.815 0.125 290 / .22), transparent 62%) }
  @keyframes pop { 0% { transform: scale(.4) rotate(-12deg); opacity: 0 }
    60% { transform: scale(1.08) rotate(2deg); opacity: 1 } 100% { transform: scale(1) rotate(0) } }
  @keyframes rise { from { transform: translateY(40px); opacity: 0 } to { transform: none; opacity: 1 } }
  @keyframes breathe { from { transform: scale(.85); opacity: 0 } to { transform: scale(1.05); opacity: 1 } }
  .glow { animation: breathe 2.4s ease-out both }
  .mark { animation: pop .9s cubic-bezier(.2,.9,.3,1.2) both }
  h1 { animation: rise .7s .45s ease-out both }
  p { animation: rise .7s .8s ease-out both }
  .pill { animation: rise .7s 1.15s ease-out both }
  small { animation: rise .7s 1.4s ease-out both }`

/** Intro: the mark pops in, then the wordmark and the tagline rise. */
export function introCard(root, format) {
  return `${head(root, format, CARD_CSS)}<body><div class="backdrop"></div><div class="glow"></div>
    <div class="card"><div><div class="mark">${logo(root)}</div>
    <h1>My<span>Tube</span></h1><p>Your YouTube home, curated by you.</p>
    <small>Save · Organize · Watch</small></div></div></body></html>`
}

/** Outro: same build-up, ending on the store call to action. */
export function outroCard(root, format) {
  return `${head(root, format, CARD_CSS)}<body><div class="backdrop"></div><div class="glow"></div>
    <div class="card"><div><div class="mark">${logo(root)}</div>
    <h1>My<span>Tube</span></h1><p>Free on the Chrome Web Store</p>
    <div class="pill">Add to Chrome</div></div></div></body></html>`
}

function stageCss({ window: w, popup, brandBar }) {
  return `
  .window { position: absolute; left: ${w.x}px; top: ${w.y}px; width: ${w.width}px;
    height: ${w.titlebar + w.contentHeight}px; border-radius: 14px; background: #0b0a10;
    box-shadow: 0 40px 90px #04030acc, 0 0 0 1px #ffffff14; overflow: hidden }
  .bar { height: ${w.titlebar}px; display: flex; align-items: center; gap: 14px; padding: 0 16px;
    background: #1d1a26; border-bottom: 1px solid #ffffff10 }
  .dots { display: flex; gap: 8px } .dots i { width: 12px; height: 12px; border-radius: 50%; display: block }
  .url { flex: 1; height: 28px; border-radius: 999px; background: #0f0d15; color: #a9a3bd;
    font: 500 15px/28px var(--font); padding: 0 16px; white-space: nowrap; overflow: hidden }
  .ext { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center }
  .ext.on { background: #ffffff1f } .ext svg { width: 20px; height: 20px }
  .content { position: absolute; top: ${w.titlebar}px; left: 0; right: 0; bottom: 0 }
  .content img { width: 100%; height: 100%; display: block; object-fit: cover; object-position: right top;
    filter: brightness(.55) }
  .popup-shadow { position: absolute; left: ${popup.x}px; top: ${popup.y}px; width: ${popup.width}px;
    height: ${popup.height}px; border-radius: 12px; box-shadow: 0 30px 70px #000c, 0 0 0 1px #ffffff1c }
  .brand { position: absolute; left: 0; right: 0; top: ${brandBar?.y ?? 0}px; display: flex; justify-content: center;
    align-items: center; gap: 22px; font: 800 76px/1 var(--font-display); letter-spacing: -3px }
  .brand svg { width: 84px; height: 84px } .brand span { color: var(--accent) }`
}

// Vertical feeds show no browser chrome around the video, so the brand rides
// on the stage itself, above the caption.
function brandBar(root) {
  return `<div class="brand">${logo(root)}<div>My<span>Tube</span></div></div>`
}

/**
 * Stage backdrop for one scene: brand gradient, window chrome with the fake
 * address bar, and — for the popup layout — the home still with a lit toolbar icon.
 * @example stageMarkup(root, LANDSCAPE, { url: 'youtube.com', backdropSrc: null })
 */
export function stageMarkup(root, format, { url, backdropSrc }) {
  const lit = backdropSrc ? 'on' : ''
  const content = backdropSrc ? `<img src="${backdropSrc}">` : ''
  return `${head(root, format, stageCss(format))}<body><div class="backdrop"></div>
    ${format.brandBar ? brandBar(root) : ''}
    <div class="window"><div class="bar"><span class="dots"><i style="background:#ff5f57"></i>
    <i style="background:#febc2e"></i><i style="background:#28c840"></i></span>
    <div class="url">${url}</div><span class="ext ${lit}">${logo(root)}</span></div>
    <div class="content">${content}</div></div>
    ${backdropSrc ? '<div class="popup-shadow"></div>' : ''}</body></html>`
}

// Landscape: one-line pill. Vertical: the same pill, allowed to wrap onto two
// centered lines within the frame's side gutters.
function captionCss({ caption, frame }) {
  return `
  html, body { background: transparent }
  .cap { position: absolute; left: 0; right: 0; top: 0; height: ${caption.height}px; display: flex;
    justify-content: center; align-items: flex-start }
  .cap span { max-width: ${frame.width - 100}px; padding: ${caption.font * 0.45}px ${caption.font}px;
    border-radius: ${caption.font * 0.9}px; background: #15121fe6; border: 1px solid #ffffff1a; text-align: center;
    font: 700 ${caption.font}px/1.18 var(--font-display); letter-spacing: -.5px; box-shadow: 0 16px 40px #0008 }
  .cap b { color: var(--accent) }`
}

/** Caption pill on a transparent page; `*word*` is painted in the accent. */
export function captionMarkup(root, format, text) {
  const html = text.replace(/\*(.+?)\*/g, '<b>$1</b>')
  return `${head(root, format, captionCss(format))}<body><div class="cap"><span>${html}</span></div></body></html>`
}
