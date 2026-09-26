// Shared marketing shell for the store boards — the layout language of the
// Dopamine Toll store set (brand mast, mono kicker, two-tone headline, point
// list, framed UI, floating panels, film grain) re-skinned in MyTube's brand:
// violet accent, Bricolage Grotesque + Plus Jakarta Sans + JetBrains Mono
// (vendored in styles/, loaded through theme-tokens.css).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const KIT_CSS = `
  :root {
    --m-bg: #0c0a11; --m-surface: #15121c; --m-line: rgba(235,228,255,.08); --m-line-2: rgba(235,228,255,.15);
    --m-text: #f2eefb; --m-dim: #a49eb4; --m-faint: #6e6880;
    --m-violet: #b7a3ff; --m-violet-2: #8f74ff; --m-magenta: #e27bd6;
  }
  * { box-sizing: border-box }
  html, body { margin: 0; background: #000 }
  .board { position: relative; overflow: hidden; isolation: isolate; color: var(--m-text); font-family: var(--font);
    -webkit-font-smoothing: antialiased;
    background: radial-gradient(130% 95% at 50% -18%, #1a1526 0%, rgba(26,21,38,0) 56%), var(--m-bg) }
  .board::after { content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 40; opacity: .045;
    mix-blend-mode: screen; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E") }
  .shot { width: 1280px; height: 800px; padding: 52px 64px 56px }
  .grad { background: radial-gradient(120% 90% at 50% -10%, #a58bff 0%, rgba(165,139,255,0) 55%),
    linear-gradient(165deg, #7a5cf5 0%, #5a3dd6 46%, #35208f 100%) }
  .grad-deep { background: radial-gradient(110% 80% at 18% 0%, #a152d8 0%, rgba(161,82,216,0) 55%),
    linear-gradient(158deg, #7b3cc8 0%, #4f2196 52%, #2c1260 100%) }
  .cream { background: radial-gradient(120% 90% at 50% -10%, #fffaf2 0%, rgba(255,250,242,0) 60%), #f1ebe1; color: #17131f }
  .bloom { position: absolute; z-index: 0; border-radius: 50%; pointer-events: none; filter: blur(8px);
    background: radial-gradient(circle, rgba(183,163,255,.18), rgba(183,163,255,0) 70%) }

  .brand { display: flex; align-items: center; gap: 13px; position: relative; z-index: 10 }
  .brand svg { width: 38px; height: 38px; flex: none }
  .brand .wm { display: flex; flex-direction: column; line-height: 1 }
  .brand .a { font: 800 22px var(--font-display); letter-spacing: -.02em }
  .brand .a span { color: var(--m-violet) }
  .brand .b { font: 500 9.5px var(--font-mono); letter-spacing: .34em; text-transform: uppercase; color: var(--m-dim); margin-top: 6px }
  .grad .brand .a span, .grad-deep .brand .a span { color: #fff }
  .grad .brand .b, .grad-deep .brand .b { color: rgba(255,255,255,.72) }
  .cream .brand .b { color: #6b6477 } .cream .brand .a span { color: #6b4fe0 }

  .kicker { margin: 0; display: flex; align-items: center; gap: 9px; font: 500 13px var(--font-mono);
    letter-spacing: .2em; text-transform: uppercase; color: var(--m-magenta) }
  .kicker .pip { width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 10px currentColor }
  .grad .kicker, .grad-deep .kicker { color: #fff }
  .cream .kicker { color: #b03fa3 }
  .headline { margin: 0; font: 800 54px/1.02 var(--font-display); letter-spacing: -.035em; text-wrap: balance }
  .headline .am { color: var(--m-violet) }
  .grad .headline .am, .grad-deep .headline .am { color: #e9e1ff; font-style: italic }
  .cream .headline .am { color: #6b4fe0 }
  .lede { margin: 0; max-width: 46ch; font-size: 19px; line-height: 1.5; color: var(--m-dim); text-wrap: pretty }
  .lede b { color: var(--m-text); font-weight: 700 }
  .grad .lede, .grad-deep .lede { color: rgba(255,255,255,.84) } .grad .lede b, .grad-deep .lede b { color: #fff }
  .cream .lede { color: #5d5669 } .cream .lede b { color: #17131f }
  .lede code { font: 500 .84em var(--font-mono); color: var(--m-violet); background: var(--m-surface); padding: 2px 7px; border-radius: 6px }
  .points { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px }
  .points li { display: flex; gap: 12px; align-items: flex-start; font-size: 16px; line-height: 1.45; color: var(--m-dim) }
  .points li::before { content: ""; flex: none; width: 6px; height: 6px; margin-top: 8px; border-radius: 50%; background: var(--m-violet) }
  .points li b { color: var(--m-text); font-weight: 700 }

  .frame { position: relative; z-index: 5; overflow: hidden; border-radius: 16px; background: #0b0910;
    border: 1px solid var(--m-line-2); box-shadow: 0 50px 90px -50px rgba(0,0,0,.95), 0 0 0 1px rgba(0,0,0,.4) }
  .frame .bar { display: flex; align-items: center; gap: 13px; height: 42px; padding: 0 15px; background: #13101a;
    border-bottom: 1px solid var(--m-line) }
  .frame .dots { display: flex; gap: 7px } .frame .dots i { width: 11px; height: 11px; border-radius: 50%; background: #2c2738 }
  .frame .addr { flex: 1; height: 26px; display: flex; align-items: center; padding: 0 12px; border-radius: 8px;
    background: #08070b; border: 1px solid var(--m-line); font: 500 12px var(--font-mono); color: var(--m-dim) }
  .frame .ext { width: 22px; height: 22px } .frame .ext svg { width: 100%; height: 100% }
  .frame img.view { display: block; width: 100% }
  .panel { position: absolute; z-index: 8; display: block; border-radius: 14px; overflow: hidden;
    box-shadow: 0 40px 80px -30px rgba(0,0,0,.85), 0 0 0 1px rgba(235,228,255,.12) }
  .panel img { display: block; width: 100% }
  .tag { display: inline-flex; align-items: center; gap: 9px; padding: 8px 15px; border-radius: 999px;
    font: 500 13px var(--font-mono); letter-spacing: .04em; border: 1px solid var(--m-line-2); color: var(--m-dim) }
  .tag i { width: 7px; height: 7px; border-radius: 50%; background: var(--m-violet) }
`

/** The extension's own mark (icons/icon.svg), inlined. */
export function logoSvg(root) {
  return readFileSync(join(root, 'icons', 'icon.svg'), 'utf8')
}

/**
 * Full HTML document for one board of `size`, with the kit and `css` inlined.
 * @example boardPage(root, { width: 1280, height: 800 }, '.x{}', '<div class="board shot">…</div>')
 */
export function boardPage(root, size, css, body) {
  const tokens = pathToFileURL(join(root, 'styles', 'theme-tokens.css')).href
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${tokens}">
    <style>${KIT_CSS} .board { width: ${size.width}px; height: ${size.height}px } ${css}</style></head>
    <body>${body}</body></html>`
}

/** Brand lockup: mark + "MyTube" + mono tagline. */
export function brandMast(root, tagline = 'your youtube, curated') {
  return `<div class="brand">${logoSvg(root)}<div class="wm"><span class="a">My<span>Tube</span></span>
    <span class="b">${tagline}</span></div></div>`
}

/** Browser window around a still, with a fake address bar and the lit toolbar icon. */
export function browserFrame(root, { url, src, style = '' }) {
  return `<div class="frame" style="${style}"><div class="bar"><span class="dots"><i></i><i></i><i></i></span>
    <span class="addr">${url}</span><span class="ext">${logoSvg(root)}</span></div>
    <img class="view" src="${src}"></div>`
}

/** A floating UI panel (a cropped still) positioned by inline `style`. */
export function floatPanel(src, style, radius = 14) {
  return `<div class="panel" style="border-radius:${radius}px;${style}"><img src="${src}"></div>`
}
