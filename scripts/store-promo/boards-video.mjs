// The YouTube thumbnail for the promo video (1280×720): the intro card's look
// (violet gradient, the mark, the wordmark) pushed for a feed thumbnail — few
// words, huge type, a glimpse of the real UI with the "Saved" toast as the hook.

import { boardPage, browserFrame, floatPanel, logoSvg } from './board-kit.mjs'

const THUMB = { width: 1280, height: 720 }

const THUMB_CSS = `
  .thumb { padding: 0 }
  .thumb .glow { position: absolute; left: -120px; top: 60px; width: 760px; height: 760px; border-radius: 50%;
    background: radial-gradient(rgba(255,255,255,.22), rgba(255,255,255,0) 62%) }
  .thumb .copy { position: absolute; z-index: 10; left: 70px; top: 0; bottom: 0; width: 600px;
    display: flex; flex-direction: column; justify-content: center }
  .thumb .mark { width: 150px; height: 150px; filter: drop-shadow(0 26px 40px rgba(20,8,60,.6)) }
  .thumb .mark svg { width: 100%; height: 100% }
  .thumb h1 { margin: 22px 0 0; font: 800 132px/.9 var(--font-display); letter-spacing: -.05em;
    text-shadow: 0 10px 40px rgba(20,8,60,.45) }
  .thumb h1 span { color: #e9e1ff }
  .thumb p { margin: 26px 0 0; font: 800 44px/1.05 var(--font-display); letter-spacing: -.02em; color: #fff }
  .thumb p em { font-style: normal; color: #1b0f3d; background: #e9e1ff; padding: 0 12px; border-radius: 10px }
  .thumb .ui { position: absolute; z-index: 5; left: 640px; top: 96px; width: 760px; transform: rotate(-6deg) }`

function youtubeThumbnail(root, still, t) {
  const frame = browserFrame(root, { url: t.homeUrl, src: still('home') })
  const body = `<div class="board grad thumb"><div class="glow"></div>
    <div class="copy"><div class="mark">${logoSvg(root)}</div>
      <h1>My<span>Tube</span></h1>
      <p>YouTube, curated<br>by <em>you.</em></p></div>
    <div class="ui">${frame}</div>
    ${floatPanel(still('yt-toast'), 'left:760px;top:520px;width:380px;transform:rotate(-6deg)', 60)}</div>`
  return boardPage(root, THUMB, THUMB_CSS, body)
}

// Cover for the vertical cut (Shorts / TikTok / Reels), 1080×1920. Feeds paint
// their own UI over the bottom ~350px and the right edge, and the Reels
// profile grid crops the cover to the middle 3:4 (1080×1440, y 240–1680) —
// so every word and the mark live inside that band.
const COVER = { width: 1080, height: 1920 }

const COVER_CSS = `
  .cover { text-align: center }
  .cover .glow { position: absolute; left: 50%; top: 380px; width: 1100px; height: 1100px; margin-left: -550px;
    border-radius: 50%; background: radial-gradient(rgba(255,255,255,.2), rgba(255,255,255,0) 62%) }
  .cover .chip { position: absolute; z-index: 10; left: 0; right: 0; top: 300px; display: flex; justify-content: center }
  .cover .chip span { padding: 10px 22px; border-radius: 999px; background: rgba(255,255,255,.16);
    border: 1px solid rgba(255,255,255,.26); font: 600 22px var(--font-mono); letter-spacing: .2em;
    text-transform: uppercase; color: #fff }
  .cover h1 { position: absolute; z-index: 10; left: 70px; right: 70px; top: 380px; margin: 0;
    font: 800 108px/.98 var(--font-display); letter-spacing: -.045em; text-shadow: 0 12px 40px rgba(20,8,60,.45) }
  .cover h1 span { color: #e9e1ff; font-style: italic }
  .cover .popup { left: 170px; top: 640px; width: 400px; transform: rotate(-5deg) }
  .cover .toast { left: 430px; top: 1090px; width: 500px; transform: rotate(-5deg) }
  .cover .brand { position: absolute; z-index: 10; left: 0; right: 0; top: 1450px; display: flex;
    justify-content: center; align-items: center; gap: 26px }
  .cover .brand svg { width: 132px; height: 132px; filter: drop-shadow(0 20px 30px rgba(20,8,60,.55)) }
  .cover .brand b { display: block; font: 800 96px/1 var(--font-display); letter-spacing: -.04em; text-align: left }
  .cover .brand b span { color: #e9e1ff }
  .cover .brand small { display: block; margin-top: 10px; font-size: 28px; color: rgba(255,255,255,.88); text-align: left }`

function shortsCover(root, still, t) {
  const body = `<div class="board grad cover"><div class="glow"></div>
    <div class="chip"><span>${t.cover.chip}</span></div>
    <h1>${t.cover.headline}</h1>
    <div class="panel popup"><img src="${still('popup')}"></div>
    <div class="panel toast" style="border-radius:80px"><img src="${still('yt-toast')}"></div>
    <div class="brand">${logoSvg(root)}<div><b>My<span>Tube</span></b><small>${t.cover.foot}</small></div></div></div>`
  return boardPage(root, COVER, COVER_CSS, body)
}

export const VIDEO_BOARDS = [
  { file: 'youtube-thumbnail-1280x720.png', size: THUMB, html: youtubeThumbnail },
  { file: 'shorts-cover-1080x1920.png', size: COVER, html: shortsCover },
]
