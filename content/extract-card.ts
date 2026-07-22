// Card extraction from YouTube's DOM. Pulled out of content.ts so both the
// per-card injector and the playlist importer (content/playlist-import.ts) read
// a card the same way, without a circular import between them. Pure DOM reads —
// verified by Manual acceptance (the DOM shifts often), not unit tests.

import { MISSING_CHANNEL, MISSING_TITLE } from '../src/metadata'
import { isDurationLabel, isYoutubeVideoId } from '../src/validate-message'

export interface CardData {
  id: string
  title: string
  thumbnail: string
  channelName: string
  channelThumbnail?: string // channel avatar URL when the DOM exposes one
  duration?: string // clock label ("12:34") when the card shows a duration overlay
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

// First clock label ("12:34" / "1:02:03") among `nodes`. The isDurationLabel
// shape check is what filters the non-duration text that shares these slots
// ("4K", "New", "AO VIVO"/"LIVE") — we keep only a real clock.
function firstClockLabel(nodes: Iterable<Element>): string | undefined {
  for (const el of nodes) {
    const text = el.textContent?.trim() || ''
    if (isDurationLabel(text)) return text
  }
  return undefined
}

// The thumbnail sub-tree of a card. The duration overlay lives here, and it's
// the ONLY clock-shaped text in it — title/channel/metadata sit outside — which
// is what makes the class-agnostic scan below safe.
function thumbnailRegion(scope: ParentNode): Element | null {
  return scope.querySelector('ytd-thumbnail, yt-thumbnail-view-model, a#thumbnail, #thumbnail')
}

// First clock-shaped LEAF text under `root`. Leaf-only so we read the badge's own
// "12:34" node, never a wrapper that concatenates several labels.
function scanClockLabel(root: ParentNode): string | undefined {
  for (const el of root.querySelectorAll('*')) {
    if (el.children.length > 0) continue
    const text = el.textContent?.trim() || ''
    if (isDurationLabel(text)) return text
  }
  return undefined
}

// Reads a card's static duration overlay. Tries the known overlay/badge classes
// first, then falls back to scanning the thumbnail region for ANY clock-shaped
// text. YouTube renames these overlay classes often (class-only selectors missed
// the home-feed save twice), so the scan — scoped to the thumbnail, where the
// duration is the only clock label — is the version-independent backstop. Absent
// for Shorts/live/upcoming. Best-effort; the selectors are Manual acceptance.
export function extractDuration(scope: ParentNode): string | undefined {
  const known = firstClockLabel(
    scope.querySelectorAll(
      'ytd-thumbnail-overlay-time-status-renderer #text, ' +
        'ytd-thumbnail-overlay-time-status-renderer, ' +
        '.badge-shape-wiz__text, ' +
        '.yt-badge-shape__text',
    ),
  )
  if (known) return known
  const thumb = thumbnailRegion(scope)
  return thumb ? scanClockLabel(thumb) : undefined
}

// The playing player's total-time display. The hover preview and the /watch
// player have NO static thumbnail overlay, so this is the only in-DOM duration
// they expose. Callers prefer a real card overlay when one exists, because
// `.ytp-time-duration` reads "0:00" until the player learns the length.
function durationFromPlayer(scope: ParentNode): string | undefined {
  return firstClockLabel(scope.querySelectorAll('.ytp-time-duration'))
}

// While the hover preview is up, the card it covers is still in the main DOM
// with its own duration overlay. Find that card by video id and read it — the
// reliable source for a home-feed save, since the preview player's time may
// still be 0:00 at click time.
function durationFromSourceCard(id: string): string | undefined {
  for (const link of document.querySelectorAll<HTMLElement>(`a[href*="${id}"]`)) {
    const card =
      link.closest<HTMLElement>(
        'ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ' +
          'ytd-compact-video-renderer, ytd-rich-grid-media, yt-lockup-view-model',
      ) ?? link.parentElement
    const found = card ? extractDuration(card) : undefined
    if (found) return found
  }
  return undefined
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

  return {
    id,
    title,
    thumbnail,
    channelName,
    channelThumbnail: extractAvatar(card),
    duration: extractDuration(card),
  }
}

// Reads the video shown in YouTube's shared hover-preview overlay
// (`ytd-video-preview`). The preview is a single reused element YouTube positions
// over whichever card is being hovered; it lives in a separate, later-painting
// `ytd-app` branch (`ytd-video-preview-loader`) that covers our thumbnail pills no
// matter their z-index — so we ride the preview's own controls instead (see the
// SALVAR-PREVIEW criteria in salvar-home-and-suggestions). Its watch link is the
// reliable id source; title is best-effort (the overlay rarely exposes channel),
// and the worker backfills title/channel via oEmbed on save (metadata enrichment),
// so a `MISSING_*` placeholder here never blocks the save.
export function extractPreviewCard(preview: HTMLElement): CardData | null {
  const link = preview.querySelector<HTMLAnchorElement>('a[href*="watch?v="]')
  const href = link?.getAttribute('href') || ''
  const match = href.match(/[?&]v=([\w-]{11})/)
  if (!match) return null
  const id = match[1]

  const title =
    link?.getAttribute('aria-label')?.trim() || link?.getAttribute('title')?.trim() || MISSING_TITLE
  const thumbnail = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`
  return {
    id,
    title,
    thumbnail,
    channelName: MISSING_CHANNEL,
    channelThumbnail: extractAvatar(preview),
    // The preview has no static duration overlay: read the underlying card's
    // overlay first (reliable), then fall back to the preview player's time.
    duration: durationFromSourceCard(id) || durationFromPlayer(preview),
  }
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
  // The watch page has no thumbnail overlay; the player's total-time display is
  // the length. Scope to #movie_player so a hover-preview player elsewhere on
  // the page can't shadow it.
  const player = document.querySelector<HTMLElement>('#movie_player') ?? document
  return {
    id,
    title,
    thumbnail,
    channelName,
    channelThumbnail: extractAvatar(ownerScope),
    duration: durationFromPlayer(player),
  }
}
