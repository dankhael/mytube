// Playlist import (spec playlist-import / IMPORT). On a YouTube playlist page
// (Watch Later, Liked, or any created list) we inject a button that scrapes the
// rendered rows and sends one IMPORT_VIDEOS batch. The shared chrome (message
// transport, category picker, toast, language) is injected so this module owns
// only the playlist-specific DOM and never imports content.ts (no cycle).
// All behavior here is Manual acceptance (IMPORT-DOM-*) — YouTube's DOM shifts.

import { Message, MessageResponse } from '../src/types'
import { Language, t } from '../src/i18n'
import { CardData, extractCard } from './extract-card'

export interface PlaylistImportDeps {
  sendMessage: (message: Message) => Promise<MessageResponse>
  openCategoryPicker: (anchor: HTMLElement, onPick: (category: string) => void) => void
  showToast: (text: string) => void
  getLang: () => Language
}

const PLAYLIST_ROW = 'ytd-playlist-video-renderer'
const IMPORT_BTN_ID = 'mytube-import-btn'

// Bound on the auto-scroll loop so a runaway playlist can't spin forever; each
// pass waits for YouTube to render the next chunk (IMPORT-DOM-5, best-effort).
const MAX_SCROLL_PASSES = 40
const SCROLL_SETTLE_MS = 600

function isPlaylistPage(): boolean {
  return location.pathname === '/playlist' && new URLSearchParams(location.search).has('list')
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Best-effort: scroll to the bottom repeatedly until the row count stops growing
// (or we hit the cap), so lazy-loaded rows render before we scrape them. A very
// large playlist may still stop short — documented limitation (IMPORT-DOM-5).
async function loadAllRows(): Promise<void> {
  let previous = -1
  for (let pass = 0; pass < MAX_SCROLL_PASSES; pass++) {
    const count = document.querySelectorAll(PLAYLIST_ROW).length
    if (count === previous) break
    previous = count
    window.scrollTo(0, document.documentElement.scrollHeight)
    await delay(SCROLL_SETTLE_MS)
  }
  window.scrollTo(0, 0)
}

// Read every rendered playlist row, de-duped by id (a playlist can list the same
// video twice; storage keys on id anyway).
function scrapeRows(): CardData[] {
  const seen = new Set<string>()
  const cards: CardData[] = []
  document.querySelectorAll<HTMLElement>(PLAYLIST_ROW).forEach((row) => {
    let card: CardData | null = null
    try {
      card = extractCard(row)
    } catch {
      card = null // skip one broken row, keep the rest
    }
    if (card && !seen.has(card.id)) {
      seen.add(card.id)
      cards.push(card)
    }
  })
  return cards
}

async function runImport(deps: PlaylistImportDeps, btn: HTMLButtonElement, category: string) {
  const lang = deps.getLang()
  const original = btn.textContent
  btn.disabled = true
  btn.textContent = t('content.import.loading', lang)
  try {
    await loadAllRows()
    const cards = scrapeRows()
    if (cards.length === 0) {
      deps.showToast(t('content.import.empty', lang))
      return
    }
    const videos = cards.map((c) => ({
      id: c.id,
      title: c.title,
      thumbnail: c.thumbnail,
      channelName: c.channelName,
      channelThumbnail: c.channelThumbnail,
    }))
    const res = await deps.sendMessage({ action: 'IMPORT_VIDEOS', videos, category })
    deps.showToast(
      res.ok
        ? t('content.import.done', lang, { count: videos.length })
        : t('content.import.failed', lang),
    )
  } finally {
    btn.disabled = false
    btn.textContent = original
  }
}

// Action-bar containers across YouTube's two playlist-header layouts: the old
// ytd-playlist-header-renderer (Watch Later / Liked) and the newer
// yt-page-header / flexible-actions view-model (user-created playlists).
const HEADER_HOST_SELECTORS = [
  '.metadata-action-bar', // old header (Watch Later / Liked)
  'ytd-playlist-header-renderer #actions', // old header, actions slot
  'yt-flexible-actions-view-model', // new page-header actions row
  '.yt-flexible-actions-view-model-wiz', // new page-header actions row (class form)
]

// A node only counts as a host if it's actually rendered. The new layout keeps
// matching-but-hidden action containers in the DOM; appending into one yields an
// invisible button AND suppresses the floating fallback — which is exactly why
// import showed only on Watch Later. Require a real box, else return null so the
// caller floats the pill (IMPORT-DOM-1).
function isRendered(el: HTMLElement): boolean {
  return el.offsetWidth > 0 && el.offsetHeight > 0
}

function findHeaderHost(): HTMLElement | null {
  for (const selector of HEADER_HOST_SELECTORS) {
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      if (isRendered(el)) return el
    }
  }
  return null
}

function buildImportButton(deps: PlaylistImportDeps): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.id = IMPORT_BTN_ID
  btn.className = 'mytube-import-btn'
  btn.textContent = t('content.import.button', deps.getLang())
  btn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    deps.openCategoryPicker(btn, (category) => void runImport(deps, btn, category))
  })
  return btn
}

// Idempotent per scan: add the button on a playlist page, drop it elsewhere.
export function scanPlaylistPage(deps: PlaylistImportDeps): void {
  const existing = document.getElementById(IMPORT_BTN_ID)
  if (!isPlaylistPage()) {
    existing?.remove()
    return
  }
  if (existing) return
  const btn = buildImportButton(deps)
  const host = findHeaderHost()
  if (host) {
    host.appendChild(btn)
  } else {
    btn.classList.add('mytube-import-btn--floating')
    document.documentElement.appendChild(btn)
  }
}
