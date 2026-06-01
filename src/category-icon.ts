// Shared category → icon mapping. Framework-agnostic and dependency-free (no
// import of types.ts, to avoid a cycle: types.ts imports IconKey from here).
// Both surfaces consume this: the popup renders inline SVG (popup/category-icon),
// the home renders lucide-react (newtab/components/CategoryIcon). One source of
// truth for the rules (spec HICON-8). The category `emoji` field is unrelated.

export type IconKey =
  | 'grid'
  | 'gamepad'
  | 'box'
  | 'book'
  | 'inbox'
  | 'music'
  | 'film'
  | 'code'
  | 'dumbbell'
  | 'utensils'
  | 'palette'
  | 'rocket'
  | 'flask'
  | 'newspaper'
  | 'trophy'
  | 'bookmark'

export const DEFAULT_ICON: IconKey = 'bookmark'

// Order shown in the icon picker (DEFAULT_ICON last as the neutral fallback).
export const ALL_ICONS: readonly IconKey[] = [
  'grid',
  'gamepad',
  'box',
  'book',
  'inbox',
  'music',
  'film',
  'code',
  'dumbbell',
  'utensils',
  'palette',
  'rocket',
  'flask',
  'newspaper',
  'trophy',
  'bookmark',
]

// First substring (in the lowercased name) wins, so order from specific → broad.
const RULES: ReadonlyArray<readonly [string, IconKey]> = [
  ['rpg', 'box'],
  ['game', 'gamepad'],
  ['jogo', 'gamepad'],
  ['gaming', 'gamepad'],
  ['tutori', 'book'],
  ['educa', 'book'],
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
  ['fit', 'dumbbell'],
  ['gym', 'dumbbell'],
  ['workout', 'dumbbell'],
  ['trein', 'dumbbell'],
  ['exerc', 'dumbbell'],
  ['food', 'utensils'],
  ['cook', 'utensils'],
  ['receita', 'utensils'],
  ['cozinh', 'utensils'],
  ['culin', 'utensils'],
  ['arte', 'palette'],
  ['paint', 'palette'],
  ['desenho', 'palette'],
  ['design', 'palette'],
  ['space', 'rocket'],
  ['rocket', 'rocket'],
  ['startup', 'rocket'],
  ['foguete', 'rocket'],
  ['scien', 'flask'],
  ['ciênc', 'flask'],
  ['cienc', 'flask'],
  ['quím', 'flask'],
  ['quim', 'flask'],
  ['news', 'newspaper'],
  ['notíci', 'newspaper'],
  ['notici', 'newspaper'],
  ['jornal', 'newspaper'],
  ['sport', 'trophy'],
  ['esporte', 'trophy'],
  ['futebol', 'trophy'],
  ['soccer', 'trophy'],
  ['code', 'code'],
  ['cód', 'code'],
  ['dev', 'code'],
  ['program', 'code'],
  ['tech', 'code'],
  ['entret', 'grid'],
  ['entertain', 'grid'],
  ['divers', 'grid'],
  ['uncategor', 'inbox'],
  ['sem categoria', 'inbox'],
  ['outros', 'inbox'],
  ['other', 'inbox'],
  ['misc', 'inbox'],
]

// Best-effort icon guessed from a category's name. Unknown/empty → default.
// Never throws (defensive: callers may pass undefined from untyped data).
export function categoryIcon(name: string): IconKey {
  const needle = String(name ?? '').toLowerCase()
  for (const [substr, key] of RULES) {
    if (needle.includes(substr)) return key
  }
  return DEFAULT_ICON
}

// The icon a category should actually show: an explicit choice wins, otherwise
// fall back to the name-based guess (spec HICON-3/HICON-4). Used by both surfaces.
export function resolveCategoryIcon(category: { name: string; icon?: IconKey }): IconKey {
  return category.icon ?? categoryIcon(category.name)
}
