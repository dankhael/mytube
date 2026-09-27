// The five 1280×800 listing screenshots. Each mirrors a Dopamine Toll
// composition — gradient hero, dark split, gradient panel board, mirrored dark
// split, cream centered close — with MyTube's copy and real UI stills.
// Layout only: every word comes from copy.mjs (`t`, one listing language).

import { boardPage, brandMast, browserFrame, floatPanel, logoSvg } from './board-kit.mjs'

const kicker = (text) => `<p class="kicker"><span class="pip"></span>${text}</p>`
const pointList = (items) =>
  `<ul class="points">${items.map((item) => `<li><span>${item}</span></li>`).join('')}</ul>`

const SHOT = { width: 1280, height: 800 }

const HERO_CSS = `
  .hero { padding: 54px 64px 0; text-align: center }
  .hero .headline { font-size: 60px }
  .hero .lede { margin: 16px auto 0; max-width: 54ch; font-size: 19px }
  .hero .badge { position: absolute; z-index: 9; left: 84px; top: 432px; width: 132px; height: 132px; border-radius: 50%;
    display: grid; place-items: center; background: #15101f; box-shadow: 0 30px 60px -20px rgba(0,0,0,.7) }
  .hero .badge svg { width: 78px; height: 78px }`

function heroShot(root, still, t) {
  const frame = browserFrame(root, {
    url: t.homeUrl,
    src: still('home'),
    style: 'position:absolute;left:170px;right:170px;top:268px',
  })
  const body = `<div class="board shot grad hero">
    <h1 class="headline">${t.hero.headline}</h1>
    <p class="lede">${t.hero.lede}</p>
    ${frame}<div class="badge">${logoSvg(root)}</div>
    ${floatPanel(still('popup'), 'right:92px;top:330px;width:250px')}</div>`
  return boardPage(root, SHOT, HERO_CSS, body)
}

const SPLIT_CSS = `
  .wrap { position: relative; z-index: 5; display: flex; flex-direction: column; height: 100% }
  .main { flex: 1; display: grid; gap: 56px; align-items: center; margin-top: 10px }
  .copy .kicker { margin-bottom: 20px } .copy .lede { margin-top: 18px } .copy .points { margin-top: 28px }
  .stage { position: relative; height: 560px }`

function saveShot(root, still, t) {
  const body = `<div class="board shot"><div class="bloom" style="width:720px;height:720px;right:-160px;top:40px"></div>
    <div class="wrap">${brandMast(root, t.tagline)}<div class="main" style="grid-template-columns:.9fr 1.1fr">
    <div class="copy">${kicker(t.save.kicker)}<h1 class="headline">${t.save.headline}</h1>
      <p class="lede">${t.save.lede}</p>${pointList(t.save.points)}</div>
    <div class="stage">
      ${floatPanel(still('yt-card'), 'left:0;top:30px;width:1300px;clip-path:inset(0 55.2% 0 0 round 14px)', 14)}
      ${floatPanel(still('yt-menu'), 'left:300px;top:210px;width:270px', 12)}
      ${floatPanel(still('yt-toast'), 'left:40px;top:430px;width:250px', 40)}</div></div></div></div>`
  return boardPage(root, SHOT, SPLIT_CSS, body)
}

const ORGANIZE_CSS = `
  .top { position: relative; z-index: 6; margin-top: 30px; max-width: 560px }
  .top .kicker { margin-bottom: 16px } .top .lede { margin-top: 14px }`

function organizeShot(root, still, t) {
  const body = `<div class="board shot grad-deep">${brandMast(root, t.tagline)}
    <div class="top">${kicker(t.organize.kicker)}<h1 class="headline">${t.organize.headline}</h1>
      <p class="lede">${t.organize.lede}</p></div>
    ${floatPanel(still('modal-new-category'), 'left:64px;top:340px;width:500px', 16)}
    ${floatPanel(still('modal-move'), 'left:640px;top:250px;width:470px', 16)}</div>`
  return boardPage(root, SHOT, SPLIT_CSS + ORGANIZE_CSS, body)
}

function homeShot(root, still, t) {
  const frame = browserFrame(root, { url: t.homeUrl, src: still('home-search'), style: 'width:640px' })
  const body = `<div class="board shot"><div class="bloom" style="width:760px;height:760px;left:-200px;top:40px"></div>
    <div class="wrap">${brandMast(root, t.tagline)}<div class="main" style="grid-template-columns:1.12fr .88fr">
    <div class="stage">${frame}
      ${floatPanel(still('popup'), 'right:-24px;top:120px;width:220px')}
      ${floatPanel(still('yt-nudge'), 'left:30px;top:430px;width:420px', 30)}</div>
    <div class="copy">${kicker(t.home.kicker)}<h1 class="headline">${t.home.headline}</h1>
      <p class="lede">${t.home.lede}</p>${pointList(t.home.points)}</div></div></div></div>`
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

function yoursShot(root, still, t) {
  const look = (name, label) => `<div class="look"><img src="${still(name)}"><span>${label}</span></div>`
  const shots = ['home-accent-mint', 'home-accent-amber', 'home-accent-pink', 'home-smpte']
  const looks = shots.map((name, i) => look(name, t.yours.looks[i])).join('')
  const trust = t.yours.trust.map((item) => `<span class="tag"><i></i>${item}</span>`).join('')
  const body = `<div class="board shot cream yours">${brandMast(root, t.tagline)}
    ${kicker(t.yours.kicker)}<h1 class="headline">${t.yours.headline}</h1>
    <p class="lede">${t.yours.lede}</p>
    <div class="looks">${looks}</div><div class="trust">${trust}</div></div>`
  return boardPage(root, SHOT, YOURS_CSS, body)
}

export const SHOT_BOARDS = [
  { file: 'screenshot-1-hero-1280x800.png', size: SHOT, html: heroShot },
  { file: 'screenshot-2-save-1280x800.png', size: SHOT, html: saveShot },
  { file: 'screenshot-3-organize-1280x800.png', size: SHOT, html: organizeShot },
  { file: 'screenshot-4-home-1280x800.png', size: SHOT, html: homeShot },
  { file: 'screenshot-5-yours-1280x800.png', size: SHOT, html: yoursShot },
]
