// Banner for the top of the README, 1280×640 — also GitHub's social-preview
// size (Settings → Social preview), so one image serves both. Same gradient
// hero language as the store marquee; text stays in the left half so the
// preview still reads when a site crops it to a narrower card.

import { boardPage, browserFrame, floatPanel, logoSvg } from './board-kit.mjs'

const BANNER = { width: 1280, height: 640 }

const BANNER_CSS = `
  .banner .glow { position: absolute; left: -160px; top: -120px; width: 900px; height: 900px; border-radius: 50%;
    background: radial-gradient(rgba(255,255,255,.2), rgba(255,255,255,0) 62%) }
  .banner .copy { position: absolute; z-index: 10; left: 72px; top: 0; bottom: 0; width: 560px;
    display: flex; flex-direction: column; justify-content: center }
  .banner .lockup { display: flex; align-items: center; gap: 22px }
  .banner .lockup svg { width: 96px; height: 96px; filter: drop-shadow(0 20px 30px rgba(20,8,60,.55)) }
  .banner .lockup b { font: 800 84px/1 var(--font-display); letter-spacing: -.045em }
  .banner .lockup b span { color: #e9e1ff }
  .banner h1 { margin: 30px 0 0; font: 800 44px/1.05 var(--font-display); letter-spacing: -.03em }
  .banner h1 span { color: #e9e1ff; font-style: italic }
  .banner p { margin: 16px 0 0; font-size: 20px; line-height: 1.45; color: rgba(255,255,255,.86) }
  .banner .chips { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px }
  .banner .chips span { padding: 7px 15px; border-radius: 999px; background: rgba(255,255,255,.14);
    border: 1px solid rgba(255,255,255,.24); font: 500 14px var(--font-mono); letter-spacing: .05em; color: #fff }
  .banner .ui { position: absolute; z-index: 5; left: 680px; top: 110px; width: 760px; transform: rotate(-5deg) }`

function readmeBanner(root, still, t) {
  const frame = browserFrame(root, { url: t.homeUrl, src: still('home') })
  const chips = t.banner.chips.map((chip) => `<span>${chip}</span>`).join('')
  const body = `<div class="board grad banner"><div class="glow"></div>
    <div class="copy"><div class="lockup">${logoSvg(root)}<b>My<span>Tube</span></b></div>
      <h1>${t.banner.headline}</h1><p>${t.banner.lede}</p><div class="chips">${chips}</div></div>
    <div class="ui">${frame}</div>
    ${floatPanel(still('yt-toast'), 'left:760px;top:470px;width:360px;transform:rotate(-5deg)', 60)}</div>`
  return boardPage(root, BANNER, BANNER_CSS, body)
}

export const README_BOARDS = [{ file: 'banner-1280x640.png', size: BANNER, html: readmeBanner }]
