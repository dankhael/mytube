// Card extraction from YouTube's DOM. Pulled out of content.ts so both the
// per-card injector and the playlist importer (content/playlist-import.ts) read
// a card the same way, without a circular import between them. Pure DOM reads —
// verified by Manual acceptance (the DOM shifts often), not unit tests.

import { MISSING_CHANNEL, MISSING_TITLE } from '../src/metadata'
import { isYoutubeVideoId } from '../src/validate-message'

export interface CardData {
  id: string
  title: string
  thumbnail: string
  channelName: string
  channelThumbnail?: string // channel avatar URL when the DOM exposes one
}

// Best-effort read of the channel avatar <img> within a card/owner scope. Covers
// classic renderers (#avatar img / yt-img-shadow) and the newer lockup/owner
// view-models. Returns undefined when absent — the worker host-gates the value
// anyway (channel-avatar), and the home card falls back to the initial letter.
export function extractAvatar(scope: ParentNode): string | undefined {
  const img =
    scope.querySelector<HTMLImageElement>('#avatar img') ||
    scope.querySelector<HTMLImageElement>('yt-img-shadow img') ||
    scope.querySelector<HTMLImageElement>('.yt-spec-avatar-shape img') ||
    scope.querySelector<HTMLImageElement>('yt-decorated-avatar-view-model img')
  const src = img?.currentSrc || img?.src || ''
  return src.startsWith('https://') ? src : undefined
}

// Reads a video card. Works for feed/search/sidebar renderers AND playlist rows
// (ytd-playlist-video-renderer) — they share #thumbnail / #video-title /
// ytd-channel-name, and the href carries ?v=<id> even with &list=…&index=….
export function extractCard(card: HTMLElement): CardData | null {
  const link =
    card.querySelector<HTMLAnchorElement>('a#thumbnail') ||
    card.querySelector<HTMLAnchorElement>('a[href*="watch?v="]')
  const href = link?.getAttribute('href') || ''
  const match = href.match(/[?&]v=([\w-]{11})/)
  if (!match) return null
  const id = match[1]

  // Cover classic renderers (#video-title) and the newer lockup view-models.
  const titleEl = card.querySelector<HTMLElement>(
    '#video-title, #video-title-link, .yt-lockup-metadata-view-model-wiz__title, h3 a',
  )
  const title =
    titleEl?.textContent?.trim() ||
    titleEl?.getAttribute('title')?.trim() ||
    link?.getAttribute('title')?.trim() ||
    link?.getAttribute('aria-label')?.trim() ||
    MISSING_TITLE

  const channelEl =
    card.querySelector<HTMLElement>('#channel-name a') ||
    card.querySelector<HTMLElement>('ytd-channel-name a') ||
    card.querySelector<HTMLElement>('#channel-name #text') ||
    card.querySelector<HTMLElement>('.yt-content-metadata-view-model-wiz__metadata-text') ||
    // New lockup renderer (watch suggestions) uses camelCase classes; the first
    // metadata-text span is the channel (followed by views, then date).
    card.querySelector<HTMLElement>('.ytContentMetadataViewModelMetadataText')
  const channelName = channelEl?.textContent?.trim() || MISSING_CHANNEL

  // mqdefault is stable regardless of YouTube's lazy-loaded <img> state.
  const thumbnail = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`

  return { id, title, thumbnail, channelName, channelThumbnail: extractAvatar(card) }
}

// Reads the video currently open on a /watch page (the one in the player).
export function extractWatchPage(): CardData | null {
  if (!location.pathname.startsWith('/watch')) return null
  const id = new URLSearchParams(location.search).get('v')
  // Same 11-char shape check the card path's href regex applies (finding S2) —
  // a garbage ?v= never becomes a save pill or a message payload.
  if (!id || !isYoutubeVideoId(id)) return null

  const titleEl = document.querySelector<HTMLElement>(
    'ytd-watch-metadata #title h1, h1.ytd-watch-metadata, #title h1.style-scope.ytd-watch-metadata',
  )
  const title =
    titleEl?.textContent?.trim() || document.title.replace(/ - YouTube$/, '').trim() || MISSING_TITLE

  const channelEl = document.querySelector<HTMLElement>(
    'ytd-watch-metadata ytd-channel-name a, #owner #channel-name a, #upload-info #channel-name a',
  )
  const channelName = channelEl?.textContent?.trim() || MISSING_CHANNEL

  const thumbnail = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`
  // Scope to the owner block so we read the channel's avatar, not some other
  // avatar elsewhere on the watch page (comments, suggestions).
  const ownerScope =
    document.querySelector<HTMLElement>('ytd-video-owner-renderer, #owner') ?? document
  return { id, title, thumbnail, channelName, channelThumbnail: extractAvatar(ownerScope) }
}
