// Playlist / Mix cards ("collections") share the yt-lockup-view-model renderer
// with single videos, and their thumbnail link is `watch?v=<first>&list=…` — so
// extractCard read the FIRST video's id under the PLAYLIST's title, and "+ Salvar"
// on /feed/playlists saved one mislabeled video instead of the playlist. Saving a
// whole list from a card is impossible (its rows aren't rendered here; import
// lives on the playlist page), so collection cards get no save button at all.

// Any one of these marks the card as a list, not a video: a "view full playlist"
// link, YouTube's stacked collection thumbnail, the classic playlist thumbnail,
// or a Mix's radio link.
const COLLECTION_MARKERS = [
  'a[href*="/playlist?"]',
  'yt-collection-thumbnail-view-model',
  'yt-collections-stack',
  'ytd-playlist-thumbnail',
  'a[href*="start_radio="]',
].join(',')

/**
 * True when `card` represents a playlist or Mix rather than one video.
 * @example isCollectionCard(lockup) // true on a /feed/playlists tile
 */
export function isCollectionCard(card: Element): boolean {
  return card.querySelector(COLLECTION_MARKERS) !== null
}

// Card renderers that can hold a collection tile (channel/feed grids, home).
const CARD_HOSTS = 'yt-lockup-view-model, ytd-rich-item-renderer, ytd-grid-playlist-renderer'

function listIdOf(href: string): string | null {
  return new URLSearchParams(href.split('?')[1] ?? '').get('list')
}

/**
 * True when YouTube's hover preview is playing a playlist/Mix tile's first
 * video: the preview's `list=` belongs to a collection card on the page. The
 * preview pill would otherwise save that one video in the list's place.
 * @example isPreviewOfCollection(document.querySelector('ytd-video-preview')!, document)
 */
export function isPreviewOfCollection(preview: Element, root: ParentNode): boolean {
  const href = preview.querySelector('a[href*="watch?v="]')?.getAttribute('href') ?? ''
  const listId = listIdOf(href)
  if (!listId) return false
  return [...root.querySelectorAll(CARD_HOSTS)].some(
    (card) => !preview.contains(card) && isCollectionCard(card) && linksToList(card, listId),
  )
}

function linksToList(card: Element, listId: string): boolean {
  return [...card.querySelectorAll('a[href*="list="]')].some(
    (link) => listIdOf(link.getAttribute('href') ?? '') === listId,
  )
}
