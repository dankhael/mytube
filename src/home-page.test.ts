import { describe, expect, it, vi } from 'vitest'
import {
  HOME_PAGE_PATH,
  OPEN_HOME_COMMAND,
  SHORTCUTS_PAGE,
  homeShortcut,
  openHomeTab,
  openShortcutSettings,
} from './home-page'

// Regression: the home used to be a new-tab override and was opened with
// chrome.tabs.create({ url: 'chrome://newtab' }). That hijacked every new tab
// and triggered Chrome's consent prompt. openHomeTab must instead open the
// packaged extension page resolved through runtime.getURL — never chrome://newtab.
describe('home-page — openHomeTab', () => {
  it('opens the packaged home page URL, not chrome://newtab', () => {
    const create = vi.fn()
    const getUrl = vi.fn((path: string) => `chrome-extension://abc/${path}`)

    openHomeTab({ create }, getUrl)

    expect(getUrl).toHaveBeenCalledWith(HOME_PAGE_PATH)
    expect(create).toHaveBeenCalledWith({ url: 'chrome-extension://abc/newtab/index.html' })
    expect(create).not.toHaveBeenCalledWith({ url: 'chrome://newtab' })
  })
})

describe('home-page — open-home shortcut', () => {
  it('openShortcutSettings opens Chrome’s shortcut page', () => {
    const create = vi.fn()
    openShortcutSettings({ create })
    expect(create).toHaveBeenCalledWith({ url: SHORTCUTS_PAGE })
    expect(SHORTCUTS_PAGE).toBe('chrome://extensions/shortcuts')
  })

  it('homeShortcut returns the binding for the open-home command', async () => {
    const getAll = vi.fn().mockResolvedValue([
      { name: 'open_home', shortcut: 'Ctrl+Shift+Y' },
      { name: 'other', shortcut: 'Ctrl+K' },
    ])
    await expect(homeShortcut({ getAll })).resolves.toBe('Ctrl+Shift+Y')
    expect(getAll).toHaveBeenCalledOnce()
  })

  it('homeShortcut returns "" when the command is unbound or absent', async () => {
    const unbound = vi.fn().mockResolvedValue([{ name: OPEN_HOME_COMMAND, shortcut: '' }])
    await expect(homeShortcut({ getAll: unbound })).resolves.toBe('')

    const absent = vi.fn().mockResolvedValue([{ name: 'other', shortcut: 'Ctrl+K' }])
    await expect(homeShortcut({ getAll: absent })).resolves.toBe('')
  })
})
