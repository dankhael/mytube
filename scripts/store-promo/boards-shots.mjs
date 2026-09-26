// The five 1280×800 listing screenshots. Each mirrors a Dopamine Toll
// composition — gradient hero, dark split, gradient panel board, mirrored dark
// split, cream centered close — with MyTube's copy and real UI stills.
// Every claim here must match docs/chrome-web-store-submission.md (e.g. the
// home opens from the toolbar / Ctrl+Shift+Y; it is NOT a new-tab override).

import { boardPage, brandMast, browserFrame, floatPanel, logoSvg } from './board-kit.mjs'

const SHOT = { width: 1280, height: 800 }

const HERO_CSS = `
  .hero { padding: 54px 64px 0; text-align: center }
  .hero .headline { font-size: 60px }
  .hero .lede { margin: 16px auto 0; max-width: 54ch; font-size: 19px }
  .hero .badge { position: absolute; z-index: 9; left: 84px; top: 432px; width: 132px; height: 132px; border-radius: 50%;
    display: grid; place-items: center; background: #15101f; box-shadow: 0 30px 60px -20px rgba(0,0,0,.7) }
  .hero .badge svg { width: 78px; height: 78px }`

function heroShot(root, still) {
  const frame = browserFrame(root, {
    url: 'MyTube — Home',
    src: still('home'),
    style: 'position:absolute;left:170px;right:170px;top:268px',
  })
  const body = `<div class="board shot grad hero">
    <h1 class="headline">Your YouTube, <span class="am">curated by you.</span></h1>
    <p class="lede">Save videos from anywhere on YouTube into <b>your own categories</b> — and come back to a home page that's all yours.</p>
    ${frame}<div class="badge">${logoSvg(root)}</div>
    ${floatPanel(still('popup'), 'right:92px;top:330px;width:250px')}</div>`
  return boardPage(root, SHOT, HERO_CSS, body)
}

const SPLIT_CSS = `
  .wrap { position: relative; z-index: 5; display: flex; flex-direction: column; height: 100% }
  .main { flex: 1; display: grid; gap: 56px; align-items: center; margin-top: 10px }
  .copy .kicker { margin-bottom: 20px } .copy .lede { margin-top: 18px } .copy .points { margin-top: 28px }
  .stage { position: relative; height: 560px }`

function saveShot(root, still) {
  const body = `<div class="board shot"><div class="bloom" style="width:720px;height:720px;right:-160px;top:40px"></div>
    <div class="wrap">${brandMast(root)}<div class="main" style="grid-template-columns:.9fr 1.1fr">
    <div class="copy"><p class="kicker"><span class="pip"></span>save from anywhere</p>
      <h1 class="headline">One click. <span class="am">It's saved.</span></h1>
      <p class="lede">Every video card on YouTube gets a <b>Save</b> button. Pick a category and it's in your library — no playlist juggling, no Watch Later pile.</p>
      <ul class="points"><li><span><b>Search, home feed, sidebar</b> and the watch page</span></li>
      <li><span><b>Whole playlists</b> in one click</span></li>
      <li><span>Make a <b>new category</b> right from the menu</span></li></ul></div>
    <div class="stage">
      ${floatPanel(still('yt-card'), 'left:0;top:30px;width:1300px;clip-path:inset(0 55.2% 0 0 round 14px)', 14)}
      ${floatPanel(still('yt-menu'), 'left:300px;top:210px;width:270px', 12)}
      ${floatPanel(still('yt-toast'), 'left:40px;top:430px;width:250px', 40)}</div></div></div></div>`
  return boardPage(root, SHOT, SPLIT_CSS, body)
}

const ORGANIZE_CSS = `
  .top { position: relative; z-index: 6; margin-top: 30px; max-width: 560px }
  .top .kicker { margin-bottom: 16px } .top .lede { margin-top: 14px }`

function organizeShot(root, still) {
  const body = `<div class="board shot grad-deep">${brandMast(root)}
    <div class="top"><p class="kicker"><span class="pip"></span>your categories</p>
      <h1 class="headline">Organize it <span class="am">your way.</span></h1>
      <p class="lede">Your own categories with your own icons. Create one in seconds, and <b>move any video</b> between them in two clicks.</p></div>
    ${floatPanel(still('modal-new-category'), 'left:64px;top:340px;width:500px', 16)}
    ${floatPanel(still('modal-move'), 'left:640px;top:250px;width:470px', 16)}</div>`
  return boardPage(root, SHOT, SPLIT_CSS + ORGANIZE_CSS, body)
}

function homeShot(root, still) {
  const frame = browserFrame(root, { url: 'MyTube — Home', src: still('home-search'), style: 'width:640px' })
  const body = `<div class="board shot"><div class="bloom" style="width:760px;height:760px;left:-200px;top:40px"></div>
    <div class="wrap">${brandMast(root)}<div class="main" style="grid-template-columns:1.12fr .88fr">
    <div class="stage">${frame}
      ${floatPanel(still('popup'), 'right:-24px;top:120px;width:220px')}
      ${floatPanel(still('yt-nudge'), 'left:30px;top:430px;width:420px', 30)}</div>
    <div class="copy"><p class="kicker"><span class="pip"></span>no algorithm</p>
      <h1 class="headline">A home page with <span class="am">nothing recommended.</span></h1>
      <p class="lede">Open it from the toolbar or with <code>Ctrl+Shift+Y</code>. Just what you saved — search it, filter it, watch it.</p>
      <ul class="points"><li><span><b>Watched tracking</b> and an unwatched badge</span></li>
      <li><span>Opt-in <b>reminders</b> — off until you turn them on</span></li>
      <li><span><b>Syncs</b> across your signed-in Chrome browsers</span></li></ul></div></div></div></div>`
  return boardPage(root, SHOT, SPLIT_CSS, body)
}

const YOURS_CSS = `
  .yours { text-align: center } .yours .brand { justify-content: center }
  .yours .brand .wm { text-align: left }
  .yours .kicker { justify-content: center; margin-top: 22px } .yours .headline { margin-top: 12px; font-size: 54px }
  .yours .lede { margin: 14px auto 0; max-width: 62ch; font-size: 18px }
  .looks { position: absolute; left: 64px; right: 64px; top: 318px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px 24px }
  .look { position: relative; border-radius: 12px; overflow: hidden; box-shadow: 0 30px 60px -28px rgba(30,20,50,.55), 0 0 0 1px rgba(20,10,40,.12) }
  .look img { display: block; width: 100%; aspect-ratio: 1440 / 400; object-fit: cover; object-position: top }
  .look span { position: absolute; right: 12px; bottom: 12px; padding: 5px 11px; border-radius: 999px; background: rgba(12,10,17,.82);
    font: 500 11px var(--font-mono); letter-spacing: .16em; text-transform: uppercase; color: #f2eefb }
  .trust { position: absolute; left: 0; right: 0; bottom: 44px; display: flex; justify-content: center; gap: 14px }
  .cream .tag { color: #3d364a; border-color: rgba(23,19,31,.16) } .cream .tag i { background: #6b4fe0 }`

function yoursShot(root, still) {
  const look = (name, label) => `<div class="look"><img src="${still(name)}"><span>${label}</span></div>`
  const body = `<div class="board shot cream yours">${brandMast(root)}
    <p class="kicker"><span class="pip"></span>make it yours</p>
    <h1 class="headline">Your colors. <span class="am">Your library.</span></h1>
    <p class="lede">Pick an accent, go retro with the <b>CRT skin</b>, switch between English and Portuguese. Your library lives in <b>your own browser storage</b>.</p>
    <div class="looks">${look('home-accent-mint', 'mint')}${look('home-accent-amber', 'amber')}${look('home-accent-pink', 'pink')}${look('home-smpte', 'crt skin')}</div>
    <div class="trust"><span class="tag"><i></i>no account</span><span class="tag"><i></i>no server</span><span class="tag"><i></i>no ads</span><span class="tag"><i></i>open source</span></div></div>`
  return boardPage(root, SHOT, YOURS_CSS, body)
}

export const SHOT_BOARDS = [
  { file: 'screenshot-1-hero-1280x800.png', size: SHOT, html: heroShot },
  { file: 'screenshot-2-save-1280x800.png', size: SHOT, html: saveShot },
  { file: 'screenshot-3-organize-1280x800.png', size: SHOT, html: organizeShot },
  { file: 'screenshot-4-home-1280x800.png', size: SHOT, html: homeShot },
  { file: 'screenshot-5-yours-1280x800.png', size: SHOT, html: yoursShot },
]
