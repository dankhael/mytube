// Which rendered elements are rows of the open playlist, and what they hold.
// Split out of playlist-import.ts so row discovery is unit-testable against
// DOM fragments (content/playlist-rows.test.ts); the live page itself stays
// Manual acceptance (IMPORT-DOM-4, IMPORT-DOM-7).

import { CardData, extractCard } from './extract-card'

// Both playlist layouts: the classic `ytd-playlist-video-renderer`, and the
// `yt-lockup-view-model` rows YouTube switched to in 2026 — which broke import
// on every playlist ("No videos found") while only the old tag was queried.
const ROW_SELECTOR = 'ytd-playlist-video-renderer, yt-lockup-view-model'

function listIdOf(href: string): string | null {
  const query = href.split('?')[1] ?? ''
  return new URLSearchParams(query).get('list')
}

// Lockups are YouTube's generic card, also used for recommendations that can
// share the page; a real row always links into *this* list.
function linksIntoList(row: Element, listId: string): boolean {
  return [...row.querySelectorAll('a[href*="list="]')].some(
    (link) => listIdOf(link.getAttribute('href') ?? '') === listId,
  )
}

/**
 * Rendered rows of the playlist `listId` under `root`, in page order.
 * @example findPlaylistRows(document, 'WL').length // rows of Watch Later loaded so far
 */
export function findPlaylistRows(root: ParentNode, listId: string): HTMLElement[] {
  const rows = [...root.querySelectorAll<HTMLElement>(ROW_SELECTOR)]
  return rows.filter((row) => linksIntoList(row, listId))
}

function readRow(row: HTMLElement): CardData | null {
  try {
    return extractCard(row)
  } catch {
    return null // skip one broken row, keep the rest
  }
}

/**
 * Cards for every readable row of `listId`, de-duped by id (a playlist can
 * list the same video twice; storage keys on id anyway).
 * @example scrapePlaylistRows(document, 'PLabc…').map((card) => card.id)
 */
export function scrapePlaylistRows(root: ParentNode, listId: string): CardData[] {
  const seen = new Set<string>()
  const cards: CardData[] = []
  for (const row of findPlaylistRows(root, listId)) {
    const card = readRow(row)
    if (!card || seen.has(card.id)) continue
    seen.add(card.id)
    cards.push(card)
  }
  return cards
}
