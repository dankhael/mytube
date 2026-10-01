// Playlist / Mix cards ("collections") share the yt-lockup-view-model renderer
// with single videos, and their thumbnail link is `watch?v=<first>&list=…` — so
// extractCard read the FIRST video's id under the PLAYLIST's title, and "+ Salvar"
// on /feed/playlists saved one mislabeled video instead of the playlist. Saving a
// whole list from a card is impossible (its rows aren't rendered here; import
// lives on the playlist page), so collection cards get no save button at all.

// Only the stacked collection thumbnail marks a card as a list: YouTube draws it
// for playlists and Mixes alike. Link shapes are NOT reliable — plain music-video
// search results also link `watch?v=…&list=RD…&start_radio=1`, and a link-based
// marker hid the button on every one of them (regression caught in 1.0.1 testing).
const COLLECTION_THUMBNAILS = [
  'yt-collection-thumbnail-view-model', // lockup tiles (playlists, Mixes)
  'yt-collections-stack', // the stack layers inside it
  'ytd-playlist-thumbnail', // classic grid playlist renderer
].join(',')

/**
 * True when `card` represents a playlist or Mix rather than one video.
 * @example isCollectionCard(lockup) // true on a /feed/playlists tile
 */
export function isCollectionCard(card: Element): boolean {
  return card.querySelector(COLLECTION_THUMBNAILS) !== null
}

export interface Box {
  left: number
  top: number
  width: number
  height: number
}

type BoxOf = (el: Element) => Box

const boundingBox: BoxOf = (el) => el.getBoundingClientRect()

function containsPoint(box: Box, x: number, y: number): boolean {
  return x >= box.left && x <= box.left + box.width && y >= box.top && y <= box.top + box.height
}

/**
 * True when YouTube's hover preview sits over a playlist/Mix tile — it then plays
 * the list's first video, and a pill would save that one video in the list's
 * place. Decided by geometry, not by `list=`: a Mix and the plain video it was
 * seeded from share the same `list=RD…`, so matching ids hid the pill on the
 * video too. Only collection thumbnails are measured (a handful per page), so
 * this stays cheap on every scan. `boxOf` is injectable for jsdom tests.
 * @example isPreviewOfCollection(document.querySelector('ytd-video-preview')!, document)
 */
export function isPreviewOfCollection(
  preview: Element,
  root: ParentNode,
  boxOf: BoxOf = boundingBox,
): boolean {
  const box = boxOf(preview)
  if (box.width === 0 || box.height === 0) return false
  const x = box.left + box.width / 2
  const y = box.top + box.height / 2
  return [...root.querySelectorAll(COLLECTION_THUMBNAILS)].some(
    (thumb) => !preview.contains(thumb) && containsPoint(boxOf(thumb), x, y),
  )
}
