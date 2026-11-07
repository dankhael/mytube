// @vitest-environment jsdom
// Lifecycle regressions of the content script. content.ts boots on import, so each
// test mounts YouTube-shaped DOM, installs a fake extension and imports a fresh
// copy. Real YouTube behavior stays in the specs' Manual acceptance.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { t } from '../src/i18n'
import { DEFAULT_SETTINGS, Message, StorageData, Video } from '../src/types'

const SAVED = 'aaaaaaaaaaa'
const UNSAVED = 'bbbbbbbbbbb'

type StorageListener = (changes: Record<string, unknown>, area: string) => void

function savedVideo(id: string): Video {
  return { id, title: id, thumbnail: 't', channelName: 'C', category: 'A', addedAt: 1, watched: false }
}

// The slice of chrome.* the content script touches. Replies are built when the
// message is sent, so a held reply carries the library as it was at that moment.
class FakeExtensionHost {
  library: StorageData = {
    categories: [{ name: 'A', emoji: '📁' }],
    videos: [savedVideo(SAVED)],
    settings: { ...DEFAULT_SETTINGS },
  }
  orphaned = false
  failReads = false
  holdReplies = false
  private held: (() => void)[] = []
  private listeners = new Set<StorageListener>()

  install(): void {
    vi.stubGlobal('chrome', {
      runtime: { sendMessage: this.sendMessage, lastError: undefined },
      storage: { onChanged: { addListener: this.listen, removeListener: this.unlisten } },
    })
  }

  private listen = (listener: StorageListener) => void this.listeners.add(listener)
  private unlisten = (listener: StorageListener) => void this.listeners.delete(listener)

  private sendMessage = (message: Message, reply: (response: unknown) => void): void => {
    if (this.orphaned) throw new Error('Extension context invalidated.')
    const response = this.answer(message)
    if (this.holdReplies) this.held.push(() => reply(response))
    else queueMicrotask(() => reply(response))
  }

  private answer(message: Message): unknown {
    if (this.failReads) return { ok: false, error: 'Incomplete sync chunk' }
    if (message.action === 'GET_ALL') return { ok: true, data: structuredClone(this.library) }
    if (message.action !== 'GET_SAVED_IDS') return { ok: true }
    return { ok: true, ids: this.library.videos.map(({ id, category }) => ({ id, category })) }
  }

  emitStorageChange(): void {
    this.listeners.forEach((listener) => listener({ 'mytube:meta': {} }, 'sync'))
  }

  releaseNewestFirst(): void {
    this.holdReplies = false
    this.held.splice(0).reverse().forEach((deliver) => deliver())
  }
}

function mountCard(videoId: string | null): HTMLElement {
  const card = document.createElement('ytd-rich-item-renderer')
  const link = document.createElement('a')
  link.id = 'thumbnail'
  if (videoId) link.setAttribute('href', `/watch?v=${videoId}`)
  link.appendChild(document.createElement('ytd-thumbnail'))
  card.appendChild(link)
  document.body.appendChild(card)
  return card
}

function mountPreview(videoId: string): HTMLElement {
  const preview = document.createElement('ytd-video-preview')
  const link = document.createElement('a')
  link.setAttribute('href', `/watch?v=${videoId}`)
  const controls = document.createElement('div')
  controls.className = 'ytInlinePlayerControlsControlsContainer'
  preview.append(link, controls)
  document.body.appendChild(preview)
  return preview
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 40))
const pill = () => document.querySelector<HTMLElement>('.mytube-btn')
const isSaved = () => pill()?.classList.contains('mytube-saved')
const touchPage = () => document.body.appendChild(document.createElement('span'))

let host: FakeExtensionHost

async function bootContent(): Promise<void> {
  host.install()
  vi.resetModules()
  await import('./content')
  await settle()
}

beforeEach(() => {
  host = new FakeExtensionHost()
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
})

// Orphaning detaches this copy of the script, so it can't react to the next test.
afterEach(async () => {
  host.orphaned = true
  host.emitStorageChange()
  await settle()
  document.body.replaceChildren()
  document.documentElement.classList.remove('mytube-has-preview')
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('teardown is final (M4)', () => {
  it('regression: orphaned during init, the script injects nothing and stays down', async () => {
    mountCard(SAVED)
    host.orphaned = true
    await bootContent()
    expect(pill()).toBeNull()

    mountCard(UNSAVED)
    await settle()
    expect(pill()).toBeNull()
  })

  it('regression: teardown detaches the scroll tracking of an open menu', async () => {
    mountCard(SAVED)
    await bootContent()
    pill()!.click()
    await settle()
    expect(document.querySelector('.mytube-dropdown')).not.toBeNull()
    const removed = vi.spyOn(window, 'removeEventListener')

    host.orphaned = true
    host.emitStorageChange()
    await settle()

    expect(removed.mock.calls.map(([type]) => type)).toContain('scroll')
  })

  it('regression: teardown stops listening to storage', async () => {
    mountCard(SAVED)
    await bootContent()
    host.orphaned = true
    host.emitStorageChange()
    await settle()

    const send = vi.spyOn(chrome.runtime, 'sendMessage')
    host.emitStorageChange()
    expect(send).not.toHaveBeenCalled()
  })
})

describe('saved state on the pills', () => {
  it('regression: a late reply cannot restore an older saved state', async () => {
    mountCard(SAVED)
    await bootContent()
    expect(isSaved()).toBe(true)

    host.holdReplies = true
    host.emitStorageChange() // still saved in this reply
    host.library.videos = []
    host.emitStorageChange() // deleted in this one
    host.releaseNewestFirst()
    await settle()

    expect(isSaved()).toBe(false)
  })

  it('regression: pills relabel in the new language whichever reply lands first', async () => {
    mountCard(UNSAVED)
    await bootContent()

    host.library.settings.language = 'pt-BR'
    host.holdReplies = true
    host.emitStorageChange()
    host.releaseNewestFirst()
    await settle()

    expect(pill()!.querySelector('.mytube-label')!.textContent).toBe(t('content.save', 'pt-BR'))
  })

  it('regression: a failed first read is retried when the tab is shown again', async () => {
    mountCard(SAVED)
    host.failReads = true
    await bootContent()
    expect(isSaved()).toBe(false)

    host.failReads = false
    document.dispatchEvent(new Event('visibilitychange'))
    await settle()

    expect(isSaved()).toBe(true)
  })
})

describe('card pills', () => {
  it('regression: a card with no link yet gets its pill once the link appears', async () => {
    const card = mountCard(null)
    await bootContent()
    expect(pill()).toBeNull()

    card.querySelector('a')!.setAttribute('href', `/watch?v=${SAVED}`)
    touchPage()
    await settle()

    expect(isSaved()).toBe(true)
  })

  it('regression: a recycled card shows the saved state of its new video', async () => {
    const card = mountCard(SAVED)
    await bootContent()
    expect(isSaved()).toBe(true)

    card.querySelector('a')!.setAttribute('href', `/watch?v=${UNSAVED}`)
    touchPage()
    await settle()

    expect(isSaved()).toBe(false)
  })
})

describe('hover preview', () => {
  // Hiding the preview changes an attribute, which the page observer doesn't see.
  it('regression: the flag clears when the preview hides with no other page change', async () => {
    const preview = mountPreview(UNSAVED)
    await bootContent()
    const root = document.documentElement.classList
    expect(root.contains('mytube-has-preview')).toBe(true)

    preview.style.display = 'none'
    await settle()

    expect(root.contains('mytube-has-preview')).toBe(false)
  })
})
