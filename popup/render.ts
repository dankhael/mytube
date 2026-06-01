// Popup DOM renderer. No chrome calls here — actions come in as callbacks so the
// whole thing is jsdom-testable. Categories start collapsed and expand lazily;
// several can be open at once.

import { StorageData, Video } from '../src/types'
import { CategoryGroup, VIDEO_CAP, groupVideosByCategory } from './groups'
import { categorySvg } from './category-icon'

export interface PopupCallbacks {
  openVideo: (id: string) => void
  openHome: () => void
  // Fired on any click interaction (expand a category, click a video) — used to
  // play the optional click sound. Optional so tests can omit it.
  onInteract?: () => void
}

export function renderPopup(root: HTMLElement, data: StorageData, cb: PopupCallbacks): void {
  root.replaceChildren()

  if (data.videos.length === 0) {
    const empty = el('li', 'empty')
    empty.innerHTML = 'Nenhum vídeo salvo ainda.<br>Clique em “+ Salvar” nos vídeos do YouTube.'
    root.appendChild(empty)
    return
  }

  for (const group of groupVideosByCategory(data)) {
    root.appendChild(categorySection(group, cb))
  }
}

function categorySection(group: CategoryGroup, cb: PopupCallbacks): HTMLElement {
  const { category, videos } = group
  const section = el('li', 'cat')

  const row = el('button', 'cat-row')
  // Monochrome icon in a tile (not the stored emoji) — see PUI-2.
  const ico = el('span', 'cat-ico')
  ico.innerHTML = categorySvg(category.name)
  row.appendChild(ico)
  row.appendChild(textSpan('cat-name', category.name))
  row.appendChild(textSpan('cat-count', String(videos.length)))
  row.appendChild(textSpan('chev', '▸'))

  const panel = el('div', 'cat-videos')

  let built = false
  row.addEventListener('click', () => {
    cb.onInteract?.()
    const open = section.classList.toggle('open')
    row.querySelector('.chev')!.textContent = open ? '▾' : '▸'
    if (open && !built) {
      buildPanel(panel, videos, cb)
      built = true
    }
  })

  section.append(row, panel)
  return section
}

function buildPanel(panel: HTMLElement, videos: Video[], cb: PopupCallbacks): void {
  if (videos.length === 0) {
    panel.appendChild(textDiv('cat-empty', 'Nenhum vídeo aqui.'))
    return
  }

  for (const video of videos.slice(0, VIDEO_CAP)) {
    panel.appendChild(videoItem(video, cb))
  }

  if (videos.length > VIDEO_CAP) {
    const more = el('button', 'more-link')
    more.textContent = `Ver todos na home (${videos.length})`
    more.addEventListener('click', cb.openHome)
    panel.appendChild(more)
  }
}

function videoItem(video: Video, cb: PopupCallbacks): HTMLElement {
  const item = el('button', 'vid')

  const thumb = document.createElement('img')
  thumb.className = 'vid-thumb'
  thumb.src = video.thumbnail
  thumb.alt = ''
  thumb.loading = 'lazy'

  const meta = el('div', 'vid-meta')
  meta.appendChild(textDiv('vid-title', video.title))
  meta.appendChild(textDiv('vid-channel', video.channelName))

  item.append(thumb, meta)
  item.addEventListener('click', () => {
    cb.onInteract?.()
    cb.openVideo(video.id)
  })
  return item
}

// --- tiny DOM helpers ---
function el(tag: string, className: string): HTMLElement {
  const node = document.createElement(tag)
  node.className = className
  return node
}

function textSpan(className: string, text: string): HTMLElement {
  const span = el('span', className)
  span.textContent = text
  return span
}

function textDiv(className: string, text: string): HTMLElement {
  const div = el('div', className)
  div.textContent = text
  return div
}
