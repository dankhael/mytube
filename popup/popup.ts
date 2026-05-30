// Popup entry — fetches the store and renders the browsable category list,
// the settings modal (gear button) and the optional click sound.

import { Message, MessageResponse, Settings } from '../src/types'
import { renderPopup } from './render'
import { watchUrl } from './groups'
import { createConfigModal } from './config'
import { createClickPlayer, playClick } from './sound'

function send(message: Message): Promise<MessageResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (res: MessageResponse) => resolve(res))
  })
}

function openHome(): void {
  chrome.tabs.create({ url: 'chrome://newtab' })
}

async function init(): Promise<void> {
  const res = await send({ action: 'GET_ALL' })
  if (!res.ok || !('data' in res) || !res.data) return
  const data = res.data

  // Mutable so the config toggle updates what the sound check reads live.
  let settings: Settings = data.settings
  const player = createClickPlayer()
  const click = () => playClick(settings, player)

  const total = document.getElementById('total')!
  total.textContent = `${data.videos.filter((v) => !v.watched).length} não assistidos`

  document.getElementById('open')!.addEventListener('click', openHome)

  document.getElementById('config')!.addEventListener('click', () => {
    click()
    const modal = createConfigModal(settings, {
      onToggleSound: (enabled) => {
        settings = { ...settings, soundEffects: enabled }
        void send({ action: 'UPDATE_SETTINGS', settings: { soundEffects: enabled } })
      },
    })
    document.body.appendChild(modal)
  })

  renderPopup(document.getElementById('list')!, data, {
    openVideo: (id) => chrome.tabs.create({ url: watchUrl(id) }),
    openHome,
    onInteract: click,
  })
}

void init()
