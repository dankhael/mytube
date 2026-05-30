// Popup — shows per-category counts and a shortcut to the curated home.

import { Message, MessageResponse, StorageData } from '../src/types'

function send(message: Message): Promise<MessageResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (res: MessageResponse) => resolve(res))
  })
}

function render(data: StorageData) {
  const list = document.getElementById('list')!
  const total = document.getElementById('total')!
  const unwatched = data.videos.filter((v) => !v.watched).length
  total.textContent = `${unwatched} não assistidos`

  const counts = new Map<string, number>()
  for (const cat of data.categories) counts.set(cat.name, 0)
  for (const v of data.videos) counts.set(v.category, (counts.get(v.category) ?? 0) + 1)

  if (data.videos.length === 0) {
    list.innerHTML =
      '<li class="empty">Nenhum vídeo salvo ainda.<br>Clique em “+ Salvar” nos vídeos do YouTube.</li>'
    return
  }

  list.innerHTML = ''
  for (const cat of data.categories) {
    const li = document.createElement('li')
    li.innerHTML = `<span>${cat.emoji}</span><span>${escapeHtml(cat.name)}</span><span class="count">${
      counts.get(cat.name) ?? 0
    }</span>`
    list.appendChild(li)
  }
}

function escapeHtml(s: string): string {
  const div = document.createElement('div')
  div.textContent = s
  return div.innerHTML
}

document.getElementById('open')!.addEventListener('click', () => {
  chrome.tabs.create({ url: 'chrome://newtab' })
})

async function init() {
  const res = await send({ action: 'GET_ALL' })
  if (res.ok && 'data' in res && res.data) render(res.data)
}

void init()
