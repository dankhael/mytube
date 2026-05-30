// Popup entry — fetches the store and renders the browsable category list.
// All DOM/behavior lives in render.ts; this only wires chrome actions in.

import { Message, MessageResponse } from '../src/types'
import { renderPopup } from './render'
import { watchUrl } from './groups'

function send(message: Message): Promise<MessageResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (res: MessageResponse) => resolve(res))
  })
}

function openHome(): void {
  chrome.tabs.create({ url: 'chrome://newtab' })
}

document.getElementById('open')!.addEventListener('click', openHome)

async function init(): Promise<void> {
  const res = await send({ action: 'GET_ALL' })
  if (!res.ok || !('data' in res) || !res.data) return

  const data = res.data
  const total = document.getElementById('total')!
  const unwatched = data.videos.filter((v) => !v.watched).length
  total.textContent = `${unwatched} não assistidos`

  renderPopup(document.getElementById('list')!, data, {
    openVideo: (id) => chrome.tabs.create({ url: watchUrl(id) }),
    openHome,
  })
}

void init()
