// Header image for the Google Forms support & feedback form (1600×400, the
// 4:1 size Forms recommends). Forms crops the sides on narrow screens, so the
// mark and the words sit in the middle and the UI glimpse only fills the right.

import { boardPage, browserFrame, floatPanel, logoSvg } from './board-kit.mjs'

const FORMS_HEADER = { width: 1600, height: 400 }

const FORMS_CSS = `
  .forms .glow { position: absolute; left: 180px; top: -260px; width: 820px; height: 820px; border-radius: 50%;
    background: radial-gradient(rgba(255,255,255,.2), rgba(255,255,255,0) 62%) }
  .forms .copy { position: absolute; z-index: 10; left: 250px; top: 0; bottom: 0; width: 700px;
    display: flex; align-items: center; gap: 34px }
  .forms .mark { width: 128px; height: 128px; flex: none; filter: drop-shadow(0 24px 36px rgba(20,8,60,.55)) }
  .forms .mark svg { width: 100%; height: 100% }
  .forms h1 { margin: 0; font: 800 64px/1 var(--font-display); letter-spacing: -.035em }
  .forms h1 span { color: #e9e1ff }
  .forms p { margin: 14px 0 0; font-size: 22px; line-height: 1.35; color: rgba(255,255,255,.88) }
  .forms .chips { display: flex; gap: 10px; margin-top: 18px }
  .forms .chips span { padding: 6px 14px; border-radius: 999px; background: rgba(255,255,255,.14);
    border: 1px solid rgba(255,255,255,.22); font: 500 13px var(--font-mono); letter-spacing: .06em; color: #fff }
  .forms .ui { position: absolute; z-index: 5; left: 1010px; top: 70px; width: 700px; transform: rotate(-4deg) }`

function formsHeader(root, still, t) {
  const frame = browserFrame(root, { url: t.homeUrl, src: still('home') })
  const body = `<div class="board grad forms"><div class="glow"></div>
    <div class="copy"><div class="mark">${logoSvg(root)}</div><div>
      <h1>My<span>Tube</span> Support</h1>
      <p>Bugs, ideas or questions — we read every one.</p>
      <div class="chips"><span>🐞 bugs</span><span>💡 ideas</span><span>❓ help</span></div></div></div>
    <div class="ui">${frame}</div>
    ${floatPanel(still('yt-toast'), 'left:1120px;top:300px;width:300px;transform:rotate(-4deg)', 60)}</div>`
  return boardPage(root, FORMS_HEADER, FORMS_CSS, body)
}

export const FORMS_BOARDS = [{ file: 'forms-header-1600x400.png', size: FORMS_HEADER, html: formsHeader }]
