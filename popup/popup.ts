// Popup entry — fetches the store and renders the browsable category list,
// the settings modal (gear button) and the optional click sound.

import './popup.css'
import { Message, MessageResponse, Settings } from '../src/types'
import { renderPopup } from './render'
import { unwatchedLabel, watchUrl } from './groups'
import { createConfigModal } from './config'
import { createClickPlayer, playClick } from './sound'
import { applyAccent } from '../src/theme'
import { openHomeTab, openShortcutSettings, homeShortcut } from '../src/home-page'

function send(message: Message): Promise<MessageResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (res: MessageResponse) => resolve(res))
  })
}

// The home is no longer a new-tab override, so open its packaged URL rather than
// chrome://newtab (which would now land on the browser default). See home-page.ts.
function openHome(): void {
  openHomeTab()
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
  let data = res.data

  // Mutable so the config toggle updates what the sound check reads live.
  let settings: Settings = data.settings
  const player = createClickPlayer()
  const click = () => playClick(settings, player)

  // Recolor the popup from the persisted accent before first paint (THEME-7).
  applyAccent(document.documentElement, settings.accent)

  // Paints every language-dependent surface. Re-run when the user switches
  // language so the popup re-localizes immediately, with no reopen (Decisions §2).
  const paint = () => {
    data = { ...data, settings }
    // "13 unwatched" with the count styled distinctly (accent <b> via popup.css).
    renderUnwatchedTotal(document.getElementById('total')!, unwatchedLabel(data, settings.language))
    renderPopup(document.getElementById('list')!, data, {
      openVideo: (id) => chrome.tabs.create({ url: watchUrl(id) }),
      openHome,
      onInteract: click,
    })
  }

  document.getElementById('open')!.addEventListener('click', openHome)

  document.getElementById('config')!.addEventListener('click', async () => {
    click()
    // Read the live shortcut binding so the row shows the user's current key
    // (Chrome owns it; '' when unset). Fetched on open so it reflects changes
    // made on the shortcuts page since the popup last opened.
    const shortcut = await homeShortcut()
    const modal = createConfigModal(
      settings,
      {
        onToggleSound: (enabled) => {
          settings = { ...settings, soundEffects: enabled }
          void send({ action: 'UPDATE_SETTINGS', settings: { soundEffects: enabled } })
        },
        onPickAccent: (accent) => {
          settings = { ...settings, accent }
          applyAccent(document.documentElement, accent) // live recolor, no reopen
          void send({ action: 'UPDATE_SETTINGS', settings: { accent } })
        },
        onPickLanguage: (language) => {
          settings = { ...settings, language }
          paint() // re-localize the list + total live (Decisions §2)
          void send({ action: 'UPDATE_SETTINGS', settings: { language } })
        },
        // Chrome forbids extensions from binding shortcuts; deep-link the user to
        // its shortcut page. Opening it closes the popup, so no live refresh.
        onEditShortcut: () => openShortcutSettings(),
      },
      shortcut,
    )
    document.body.appendChild(modal)
  })

  paint()
}

void init()
