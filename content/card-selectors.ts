// The renderers that get a per-card "+ Salvar" pill. Split out of content.ts so
// coverage is unit-testable (content/card-selectors.test.ts): a renderer missing
// here silently gets no button, which is how rows of the user's OWN playlists
// went without one — those (and Watch Later / Liked) still use the classic
// ytd-playlist-video-renderer, while other people's playlists use lockups.

export const CARD_SELECTORS = [
  'ytd-rich-item-renderer', // home
  'ytd-video-renderer', // search results
  'ytd-compact-video-renderer', // suggested sidebar (legacy)
  'yt-lockup-view-model', // watch suggestions, others' playlist rows (current lockup renderer)
  'ytd-playlist-video-renderer', // rows of your own playlists, Watch Later, Liked (classic)
]

/**
 * Every card element under `root` that should carry a Save pill, in selector order.
 * @example findSaveTargets(document).length // cards on the current page
 */
export function findSaveTargets(root: ParentNode): HTMLElement[] {
  return CARD_SELECTORS.flatMap((selector) => [...root.querySelectorAll<HTMLElement>(selector)])
}
