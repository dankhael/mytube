// @vitest-environment jsdom
// Popup boot specs that had no test bound to their ID (spec audit): the popup
// applies the stored accent (THEME-7) and theme preset (CRT-8) on init, and the
// header gear opens the settings modal (CFG-1). popup.ts boots on import, so
// each test mounts the real popup.html shell, installs a fake extension API and
// imports a fresh copy of the module.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, Settings, StorageData } from '../src/types'

const here = dirname(fileURLToPath(import.meta.url))
const shell = readFileSync(join(here, 'popup.html'), 'utf8')

// The slice of chrome.* the popup touches, answering GET_ALL from a snapshot.
class FakePopupChrome {
  constructor(private readonly settings: Partial<Settings>) {}

  install() {
    const data: StorageData = {
      categories: [{ name: 'Tutorials', emoji: '🎓', icon: 'book' }],
      // One video: an empty library renders the empty hint and no rows (POPUP-4).
      videos: [
        {
          id: 'aqz-KE-bpKQ',
          title: 'Big Buck Bunny',
          thumbnail: 'https://i.ytimg.com/vi/aqz-KE-bpKQ/mqdefault.jpg',
          channelName: 'Blender',
          category: 'Tutorials',
          addedAt: 1,
          watched: false,
        },
      ],
      settings: { ...DEFAULT_SETTINGS, ...this.settings },
    }
    vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(((
      _msg: never,
      cb: (r: unknown) => void,
    ) => cb({ ok: true, data })) as never)
    const extra = chrome as unknown as Record<string, unknown>
    extra.tabs = { create: vi.fn() }
    extra.commands = {
      getAll: vi.fn().mockResolvedValue([{ name: 'open_home', shortcut: 'Ctrl+Shift+Y' }]),
    }
  }
}

async function bootPopup(settings: Partial<Settings>) {
  new FakePopupChrome(settings).install()
  vi.resetModules()
  await import('./popup')
  await vi.waitFor(() =>
    expect(document.querySelectorAll('#list .cat-row').length).toBeGreaterThan(0),
  )
}

beforeEach(() => {
  document.body.innerHTML = shell.slice(shell.indexOf('<body>') + 6, shell.indexOf('</body>'))
})

afterEach(() => {
  vi.restoreAllMocks()
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.style.removeProperty('--accent-h')
})

describe('popup boot', () => {
  it('THEME-7: a stored mint accent sets --accent-h: 168 on the popup root at init', async () => {
    await bootPopup({ accent: 'mint' })
    expect(document.documentElement.style.getPropertyValue('--accent-h')).toBe('168')
  })

  it('CRT-8: a stored smpte theme sets data-theme="smpte" on the popup root at init', async () => {
    await bootPopup({ theme: 'smpte' })
    expect(document.documentElement.getAttribute('data-theme')).toBe('smpte')
  })

  it('CFG-1: clicking the header gear opens the settings modal over the popup', async () => {
    await bootPopup({})
    expect(document.querySelector('.cfg-modal')).toBeNull()
    document.getElementById('config')!.click()
    await vi.waitFor(() => expect(document.querySelector('.cfg-modal')).not.toBeNull())
  })
})
