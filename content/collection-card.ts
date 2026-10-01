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
