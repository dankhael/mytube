// Maps a category to a monochrome icon for the popup (spec PUI-2). The popup is
// vanilla DOM, so icons are inline SVG strings rather than lucide-react. User
// categories are free-form, so unmatched/empty names fall back to a default
// (PUI-9) — never throws. The category `emoji` is untouched (still used on home).

export type IconKey =
  | 'grid'
  | 'gamepad'
  | 'box'
  | 'book'
  | 'inbox'
  | 'music'
  | 'film'
  | 'code'
  | 'bookmark'

export const DEFAULT_ICON: IconKey = 'bookmark'

// First substring (in the lowercased name) wins, so order from specific → broad.
const RULES: ReadonlyArray<readonly [string, IconKey]> = [
  ['rpg', 'box'],
  ['game', 'gamepad'],
  ['jogo', 'gamepad'],
  ['gaming', 'gamepad'],
  ['educa', 'book'],
  ['tutorial', 'book'],
  ['aprend', 'book'],
  ['curso', 'book'],
  ['learn', 'book'],
  ['study', 'book'],
  ['estudo', 'book'],
  ['music', 'music'],
  ['músic', 'music'],
  ['podcast', 'music'],
  ['film', 'film'],
  ['movie', 'film'],
  ['cinema', 'film'],
  ['série', 'film'],
  ['serie', 'film'],
  ['entret', 'grid'],
  ['entertain', 'grid'],
  ['divers', 'grid'],
  ['code', 'code'],
  ['cód', 'code'],
  ['dev', 'code'],
  ['program', 'code'],
  ['tech', 'code'],
  ['uncategor', 'inbox'],
  ['sem categoria', 'inbox'],
  ['outros', 'inbox'],
  ['other', 'inbox'],
  ['misc', 'inbox'],
]

export function categoryIcon(name: string): IconKey {
  const needle = String(name ?? '').toLowerCase()
  for (const [substr, key] of RULES) {
    if (needle.includes(substr)) return key
  }
  return DEFAULT_ICON
}

// Inner SVG geometry per icon (lucide path data, 24×24, currentColor stroke).
const PATHS: Record<IconKey, string> = {
  grid:
    '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  gamepad:
    '<line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="6"/>',
  box:
    '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  book:
    '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  inbox:
    '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  film:
    '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/>',
  code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
}

export function iconSvg(key: IconKey): string {
  return (
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    PATHS[key] +
    '</svg>'
  )
}

export function categorySvg(name: string): string {
  return iconSvg(categoryIcon(name))
}
