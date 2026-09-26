// The two promotional images the store places outside the screenshot strip:
// the 440×280 small tile (search results, category pages) and the 1400×560
// marquee (featured placements). Same gradient hero language as screenshot 1.

import { boardPage, browserFrame, logoSvg } from './board-kit.mjs'

const TILE = { width: 440, height: 280 }
const MARQUEE = { width: 1400, height: 560 }

// Small tiles render tiny in the store grid: mark + name + one line, no UI.
const TILE_CSS = `
  .tile { display: flex; align-items: center; gap: 24px; padding: 0 36px }
  .tile svg { width: 104px; height: 104px; flex: none; filter: drop-shadow(0 18px 26px rgba(20,8,60,.55)) }
  .tile h1 { margin: 0; font: 800 46px/1 var(--font-display); letter-spacing: -.03em }
  .tile h1 span { color: #e9e1ff }
  .tile p { margin: 10px 0 0; font-size: 16.5px; line-height: 1.3; color: rgba(255,255,255,.86) }
  .tile small { display: block; margin-top: 12px; font: 500 10px var(--font-mono); letter-spacing: .26em;
    text-transform: uppercase; color: rgba(255,255,255,.7) }`

function smallTile(root) {
  const body = `<div class="board grad tile">${logoSvg(root)}<div>
    <h1>My<span>Tube</span></h1><p>Your YouTube home,<br>curated by you.</p>
    <small>save · organize · watch</small></div></div>`
  return boardPage(root, TILE, TILE_CSS, body)
}

const MARQUEE_CSS = `
  .marquee { display: grid; grid-template-columns: 500px 1fr; align-items: center; padding: 0 0 0 72px }
  .marquee .mark { width: 72px; height: 72px } .marquee .mark svg { width: 100%; height: 100% }
  .marquee .headline { margin-top: 26px; font-size: 58px }
  .marquee .lede { margin-top: 16px; font-size: 18px; max-width: 30ch }
  .marquee .visual { position: relative; height: 100% }`

function marquee(root, still) {
  const frame = browserFrame(root, {
    url: 'MyTube — Home',
    src: still('home'),
    style: 'position:absolute;left:60px;top:70px;width:760px',
  })
  const body = `<div class="board grad marquee"><div class="copy"><div class="mark">${logoSvg(root)}</div>
    <h1 class="headline">Your YouTube, <span class="am">curated by you.</span></h1>
    <p class="lede">Save videos into <b>your own categories</b>. Come back to a home page with nothing recommended.</p></div>
    <div class="visual">${frame}</div></div>`
  return boardPage(root, MARQUEE, MARQUEE_CSS, body)
}

export const PROMO_BOARDS = [
  { file: 'small-promo-440x280.png', size: TILE, html: smallTile },
  { file: 'marquee-1400x560.png', size: MARQUEE, html: marquee },
]
