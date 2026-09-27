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

export const VIDEO_BOARDS = [{ file: 'youtube-thumbnail-1280x720.png', size: THUMB, html: youtubeThumbnail }]
