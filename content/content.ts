// MyTube content script — injects a "+ Salvar" button on YouTube video cards.
// YouTube is an SPA, so we use a MutationObserver and guard every card with
// try/catch since the DOM structure shifts often.

import { Category, Message, MessageResponse, SavedIdInfo } from '../src/types'

const CARD_SELECTORS = [
  'ytd-rich-item-renderer', // home
  'ytd-video-renderer', // search results
  'ytd-compact-video-renderer', // suggested sidebar
]

const PROCESSED = 'data-mytube'

let savedIds: Map<string, string> = new Map() // videoId -> category

interface CardData {
  id: string
  title: string
  thumbnail: string
  channelName: string
}

function extractCard(card: HTMLElement): CardData | null {
  const link =
    card.querySelector<HTMLAnchorElement>('a#thumbnail') ||
    card.querySelector<HTMLAnchorElement>('a[href*="watch?v="]')
  const href = link?.getAttribute('href') || ''
  const match = href.match(/[?&]v=([\w-]{11})/)
  if (!match) return null
  const id = match[1]

  const titleEl = card.querySelector<HTMLElement>('#video-title')
  const title =
    titleEl?.getAttribute('title')?.trim() || titleEl?.textContent?.trim() || 'Sem título'

  const channelEl =
    card.querySelector<HTMLElement>('#channel-name a') ||
    card.querySelector<HTMLElement>('ytd-channel-name a') ||
    card.querySelector<HTMLElement>('#channel-name #text')
  const channelName = channelEl?.textContent?.trim() || 'Canal desconhecido'

  // mqdefault is stable regardless of YouTube's lazy-loaded <img> state.
  const thumbnail = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`

  return { id, title, thumbnail, channelName }
}

// Reads the video currently open on a /watch page (the one in the player).
function extractWatchPage(): CardData | null {
  if (!location.pathname.startsWith('/watch')) return null
  const id = new URLSearchParams(location.search).get('v')
  if (!id) return null

  const titleEl = document.querySelector<HTMLElement>(
    'ytd-watch-metadata #title h1, h1.ytd-watch-metadata, #title h1.style-scope.ytd-watch-metadata',
  )
  const title =
    titleEl?.textContent?.trim() || document.title.replace(/ - YouTube$/, '').trim() || 'Sem título'

  const channelEl = document.querySelector<HTMLElement>(
    'ytd-watch-metadata ytd-channel-name a, #owner #channel-name a, #upload-info #channel-name a',
  )
  const channelName = channelEl?.textContent?.trim() || 'Canal desconhecido'

  const thumbnail = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`
  return { id, title, thumbnail, channelName }
}

function sendMessage(message: Message): Promise<MessageResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: MessageResponse) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message || 'unknown' })
        return
      }
      resolve(response)
    })
  })
}

async function getCategories(): Promise<Category[]> {
  const res = await sendMessage({ action: 'GET_ALL' })
  if (res.ok && 'data' in res && res.data) return res.data.categories
  return []
}

function setSavedState(btn: HTMLElement, category: string | null) {
  if (category) {
    btn.textContent = '✓ Salvo'
    btn.classList.add('mytube-saved')
    btn.title = `Salvo em: ${category}`
  } else {
    btn.textContent = '+ Salvar'
    btn.classList.remove('mytube-saved')
    btn.title = 'Salvar no MyTube'
  }
}

function closeAllDropdowns() {
  document.querySelectorAll('.mytube-dropdown').forEach((d) => d.remove())
}

async function openDropdown(btn: HTMLElement, card: CardData) {
  closeAllDropdowns()
  const categories = await getCategories()

  const dropdown = document.createElement('div')
  dropdown.className = 'mytube-dropdown'

  const header = document.createElement('div')
  header.className = 'mytube-dropdown-header'
  header.textContent = 'Salvar em…'
  dropdown.appendChild(header)

  const saveTo = async (category: string) => {
    const res = await sendMessage({
      action: 'SAVE_VIDEO',
      video: { id: card.id, title: card.title, thumbnail: card.thumbnail, channelName: card.channelName },
      category,
    })
    closeAllDropdowns()
    if (res.ok) {
      savedIds.set(card.id, category)
      setSavedState(btn, category)
      btn.textContent = '✓ Salvo'
      btn.classList.add('mytube-flash')
      setTimeout(() => btn.classList.remove('mytube-flash'), 2000)
    }
  }

  categories.forEach((cat) => {
    const item = document.createElement('button')
    item.className = 'mytube-dropdown-item'
    item.textContent = `${cat.emoji} ${cat.name}`
    item.addEventListener('click', (e) => {
      e.stopPropagation()
      void saveTo(cat.name)
    })
    dropdown.appendChild(item)
  })

  // "Nova categoria" — expands into an inline input.
  const newItem = document.createElement('button')
  newItem.className = 'mytube-dropdown-item mytube-dropdown-new'
  newItem.textContent = '+ Nova categoria'
  newItem.addEventListener('click', (e) => {
    e.stopPropagation()
    const input = document.createElement('input')
    input.className = 'mytube-dropdown-input'
    input.placeholder = 'Nome da categoria…'
    input.addEventListener('click', (ev) => ev.stopPropagation())
    input.addEventListener('keydown', (ev) => {
      ev.stopPropagation()
      if (ev.key === 'Enter' && input.value.trim()) {
        void saveTo(input.value.trim())
      } else if (ev.key === 'Escape') {
        closeAllDropdowns()
      }
    })
    newItem.replaceWith(input)
    input.focus()
  })
  dropdown.appendChild(newItem)

  btn.parentElement?.appendChild(dropdown)
}

function injectButton(card: HTMLElement) {
  if (card.hasAttribute(PROCESSED)) return
  card.setAttribute(PROCESSED, '1')

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
  setSavedState(btn, savedIds.get(data.id) ?? null)

  btn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    const isOpen = btn.parentElement?.querySelector('.mytube-dropdown')
    if (isOpen) {
      closeAllDropdowns()
    } else {
      void openDropdown(btn, data!)
    }
  })

  wrapper.appendChild(btn)

  // Anchor to the thumbnail container so the button floats over the image.
  const thumbHost =
    card.querySelector<HTMLElement>('#thumbnail') ||
    card.querySelector<HTMLElement>('ytd-thumbnail') ||
    card
  thumbHost.style.position = thumbHost.style.position || 'relative'
  thumbHost.appendChild(wrapper)
}

// Injects a "+ Salvar" pill into the action bar of the open video (/watch).
function injectWatchButton() {
  const data = extractWatchPage()
  const actions = document.querySelector<HTMLElement>('ytd-watch-metadata #actions')
  const existing = document.querySelector<HTMLElement>('.mytube-watch-wrapper')

  // Not on a watch page (or bar not ready): drop any stale button.
  if (!data || !actions) {
    existing?.remove()
    return
  }
  // Already injected for this video — nothing to do (avoids observer loops).
  if (existing && existing.getAttribute('data-vid') === data.id) return
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
    const isOpen = wrapper.querySelector('.mytube-dropdown')
    if (isOpen) closeAllDropdowns()
    else void openDropdown(btn, data)
  })

  wrapper.appendChild(btn)
  actions.appendChild(wrapper)
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
    .mytube-wrapper { position: absolute; top: 8px; right: 8px; z-index: 60; }
    .mytube-btn {
      font-family: Roboto, system-ui, sans-serif;
      font-size: 12px; font-weight: 600; line-height: 1;
      color: #fff; background: rgba(0,0,0,.85);
      border: 1px solid rgba(255,255,255,.2); border-radius: 999px;
      padding: 6px 10px; cursor: pointer; opacity: 0; transition: opacity .15s, background .15s;
    }
    ytd-rich-item-renderer:hover .mytube-btn,
    ytd-video-renderer:hover .mytube-btn,
    ytd-compact-video-renderer:hover .mytube-btn,
    .mytube-btn.mytube-saved, .mytube-dropdown ~ * .mytube-btn,
    .mytube-wrapper:hover .mytube-btn { opacity: 1; }
    .mytube-btn:hover { background: #ff0000; }
    .mytube-btn.mytube-saved { background: rgba(0,128,0,.9); opacity: 1; }
    .mytube-btn.mytube-flash { background: #2ecc71; }
    /* Inline pill on the /watch action bar (always visible, chip-sized). */
    .mytube-watch-wrapper { position: relative; display: inline-flex; align-items: center; margin-left: 8px; vertical-align: middle; }
    .mytube-watch-btn {
      opacity: 1; height: 36px; padding: 0 14px; font-size: 14px;
      background: #272727; border-color: transparent;
    }
    .mytube-watch-btn:hover { background: #3f3f3f; }
    .mytube-watch-btn.mytube-saved { background: rgba(0,128,0,.9); }
    .mytube-dropdown {
      position: absolute; top: calc(100% + 4px); right: 0; min-width: 200px;
      background: #212121; border: 1px solid #3f3f3f; border-radius: 10px;
      padding: 6px; z-index: 70; box-shadow: 0 8px 24px rgba(0,0,0,.5);
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
  `
  document.documentElement.appendChild(style)
}

// Close dropdowns when clicking elsewhere.
document.addEventListener('click', (e) => {
  if (!(e.target as HTMLElement)?.closest?.('.mytube-wrapper')) closeAllDropdowns()
})

let scanScheduled = false
function scheduleScan() {
  if (scanScheduled) return
  scanScheduled = true
  requestAnimationFrame(() => {
    scanScheduled = false
    scan()
  })
}

async function init() {
  injectStyles()
  const res = await sendMessage({ action: 'GET_SAVED_IDS' })
  if (res.ok && 'ids' in res) refreshSavedIds(res.ids)

  scan()

  const observer = new MutationObserver(() => scheduleScan())
  observer.observe(document.body, { childList: true, subtree: true })

  // Keep saved state fresh if the user edits things from the new tab page.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.mytube) {
      const videos = changes.mytube.newValue?.videos ?? []
      refreshSavedIds(videos.map((v: { id: string; category: string }) => ({ id: v.id, category: v.category })))
    }
  })
}

void init()
