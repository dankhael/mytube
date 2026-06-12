// Popup entry — fetches the store and renders the browsable category list,
// the settings modal (gear button) and the optional click sound.

import './popup.css'
import { Message, MessageResponse, Settings } from '../src/types'
import { renderPopup } from './render'
import { unwatchedLabel, watchUrl } from './groups'
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

// Renders "<b>13</b> unwatched" via DOM APIs instead of innerHTML — the count
// is computed from stored data, and privileged pages never parse computed
// strings as HTML (finding S3). Markup is identical to the old innerHTML write.
function renderUnwatchedTotal(target: HTMLElement, label: string): void {
  const count = label.match(/^\d+/)?.[0]
  if (!count) {
    target.textContent = label
    return
  }
  const bold = document.createElement('b')
  bold.textContent = count
  target.replaceChildren(bold, document.createTextNode(label.slice(count.length)))
}

async function init(): Promise<void> {
  const res = await send({ action: 'GET_ALL' })
  if (!res.ok || !('data' in res) || !res.data) return
  const data = res.data

  // Mutable so the config toggle updates what the sound check reads live.
  let settings: Settings = data.settings
  const player = createClickPlayer()
  const click = () => playClick(settings, player)

  // "13 unwatched" with the count styled distinctly (accent <b> via popup.css).
  renderUnwatchedTotal(document.getElementById('total')!, unwatchedLabel(data))

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
