// Derived "smart" sections for the home — pure functions over the saved videos,
// so they're Node-testable and re-derive on every render. No storage of their own.

import { Video } from '../src/types'

export const SMART_LIMIT = 12 // pool cap per section (preview is smaller)
export const DUST_AGE_DAYS = 21 // a video is "gathering dust" after this long unwatched
const DAY_MS = 24 * 60 * 60 * 1000

// Newest first, watched excluded, capped by count (no age filter).
export function selectRecentlyAdded(videos: Video[], limit = SMART_LIMIT): Video[] {
  return videos
    .filter((v) => !v.watched)
    .sort((a, b) => b.addedAt - a.addedAt)
    .slice(0, limit)
}

// Oldest first: unwatched videos saved more than DUST_AGE_DAYS ago. Empty when
// nothing has been sitting around long enough.
export function selectGatheringDust(
  videos: Video[],
  now: number = Date.now(),
  limit = SMART_LIMIT,
): Video[] {
  const cutoff = now - DUST_AGE_DAYS * DAY_MS
  return videos
    .filter((v) => !v.watched && v.addedAt <= cutoff)
    .sort((a, b) => a.addedAt - b.addedAt)
    .slice(0, limit)
}
