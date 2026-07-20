// Category-icon rendering for the vanilla-DOM surfaces (popup + content script).
// The geometry is STRUCTURED data (tag + attributes, lucide 24×24 outlines), not
// markup strings, because YouTube enforces Trusted Types on youtube.com — the
// content script cannot assign innerHTML, so icons must be built element-by-
// element via createElementNS. The popup shares this builder so there is exactly
// one copy of the geometry (HICON-8: one source of truth, no duplicated rules).
// The new-tab page keeps rendering lucide-react (newtab/components/CategoryIcon).

import { DEFAULT_ICON, IconKey, resolveCategoryIcon } from './category-icon'
import { isIconKey } from './validate-message'

type SvgShapeTag = 'path' | 'rect' | 'circle' | 'line' | 'polyline'

export interface IconShape {
  readonly tag: SvgShapeTag
  readonly attrs: Readonly<Record<string, string>>
}

const path = (d: string): IconShape => ({ tag: 'path', attrs: { d } })
const rect = (attrs: Record<string, string>): IconShape => ({ tag: 'rect', attrs })
const circle = (attrs: Record<string, string>): IconShape => ({ tag: 'circle', attrs })
const line = (attrs: Record<string, string>): IconShape => ({ tag: 'line', attrs })
const polyline = (points: string): IconShape => ({ tag: 'polyline', attrs: { points } })

export const ICON_SHAPES: Record<IconKey, readonly IconShape[]> = {
  grid: [
    rect({ width: '7', height: '7', x: '3', y: '3', rx: '1' }),
    rect({ width: '7', height: '7', x: '14', y: '3', rx: '1' }),
    rect({ width: '7', height: '7', x: '14', y: '14', rx: '1' }),
    rect({ width: '7', height: '7', x: '3', y: '14', rx: '1' }),
  ],
  gamepad: [
    line({ x1: '6', x2: '10', y1: '11', y2: '11' }),
    line({ x1: '8', x2: '8', y1: '9', y2: '13' }),
    line({ x1: '15', x2: '15.01', y1: '13', y2: '13' }),
    line({ x1: '18', x2: '18.01', y1: '11', y2: '11' }),
    rect({ width: '20', height: '12', x: '2', y: '6', rx: '6' }),
  ],
  box: [
    path(
      'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z',
    ),
    path('m3.3 7 8.7 5 8.7-5'),
    path('M12 22V12'),
  ],
  book: [
    path('M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z'),
    path('M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'),
  ],
  inbox: [
    polyline('22 12 16 12 14 15 10 15 8 12 2 12'),
    path(
      'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
    ),
  ],
  music: [
    path('M9 18V5l12-2v13'),
    circle({ cx: '6', cy: '18', r: '3' }),
    circle({ cx: '18', cy: '16', r: '3' }),
  ],
  film: [
    rect({ width: '18', height: '18', x: '3', y: '3', rx: '2' }),
    path('M7 3v18'),
    path('M3 7.5h4'),
    path('M3 12h18'),
    path('M3 16.5h4'),
    path('M17 3v18'),
    path('M17 7.5h4'),
    path('M17 16.5h4'),
  ],
  code: [polyline('16 18 22 12 16 6'), polyline('8 6 2 12 8 18')],
  dumbbell: [
    path('M14.4 14.4 9.6 9.6'),
    path(
      'M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z',
    ),
    path('m21.5 21.5-1.4-1.4'),
    path('M3.9 3.9 2.5 2.5'),
    path(
      'M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z',
    ),
  ],
  utensils: [
    path('M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2'),
    path('M7 2v20'),
    path('M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7'),
  ],
  palette: [
    circle({ cx: '13.5', cy: '6.5', r: '.5', fill: 'currentColor' }),
    circle({ cx: '17.5', cy: '10.5', r: '.5', fill: 'currentColor' }),
    circle({ cx: '8.5', cy: '7.5', r: '.5', fill: 'currentColor' }),
    circle({ cx: '6.5', cy: '12.5', r: '.5', fill: 'currentColor' }),
    path(
      'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z',
    ),
  ],
  rocket: [
    path(
      'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z',
    ),
    path('m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z'),
    path('M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0'),
    path('M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5'),
  ],
  flask: [
    path(
      'M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2',
    ),
    path('M6.453 15h11.094'),
    path('M8.5 2h7'),
  ],
  newspaper: [
    path(
      'M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2',
    ),
    path('M18 14h-8'),
    path('M15 18h-5'),
    path('M10 6h8v4h-8V6Z'),
  ],
  trophy: [
    path('M6 9H4.5a2.5 2.5 0 0 1 0-5H6'),
    path('M18 9h1.5a2.5 2.5 0 0 0 0-5H18'),
    path('M4 22h16'),
    path('M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22'),
    path('M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22'),
    path('M18 2H6v7a6 6 0 0 0 12 0V2Z'),
  ],
  bookmark: [path('m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z')],
}

const SVG_NS = 'http://www.w3.org/2000/svg'

// Builds the <svg> for an icon without any HTML parsing sink. The lookup key is
// gated against the closed set so stored data that bypassed the types (e.g. an
// old sync snapshot) can never index outside ICON_SHAPES (finding S3).
export function iconSvgElement(key: IconKey): SVGSVGElement {
  const gated = isIconKey(key) ? key : DEFAULT_ICON
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '2')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('aria-hidden', 'true')
  for (const shape of ICON_SHAPES[gated]) {
    const el = document.createElementNS(SVG_NS, shape.tag)
    for (const [name, value] of Object.entries(shape.attrs)) el.setAttribute(name, value)
    svg.appendChild(el)
  }
  return svg
}

// The <svg> a category should show — explicit icon wins, else the name auto-map
// (HICON-3/HICON-4). Usage: item.append(categoryIconElement(cat), nameSpan)
export function categoryIconElement(category: { name: string; icon?: IconKey }): SVGSVGElement {
  return iconSvgElement(resolveCategoryIcon(category))
}
