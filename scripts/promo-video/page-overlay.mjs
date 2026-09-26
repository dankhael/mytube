// In-page chrome for the recordings: a visible arrow that follows the
// (synthesized) mouse, a ripple on press, and a style sheet that tidies the
// page for camera. Playwright's own mouse is invisible, so without this the
// takes would show buttons reacting to no one.
//
// These functions run inside the page, not in Node: they are serialized with
// Function#toString into one init script, so each may only use DOM globals and
// the other functions listed in OVERLAY_FUNCTIONS. They are built with DOM
// APIs, not innerHTML, because youtube.com enforces Trusted Types.

function setAttrs(element, attrs) {
  Object.entries(attrs).forEach(([name, value]) => element.setAttribute(name, value))
  return element
}

function buildArrow() {
  const SVG = 'http://www.w3.org/2000/svg'
  const arrow = setAttrs(document.createElementNS(SVG, 'svg'), {
    viewBox: '0 0 24 24',
    width: '30',
    height: '30',
  })
  const path = setAttrs(document.createElementNS(SVG, 'path'), {
    d: 'M4 2 L4 19 L8.5 14.8 L11.6 21.6 L14.6 20.3 L11.5 13.6 L17.6 13.4 Z',
    fill: '#fff',
    stroke: '#111',
    'stroke-width': '1.4',
    'stroke-linejoin': 'round',
  })
  arrow.appendChild(path)
  return arrow
}

function mountCursor() {
  const cursor = document.createElement('div')
  cursor.style.cssText =
    'position:fixed;left:-4px;top:-2px;z-index:2147483647;pointer-events:none;' +
    'filter:drop-shadow(0 2px 3px rgba(0,0,0,.45));transform:translate(-100px,-100px)'
  cursor.appendChild(buildArrow())
  document.documentElement.appendChild(cursor)
  const follow = (event) => (cursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`)
  addEventListener('mousemove', follow, true)
}

function showRipple(event) {
  const ring = document.createElement('div')
  ring.style.cssText =
    `position:fixed;left:${event.clientX - 22}px;top:${event.clientY - 22}px;width:44px;height:44px;` +
    'border-radius:50%;border:3px solid rgba(190,170,255,.95);background:rgba(190,170,255,.25);' +
    'z-index:2147483646;pointer-events:none;transition:transform .45s ease-out,opacity .45s ease-out;' +
    'transform:scale(.3);opacity:1'
  document.documentElement.appendChild(ring)
  requestAnimationFrame(() => Object.assign(ring.style, { transform: 'scale(1.25)', opacity: '0' }))
  setTimeout(() => ring.remove(), 600)
}

// Scrollbars read as clutter on camera. YouTube's hover preview is hidden
// too: headless Chromium has no H.264, so it paints a black rectangle. And
// YouTube's ad slots go: a portrait take of the home showed a third-party car
// ad above the feed, which has no place in MyTube's own promo.
function mountCameraStyle() {
  const style = document.createElement('style')
  style.textContent =
    '::-webkit-scrollbar{display:none!important} *{scrollbar-width:none!important}' +
    'ytd-video-preview,#video-preview{display:none!important}' +
    'ytd-ad-slot-renderer,ytd-in-feed-ad-layout-renderer,ytd-banner-promo-renderer,#masthead-ad,' +
    'ytd-rich-item-renderer:has(ytd-ad-slot-renderer),ytd-rich-section-renderer:has(ytd-ad-slot-renderer)' +
    '{display:none!important}'
  document.documentElement.appendChild(style)
}

function installOverlay() {
  if (window.top !== window) return
  const install = () => {
    mountCursor()
    mountCameraStyle()
    addEventListener('mousedown', showRipple, true)
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', install)
  else install()
}

const OVERLAY_FUNCTIONS = [setAttrs, buildArrow, mountCursor, showRipple, mountCameraStyle, installOverlay]

/**
 * Injects the overlay into every page of `context`, before page scripts run.
 * @example await enablePageOverlay(context)
 */
export function enablePageOverlay(context) {
  // Wrapped in an IIFE so the helper names never land on the page's globals.
  const content = `(() => {\n${OVERLAY_FUNCTIONS.map(String).join('\n')}\ninstallOverlay()\n})()`
  return context.addInitScript({ content })
}
