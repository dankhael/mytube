// Points the new-tab favicon at the accent-colored mark so the browser tab icon
// matches the theme (THEME-10). The static index.html ships a PNG <link rel="icon">
// (kept for first paint / TAB-2/3); once settings load we swap its href to an
// inline SVG data URI built from the chosen accent. Document is injected so the
// swap is jsdom-testable.

import { accentLogoSvg } from '../src/logo-svg'

export function applyAccentFavicon(doc: Document, accent: unknown): void {
  const href = 'data:image/svg+xml,' + encodeURIComponent(accentLogoSvg(accent))
  let link = doc.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = doc.createElement('link')
    link.rel = 'icon'
    doc.head.appendChild(link)
  }
  link.type = 'image/svg+xml'
  link.href = href
}
