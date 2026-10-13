// Popup entry — fetches the store and renders the browsable category list,
// the settings modal (gear button) and the optional click sound.

import { sendMessage as send } from '../src/messages'
import { browserPlatform } from '../src/browser-platform'
import './popup.css'
import { Settings } from '../src/types'
import { renderPopup } from './render'
import { unwatchedLabel, watchUrl } from './groups'
import { createConfigModal, type ConfigModal } from './config'
import { showPopupError } from './status'
import { createClickPlayer, playClick } from './sound'
import { applyAccent } from '../src/theme'
import { applyThemePreset } from '../src/theme-preset'
import { openHomeTab, openShortcutSettings, openDonatePage, openFeedbackForm, homeShortcut } from '../src/home-page'
import { localizePopupChrome } from './chrome-labels'

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
  if (!res.ok || !('data' in res) || !res.data) {
    showPopupError(() => location.reload())
    return
  }
  let data = res.data

  // Mutable so the config toggle updates what the sound check reads live.
  let settings: Settings = data.settings
  let persistedSettings = settings
  let modal: ConfigModal | undefined
  const player = createClickPlayer()
  const click = () => playClick(settings, player)

  // Recolor the popup from the persisted accent before first paint (THEME-7),
  // and re-skin it from the persisted theme preset (CRT-8).
  applyAccent(document.documentElement, settings.accent)
  applyThemePreset(document.documentElement, settings.theme)

  // Paints every language-dependent surface. Re-run when the user switches
  // language so the popup re-localizes immediately, with no reopen (Decisions §2).
  const paint = () => {
    data = { ...data, settings }
    // "13 unwatched" with the count styled distinctly (accent <b> via popup.css).
    renderUnwatchedTotal(document.getElementById('total')!, unwatchedLabel(data, settings.language))
    localizePopupChrome(document, settings.language)
    renderPopup(document.getElementById('list')!, data, {
      openVideo: (id) => browserPlatform().tabs.create({ url: watchUrl(id) }),
      openHome,
      onInteract: click,
    })
  }

  async function persistSettings(patch: Partial<Settings>): Promise<void> {
    // Prevent a second optimistic edit from racing a failed first one.
    modal?.setAttribute('inert', '')
    const result = await send({ action: 'UPDATE_SETTINGS', settings: patch })
    if (result.ok && 'data' in result && result.data) {
      persistedSettings = result.data.settings
      modal?.removeAttribute('inert')
      return
    }
    // Restore the last acknowledged values, never leave failed previews looking
    // saved. Closing via the modal's lifecycle also removes its key listener.
    settings = persistedSettings
    applyAccent(document.documentElement, settings.accent)
    applyThemePreset(document.documentElement, settings.theme)
    paint()
    modal?.dismiss()
    showPopupError(() => location.reload(), settings.language, 'save')
  }

  document.getElementById('open')!.addEventListener('click', openHome)

  document.getElementById('config')!.addEventListener('click', async () => {
    click()
    // Read the live shortcut binding so the row shows the user's current key
    // (Chrome owns it; '' when unset). Fetched on open so it reflects changes
    // made on the shortcuts page since the popup last opened.
    const shortcut = await homeShortcut().catch(() => '')
    modal = createConfigModal(
      settings,
      {
        onToggleSound: (enabled) => {
          settings = { ...settings, soundEffects: enabled }
          void persistSettings({ soundEffects: enabled })
        },
        onPickAccent: (accent) => {
          settings = { ...settings, accent }
          applyAccent(document.documentElement, accent) // live recolor, no reopen
          void persistSettings({ accent })
        },
        onPickTheme: (theme) => {
          settings = { ...settings, theme }
          applyThemePreset(document.documentElement, theme) // live re-skin (CRT-6/8)
          void persistSettings({ theme })
        },
        onPickLanguage: (language) => {
          settings = { ...settings, language }
          paint() // re-localize the list + total live (Decisions §2)
          void persistSettings({ language })
        },
        // Chrome forbids extensions from binding shortcuts; deep-link the user to
        // its shortcut page. Opening it closes the popup, so no live refresh.
        onEditShortcut: () => openShortcutSettings(),
        onToggleStartup: (enabled) => {
          settings = { ...settings, openHomeOnStartup: enabled }
          void persistSettings({ openHomeOnStartup: enabled })
        },
        onToggleHomeReminder: (enabled) => {
          settings = { ...settings, remindOnYoutubeHome: enabled }
          void persistSettings({ remindOnYoutubeHome: enabled })
        },
        // Opens Ko-fi in a new tab; closes the popup, so no live refresh needed.
        onDonate: () => openDonatePage(),
        // Opens the feedback form in a new tab; closes the popup like Ko-fi.
        onFeedback: () => openFeedbackForm(),
      },
      shortcut,
    )
    document.body.appendChild(modal)
  })

  paint()
}

void init()
