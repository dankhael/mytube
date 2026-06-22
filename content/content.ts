// MyTube content script — injects a "+ Salvar" button on YouTube video cards.
// YouTube is an SPA, so we use a MutationObserver and guard every card with
// try/catch since the DOM structure shifts often.

import { Category, Message, MessageResponse, SavedIdInfo } from '../src/types'
import { isMyTubeKey } from '../src/storage-backend'
import { DEFAULT_LANGUAGE, Language, t } from '../src/i18n'
import { CardData, extractCard, extractWatchPage } from './extract-card'
import { scanPlaylistPage, PlaylistImportDeps } from './playlist-import'

// Active interface language, refreshed from the store on init and on change.
// The content script is plain DOM (no React context), so it threads `lang`
// through a module-level variable rather than the new-tab i18n context.
let lang: Language = DEFAULT_LANGUAGE

const CARD_SELECTORS = [
  'ytd-rich-item-renderer', // home
  'ytd-video-renderer', // search results
  'ytd-compact-video-renderer', // suggested sidebar (legacy)
  'yt-lockup-view-model', // watch suggestions (current lockup renderer)
]

const PROCESSED = 'data-mytube'

let savedIds: Map<string, string> = new Map() // videoId -> category

// Module-scope so teardown() (finding M4) can detach them after orphaning.
let observer: MutationObserver | null = null
let torndown = false

// When the extension is reloaded/updated, already-injected scripts are orphaned
// and chrome.runtime.sendMessage throws "Extension context invalidated"
// synchronously. Catch it, resolve { ok: false } (never an unhandled rejection),
// and tear ourselves down (finding M4). A runtime.lastError in the callback is a
// transient worker restart, not orphaning — map it without teardown.
function sendMessage(message: Message): Promise<MessageResponse> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (response: MessageResponse) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message || 'unknown' })
          return
        }
        resolve(response)
      })
    } catch (e) {
      teardown()
      resolve({ ok: false, error: e instanceof Error ? e.message : 'context invalidated' })
    }
  })
}

// Disconnect everything an orphaned script left attached so a dead extension
// stops reacting to the page (finding M4). Idempotent.
function teardown(): void {
  if (torndown) return
  torndown = true
  observer?.disconnect()
  observer = null
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  document
    .querySelectorAll('.mytube-wrapper, .mytube-dropdown, #mytube-toast, #mytube-import-btn')
    .forEach((node) => node.remove())
}

async function getCategories(): Promise<Category[]> {
  const res = await sendMessage({ action: 'GET_ALL' })
  if (res.ok && 'data' in res && res.data) return res.data.categories
  return []
}

interface LabelSpans {
  plus: HTMLElement
  label: HTMLElement
}

const SVG_NS = 'http://www.w3.org/2000/svg'

// A crisp 4-point sparkle (a real shape, not the ✨ emoji) pinned to the pill's
// top-right corner as a decorative "extra" accent. Built via createElementNS
// because YouTube enforces Trusted Types — innerHTML is off-limits here.
function createSparkle(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('class', 'mytube-spark')
  svg.setAttribute('aria-hidden', 'true')
  const path = document.createElementNS(SVG_NS, 'path')
  path.setAttribute(
    'd',
    'M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z',
  )
  svg.appendChild(path)
  return svg
}

// Builds (once) the structured label so the quirky glyphs survive every
// saved/unsaved flip and the cross-context re-sync — clobbering textContent
// would wipe the sparkle/plus the CSS animates (spec SALVAR-ROTATE).
function ensureLabelSpans(btn: HTMLElement): LabelSpans {
  const existingPlus = btn.querySelector<HTMLElement>('.mytube-plus')
  const existingLabel = btn.querySelector<HTMLElement>('.mytube-label')
  if (existingPlus && existingLabel) return { plus: existingPlus, label: existingLabel }

  btn.replaceChildren()
  const plus = document.createElement('span')
  plus.className = 'mytube-plus'
  const label = document.createElement('span')
  label.className = 'mytube-label'
  // Sparkle is absolutely positioned, so its DOM order doesn't affect the row.
  btn.append(createSparkle(), plus, label)
  return { plus, label }
}

function setSavedState(btn: HTMLElement, category: string | null) {
  const { plus, label } = ensureLabelSpans(btn)
  if (category) {
    btn.classList.add('mytube-saved')
    plus.textContent = '✓'
    label.textContent = t('content.saved', lang)
    btn.title = t('content.savedIn', lang, { category })
  } else {
    btn.classList.remove('mytube-saved')
    plus.textContent = '+'
    label.textContent = t('content.save', lang)
    btn.title = t('content.saveToMyTube', lang)
  }
}

// Transient, non-blocking confirmation toast. A single reused element is
// appended lazily; re-firing resets the auto-dismiss timer (spec SALVAR-TOAST).
let toastTimer: number | undefined
function showToast(text: string) {
  let toast = document.getElementById('mytube-toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.id = 'mytube-toast'
    toast.className = 'mytube-toast'
    document.documentElement.appendChild(toast)
  }
  toast.textContent = text
  requestAnimationFrame(() => toast?.classList.add('mytube-toast--show'))
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => toast?.classList.remove('mytube-toast--show'), 2500)
}

function closeAllDropdowns() {
  document.querySelectorAll('.mytube-dropdown').forEach((d) => d.remove())
}

// The dropdown is portaled to <html>, so anchor it to the button in viewport
// space. Right-aligned to the button's right edge, opening downward.
function positionDropdown(dropdown: HTMLElement, btn: HTMLElement) {
  const r = btn.getBoundingClientRect()
  dropdown.style.top = `${Math.round(r.bottom + 4)}px`
  dropdown.style.right = `${Math.round(window.innerWidth - r.right)}px`
}

// Headers the generic picker can show — both are catalog keys (i18n).
type PickerHeaderKey = 'content.saveTo' | 'content.import.pickCategory'

// Generic category chooser: builds the themed dropdown, lists categories plus an
// inline "+ Nova categoria", and hands the chosen name to `onPick`. Both the
// per-card save and the playlist import (content/playlist-import.ts) drive it —
// the action is injected, not baked in.
async function openCategoryPicker(
  btn: HTMLElement,
  onPick: (category: string) => void,
  headerKey: PickerHeaderKey = 'content.saveTo',
) {
  closeAllDropdowns()
  const categories = await getCategories()

  const dropdown = document.createElement('div')
  dropdown.className = 'mytube-dropdown'

  const header = document.createElement('div')
  header.className = 'mytube-dropdown-header'
  header.textContent = t(headerKey, lang)
  dropdown.appendChild(header)

  const choose = (category: string) => {
    closeAllDropdowns()
    onPick(category)
  }

  categories.forEach((cat) => {
    const item = document.createElement('button')
    item.className = 'mytube-dropdown-item'
    item.textContent = `${cat.emoji} ${cat.name}`
    item.addEventListener('click', (e) => {
      e.stopPropagation()
      choose(cat.name)
    })
    dropdown.appendChild(item)
  })

  // "Nova categoria" — expands into an inline input.
  const newItem = document.createElement('button')
  newItem.className = 'mytube-dropdown-item mytube-dropdown-new'
  newItem.textContent = t('content.newCategory', lang)
  newItem.addEventListener('click', (e) => {
    e.stopPropagation()
    const input = document.createElement('input')
    input.className = 'mytube-dropdown-input'
    input.placeholder = t('content.categoryNamePlaceholder', lang)
    input.addEventListener('click', (ev) => ev.stopPropagation())
    input.addEventListener('keydown', (ev) => {
      ev.stopPropagation()
      if (ev.key === 'Enter' && input.value.trim()) {
        choose(input.value.trim())
      } else if (ev.key === 'Escape') {
        closeAllDropdowns()
      }
    })
    newItem.replaceWith(input)
    input.focus()
  })
  dropdown.appendChild(newItem)

  // Portal to <html> with fixed positioning so the menu can't be clipped by
  // YouTube's overflow:hidden action-bar / menu-renderer ancestors (the watch
  // pill lives deep inside #top-level-buttons-computed).
  document.documentElement.appendChild(dropdown)
  positionDropdown(dropdown, btn)
}

// Saves a single card into the chosen category and reflects it on the button.
async function saveCardToCategory(btn: HTMLElement, card: CardData, category: string) {
  const res = await sendMessage({
    action: 'SAVE_VIDEO',
    video: {
      id: card.id,
      title: card.title,
      thumbnail: card.thumbnail,
      channelName: card.channelName,
      channelThumbnail: card.channelThumbnail,
    },
    category,
  })
  if (res.ok) {
    savedIds.set(card.id, category)
    setSavedState(btn, category)
    btn.classList.add('mytube-flash')
    setTimeout(() => btn.classList.remove('mytube-flash'), 2000)
    showToast(t('content.savedToast', lang, { category }))
  }
}

function openSaveDropdown(btn: HTMLElement, card: CardData) {
  void openCategoryPicker(btn, (category) => void saveCardToCategory(btn, card, category))
}

function injectButton(card: HTMLElement) {
  if (card.hasAttribute(PROCESSED)) return
  card.setAttribute(PROCESSED, '1')

  // Skip cards nested inside another card so one renderer wrapping another
  // (e.g. a lockup inside a grid item) can't double-inject.
  if (card.parentElement?.closest(CARD_SELECTORS.join(','))) return

  let data: CardData | null = null
  try {
    data = extractCard(card)
  } catch {
    data = null
  }
  if (!data) return

  const wrapper = document.createElement('div')
  wrapper.className = 'mytube-wrapper'

  const btn = document.createElement('button')
  btn.className = 'mytube-btn'
  // The mini variant is scoped to the watch sidebar by location, not renderer
  // tag, so home/search lockups keep the normal size (spec HOME-NOSHRINK / D3).
  if (card.closest('#secondary, ytd-watch-next-secondary-results-renderer')) {
    btn.classList.add('mytube-btn--mini')
  }
  setSavedState(btn, savedIds.get(data.id) ?? null)

  btn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    const isOpen = document.querySelector('.mytube-dropdown')
    if (isOpen) {
      closeAllDropdowns()
      return
    }
    // YouTube recycles renderer nodes (continuations, back/forward), so this
    // card may now show a different video than at inject time — re-extract and
    // save what's currently bound, falling back to inject-time data (M3).
    let current: CardData | null = null
    try {
      current = extractCard(card)
    } catch {
      current = null
    }
    openSaveDropdown(btn, current ?? data!)
  })

  wrapper.appendChild(btn)

  // Anchor over the thumbnail. Prefer <ytd-thumbnail> (YouTube already makes it
  // position:relative with a definite size) and only force positioning when the
  // host is truly static — forcing it on #thumbnail's auto-height <a> makes its
  // absolutely-positioned <img> balloon, which expanded search-result thumbnails.
  const thumbHost =
    card.querySelector<HTMLElement>('ytd-thumbnail') ||
    card.querySelector<HTMLElement>('yt-thumbnail-view-model') || // new lockup (watch suggestions)
    card.querySelector<HTMLElement>('#thumbnail') ||
    card
  if (getComputedStyle(thumbHost).position === 'static') {
    thumbHost.style.position = 'relative'
  }
  thumbHost.appendChild(wrapper)
}

// Copies a real native chip's box metrics onto our pill so it lines up exactly,
// whatever height/spacing YouTube's current layout uses (measured, not guessed).
function matchActionBarMetrics(wrapper: HTMLElement, btn: HTMLElement, row: HTMLElement) {
  const natives = Array.from(row.children).filter(
    (c): c is HTMLElement => c instanceof HTMLElement && !c.classList.contains('mytube-watch-wrapper'),
  )
  const ref = natives.find((n) => n.offsetHeight > 0)
  if (!ref) return
  btn.style.height = `${ref.offsetHeight}px` // border-box; matches native chip height
  // If the row spaces children with a flex gap, adding our own margin would
  // double it; otherwise mirror the native per-chip left margin.
  const rowGap = parseFloat(getComputedStyle(row).columnGap) || 0
  if (rowGap > 0) {
    wrapper.style.marginLeft = '0px'
    return
  }
  const spaced = natives.find((n) => parseFloat(getComputedStyle(n).marginLeft) > 0)
  wrapper.style.marginLeft = spaced ? getComputedStyle(spaced).marginLeft : '8px'
}

// Injects a "+ Salvar" pill into the action bar of the open video (/watch).
function injectWatchButton() {
  const data = extractWatchPage()
  // Prefer the native chip row (Like/Share/…) so we inherit its flex centering
  // and inter-button spacing instead of fighting the outer #actions wrapper;
  // fall back to the broader containers if YouTube's structure shifts.
  const buttonRow = document.querySelector<HTMLElement>('ytd-watch-metadata #top-level-buttons-computed')
  const actions =
    buttonRow ||
    document.querySelector<HTMLElement>('ytd-watch-metadata #actions-inner') ||
    document.querySelector<HTMLElement>('ytd-watch-metadata #actions')
  const existing = document.querySelector<HTMLElement>('.mytube-watch-wrapper')

  // Not on a watch page (or bar not ready): drop any stale button.
  if (!data || !actions) {
    existing?.remove()
    return
  }
  
  // Already injected for this video in the correct container.
  if (existing && existing.getAttribute('data-vid') === data.id && existing.parentElement === actions) {
    // Ensure our button stays at the end of the flex row if YouTube's SPA logic inserts new native buttons.
    if (actions.lastElementChild !== existing) {
      actions.appendChild(existing)
      const existingBtn = existing.querySelector<HTMLElement>('.mytube-btn')
      if (buttonRow && existingBtn) matchActionBarMetrics(existing, existingBtn, buttonRow)
    }
    return
  }
  
  existing?.remove()

  const wrapper = document.createElement('div')
  wrapper.className = 'mytube-wrapper mytube-watch-wrapper'
  wrapper.setAttribute('data-vid', data.id)

  const btn = document.createElement('button')
  btn.className = 'mytube-btn mytube-watch-btn'
  setSavedState(btn, savedIds.get(data.id) ?? null)

  btn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    const isOpen = document.querySelector('.mytube-dropdown')
    if (isOpen) closeAllDropdowns()
    else openSaveDropdown(btn, data)
  })

  wrapper.appendChild(btn)
  actions.appendChild(wrapper)
  if (buttonRow) matchActionBarMetrics(wrapper, btn, buttonRow)
}

// Shared chrome handed to the playlist importer so it owns only playlist DOM and
// never imports back into content.ts (no cycle). The picker opens with the
// import-specific header.
const playlistImportDeps: PlaylistImportDeps = {
  sendMessage,
  openCategoryPicker: (anchor, onPick) =>
    void openCategoryPicker(anchor, onPick, 'content.import.pickCategory'),
  showToast,
  getLang: () => lang,
}

function scan() {
  for (const selector of CARD_SELECTORS) {
    document.querySelectorAll<HTMLElement>(selector).forEach((card) => {
      try {
        injectButton(card)
      } catch {
        // ignore a single broken card
      }
    })
  }
  try {
    injectWatchButton()
  } catch {
    // ignore if the watch action bar isn't ready yet
  }
  try {
    scanPlaylistPage(playlistImportDeps)
  } catch {
    // ignore if the playlist header isn't ready yet
  }
}

function refreshSavedIds(ids: SavedIdInfo[]) {
  savedIds = new Map(ids.map((i) => [i.id, i.category]))
  // Re-sync any already-injected buttons.
  document.querySelectorAll<HTMLElement>('.mytube-btn').forEach((btn) => {
    const watchWrap = btn.closest<HTMLElement>('.mytube-watch-wrapper')
    if (watchWrap) {
      const vid = watchWrap.getAttribute('data-vid')
      if (vid) setSavedState(btn, savedIds.get(vid) ?? null)
      return
    }
    const wrapper = btn.closest('.mytube-wrapper')
    const card = wrapper?.closest(CARD_SELECTORS.join(',')) as HTMLElement | null
    if (!card) return
    const link = card.querySelector<HTMLAnchorElement>('a[href*="watch?v="]')
    const match = link?.getAttribute('href')?.match(/[?&]v=([\w-]{11})/)
    if (match) setSavedState(btn, savedIds.get(match[1]) ?? null)
  })
}

function injectStyles() {
  if (document.getElementById('mytube-styles')) return
  const style = document.createElement('style')
  style.id = 'mytube-styles'
  style.textContent = `
    /* Accent mirrored from styles/theme-tokens.css (the --accent-h: 290 knob).
       The content script can't @import that file into youtube.com, so these
       values are duplicated here — keep in sync if the theme knob changes. */
    :root {
      --mytube-accent: oklch(0.815 0.125 290);
      --mytube-accent-2: oklch(0.72 0.135 290);
      --mytube-accent-ink: oklch(0.205 0.045 290);
      --mytube-accent-line: oklch(0.815 0.125 290 / 0.32);
      --mytube-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .mytube-wrapper { position: absolute; top: 8px; right: 8px; z-index: 60; }
    .mytube-btn {
      position: relative; /* anchors the corner sparkle */
      box-sizing: border-box; /* so a measured native height maps to total height */
      display: inline-flex; align-items: center; gap: 6px;
      font-family: Roboto, system-ui, sans-serif;
      font-size: 12px; font-weight: 700; line-height: 1;
      color: var(--mytube-accent-ink); background: var(--mytube-accent);
      border: 1px solid rgba(0,0,0,.25); border-radius: 999px;
      padding: 6px 11px; cursor: pointer; opacity: 0; transition: opacity .15s, background .15s, transform .15s;
    }
    ytd-rich-item-renderer:hover .mytube-btn,
    ytd-video-renderer:hover .mytube-btn,
    ytd-compact-video-renderer:hover .mytube-btn,
    yt-lockup-view-model:hover .mytube-btn,
    .mytube-btn.mytube-saved, .mytube-dropdown ~ * .mytube-btn,
    .mytube-wrapper:hover .mytube-btn { opacity: 1; }
    /* Overlay buttons sit on thumbnails — add a shadow for legibility (spec
       HOME-LEGIBLE); the watch pill sits in a solid bar and stays unchanged. */
    .mytube-btn:not(.mytube-watch-btn) { box-shadow: 0 2px 8px rgba(0,0,0,.45); }
    .mytube-btn:hover { background: var(--mytube-accent-2); }
    .mytube-btn.mytube-saved {
      color: var(--mytube-accent); background: rgba(0,0,0,.62);
      border-color: var(--mytube-accent-line); opacity: 1;
    }
    .mytube-btn.mytube-flash { background: var(--mytube-accent-2); }

    /* Quirky glyphs: a 4-point sparkle pinned to the corner (shown only on the
       themed surfaces) and a "+" that spins on hover so the control reads as an
       "extra" you tack on (spec SALVAR-ROTATE). The sparkle is absolute so it
       never widens the pill or fights the action-bar row height. */
    .mytube-spark {
      position: absolute; top: -5px; right: -4px; width: 13px; height: 13px;
      display: block; fill: var(--mytube-accent); pointer-events: none;
      filter: drop-shadow(0 1px 1px rgba(0,0,0,.45));
      transition: transform .3s var(--mytube-bounce);
    }
    .mytube-plus { display: inline-block; font-weight: 800; transition: transform .3s var(--mytube-bounce); }
    /* Sparkle + rotate now apply to every themed button (home/search/sidebar/watch). */
    .mytube-btn:hover .mytube-spark { transform: rotate(90deg) scale(1.3); }
    .mytube-btn:hover .mytube-plus { transform: rotate(90deg) scale(1.18); }

    /* Themed, always-visible pill on the /watch action bar (spec SALVAR-THEME).
       align-self + matching height keep it centered with YouTube's own chips. */
    .mytube-watch-wrapper {
      /* This wrapper also carries .mytube-wrapper (top:8px; right:8px) for the
         thumbnail overlay case; reset those offsets here or the relative pill
         lands 8px down + 8px left of the native chips. */
      position: relative; top: auto; right: auto;
      display: inline-flex; align-items: center; align-self: center;
      margin-left: 8px; vertical-align: middle; /* margin is overridden by measured value */
    }
    .mytube-watch-btn {
      opacity: 1; height: 36px; padding: 0 16px; font-size: 14px; font-weight: 700;
      color: var(--mytube-accent-ink); background: var(--mytube-accent); border-color: transparent;
    }
    .mytube-watch-btn:hover { background: var(--mytube-accent-2); }
    .mytube-watch-btn.mytube-saved {
      color: var(--mytube-accent); background: rgba(0,0,0,.55);
      border: 1px solid var(--mytube-accent-line);
    }

    /* Mini Salvar on the dense "Up next" sidebar (spec SALVAR-MINI). */
    ytd-compact-video-renderer .mytube-wrapper,
    yt-lockup-view-model .mytube-wrapper { top: 4px; right: 4px; }
    .mytube-btn.mytube-btn--mini {
      padding: 3px 9px; font-size: 10px; gap: 4px; font-weight: 700;
      color: var(--mytube-accent-ink); background: var(--mytube-accent); border-color: transparent;
    }
    .mytube-btn.mytube-btn--mini:hover { background: var(--mytube-accent-2); }
    .mytube-btn.mytube-btn--mini.mytube-saved {
      color: var(--mytube-accent); background: rgba(0,0,0,.6);
      border: 1px solid var(--mytube-accent-line);
    }

    /* Transient confirmation toast — fixed and non-blocking (spec SALVAR-TOAST). */
    .mytube-toast {
      position: fixed; bottom: 24px; right: 24px; z-index: 2147483647; pointer-events: none;
      font-family: Roboto, system-ui, sans-serif; font-size: 14px; font-weight: 700;
      color: var(--mytube-accent-ink); background: var(--mytube-accent);
      padding: 12px 18px; border-radius: 999px; box-shadow: 0 10px 30px rgba(0,0,0,.5);
      opacity: 0; transform: translateY(14px);
      transition: opacity .2s, transform .25s var(--mytube-bounce);
    }
    .mytube-toast.mytube-toast--show { opacity: 1; transform: translateY(0); }
    .mytube-dropdown {
      /* Portaled to <html>; top/right are set inline from the button rect. */
      position: fixed; left: auto; min-width: 200px;
      background: #212121; border: 1px solid #3f3f3f; border-radius: 10px;
      padding: 6px; z-index: 2147483000; box-shadow: 0 8px 24px rgba(0,0,0,.5);
      font-family: Roboto, system-ui, sans-serif; max-height: 280px; overflow-y: auto;
    }
    .mytube-dropdown-header { color: #aaa; font-size: 11px; padding: 4px 8px; text-transform: uppercase; letter-spacing: .04em; }
    .mytube-dropdown-item {
      display: block; width: 100%; text-align: left; color: #f1f1f1; background: transparent;
      border: 0; border-radius: 6px; padding: 8px; font-size: 13px; cursor: pointer;
    }
    .mytube-dropdown-item:hover { background: #383838; }
    .mytube-dropdown-new { color: #3ea6ff; }
    .mytube-dropdown-input {
      width: 100%; box-sizing: border-box; background: #121212; color: #fff;
      border: 1px solid #3ea6ff; border-radius: 6px; padding: 8px; font-size: 13px; margin-top: 4px;
    }

    /* Playlist-import button (spec IMPORT-DOM-1). Themed accent pill; in the
       header it sits inline, the floating fallback pins to the bottom-right. */
    .mytube-import-btn {
      display: inline-flex; align-items: center; gap: 6px;
      font-family: Roboto, system-ui, sans-serif; font-size: 14px; font-weight: 700; line-height: 1;
      color: var(--mytube-accent-ink); background: var(--mytube-accent);
      border: 1px solid transparent; border-radius: 999px;
      padding: 10px 18px; margin: 8px; cursor: pointer; transition: background .15s, transform .15s;
    }
    .mytube-import-btn:hover { background: var(--mytube-accent-2); }
    .mytube-import-btn:disabled { opacity: .6; cursor: default; }
    .mytube-import-btn--floating {
      position: fixed; bottom: 24px; right: 24px; z-index: 2147483000; margin: 0;
      box-shadow: 0 10px 30px rgba(0,0,0,.5);
    }
  `
  document.documentElement.appendChild(style)
}

// Close dropdowns when clicking outside both the button (.mytube-wrapper) and
// the portaled menu (.mytube-dropdown, now a child of <html>, not the wrapper).
// Named (not inline) so teardown() can detach it after orphaning (M4).
function onDocumentClick(e: MouseEvent): void {
  const t = e.target as HTMLElement
  if (!t?.closest?.('.mytube-wrapper') && !t?.closest?.('.mytube-dropdown')) closeAllDropdowns()
}

// Catch up on cards added while the tab was hidden (M2): scheduleScan bails out
// while document.hidden, so re-scan once when the tab becomes visible again.
function onVisibilityChange(): void {
  if (!document.hidden) scan()
}

let scanScheduled = false
function scheduleScan() {
  // Don't burn scan/allocation work on a backgrounded tab nobody can see (M2);
  // requestAnimationFrame wouldn't fire while hidden anyway, which would wedge
  // scanScheduled=true. The visibilitychange catch-up covers what we skipped.
  if (scanScheduled || document.hidden) return
  scanScheduled = true
  requestAnimationFrame(() => {
    scanScheduled = false
    scan()
  })
}

// Pull the persisted interface language so the pill/menu render localized.
// Best-effort: a failed round-trip leaves the English default in place.
async function refreshLanguage() {
  const res = await sendMessage({ action: 'GET_ALL' })
  if (res.ok && 'data' in res && res.data) lang = res.data.settings.language
}

async function init() {
  injectStyles()
  await refreshLanguage()
  const res = await sendMessage({ action: 'GET_SAVED_IDS' })
  if (res.ok && 'ids' in res) refreshSavedIds(res.ids)

  scan()

  document.addEventListener('click', onDocumentClick)
  document.addEventListener('visibilitychange', onVisibilityChange)

  observer = new MutationObserver(() => scheduleScan())
  observer.observe(document.body, { childList: true, subtree: true })

  // Keep saved state fresh if the user edits things from the new tab page. The
  // snapshot is sharded across many mytube:* keys (finding R1), so re-fetch the
  // ids through the worker (which assembles the shards) on any of them changing.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !Object.keys(changes).some(isMyTubeKey)) return
    // Re-localize too: the language may have changed from the popup/new-tab.
    void refreshLanguage().then(() => scan())
    void sendMessage({ action: 'GET_SAVED_IDS' }).then((res) => {
      if (res.ok && 'ids' in res) refreshSavedIds(res.ids)
    })
  })
}

void init()
