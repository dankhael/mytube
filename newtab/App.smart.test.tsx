// @vitest-environment jsdom
// Home specs for the smart sections and their localized copy that had no test
// bound to their ID (spec audit): SMART-3, SMART-4, SMART-7, SMART-8, I18N-11.
// Uses a stateful fake service worker so a mutation (MARK_WATCHED) round-trips
// and the sections have to re-derive from the new snapshot.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { DEFAULT_SETTINGS, Settings, StorageData, Video } from '../src/types'

const DAY = 24 * 60 * 60 * 1000

function videoAt(id: string, title: string, ageDays: number, watched = false): Video {
  return {
    id,
    title,
    thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    channelName: 'Canal',
    category: 'Tutorials',
    addedAt: Date.now() - ageDays * DAY,
    watched,
  }
}

// Answers the home's messages from an in-memory snapshot, like the real worker:
// GET_ALL returns it, MARK_WATCHED updates it and returns the new snapshot.
class FakeServiceWorker {
  data: StorageData

  constructor(videos: Video[], settings: Partial<Settings> = {}) {
    this.data = {
      categories: [{ name: 'Tutorials', emoji: '🎓', icon: 'book' }],
      videos,
      settings: { ...DEFAULT_SETTINGS, ...settings },
    }
  }

  install() {
    vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(((
      msg: never,
      cb: (r: unknown) => void,
    ) => cb(this.handle(msg))) as never)
  }

  private handle(msg: { action: string; id?: string; watched?: boolean }) {
    if (msg.action === 'MARK_WATCHED') {
      const videos = this.data.videos.map((v) =>
        v.id === msg.id ? { ...v, watched: !!msg.watched } : v,
      )
      this.data = { ...this.data, videos }
    }
    return { ok: true, data: this.data }
  }
}

// The <section> whose heading reads `title` (smart sections and categories alike).
function sectionTitled(title: string): HTMLElement {
  return screen.getByRole('heading', { name: title }).closest('section') as HTMLElement
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('home-smart-sections.spec (card UI, cap, re-derive)', () => {
  it('SMART-3: smart-section cards keep the card actions but have no drag handle or category menu', async () => {
    new FakeServiceWorker([videoAt('rec11111111', 'Fresh video', 1)]).install()
    render(<App />)
    await screen.findByText('Recently added')
    const recent = sectionTitled('Recently added')

    expect(within(recent).getByText('Fresh video')).toBeTruthy()
    expect(recent.querySelectorAll('.vact').length).toBeGreaterThan(0) // watched / move / more
    expect(recent.querySelector('.drag')).toBeNull()
    // The category section of the same video does carry the drag handle.
    expect(sectionTitled('Tutorials').querySelector('.drag')).not.toBeNull()
  })

  it('SMART-4: a section over the preview cap shows 4 cards and an expander that reveals the rest', async () => {
    const videos = Array.from({ length: 6 }, (_, i) =>
      videoAt(`rec${i}aaaaaaa`.slice(0, 11), `Video ${i}`, i + 1),
    )
    new FakeServiceWorker(videos).install()
    render(<App />)
    await screen.findByText('Recently added')
    const recent = sectionTitled('Recently added')

    expect(recent.querySelectorAll('.vcard')).toHaveLength(4)
    await userEvent.click(within(recent).getByRole('button', { name: 'See all (6)' }))
    expect(recent.querySelectorAll('.vcard')).toHaveLength(6)
  })

  it('SMART-7: marking a dusty video watched drops it from "Gathering dust" without a reload', async () => {
    new FakeServiceWorker([videoAt('old11111111', 'Dusty video', 40)]).install()
    render(<App />)
    await screen.findByText('Gathering dust')
    const dust = sectionTitled('Gathering dust')

    await userEvent.click(within(dust).getByTitle('Mark as watched'))
    await waitFor(() => expect(screen.queryByText('Gathering dust')).toBeNull())
  })

  it('SMART-8: a qualifying video shows in the smart section and in its category, stored once', async () => {
    const worker = new FakeServiceWorker([videoAt('rec11111111', 'Both places', 1)])
    worker.install()
    render(<App />)
    await screen.findByText('Recently added')

    expect(within(sectionTitled('Recently added')).getByText('Both places')).toBeTruthy()
    expect(within(sectionTitled('Tutorials')).getByText('Both places')).toBeTruthy()
    expect(worker.data.videos).toHaveLength(1)
  })
})

describe('i18n-language.spec (home copy)', () => {
  it('I18N-11: the smart-section titles come from the catalog for the active language', async () => {
    new FakeServiceWorker([videoAt('rec11111111', 'A', 1), videoAt('old11111111', 'B', 40)], {
      language: 'pt-BR',
    }).install()
    render(<App />)

    expect(await screen.findByText('Recentemente adicionados')).toBeTruthy()
    expect(screen.getByText('Pegando poeira')).toBeTruthy()
    expect(screen.queryByText('Recently added')).toBeNull()
  })
})

describe('localized-default-categories.spec (home)', () => {
  it('DEFCAT-4: in pt-BR the Uncategorized bucket shows as "Sem categoria" in its section, chip and Move dialog', async () => {
    const worker = new FakeServiceWorker(
      [{ ...videoAt('unc11111111', 'Loose video', 1), category: 'Uncategorized' }],
      {
        language: 'pt-BR',
      },
    )
    worker.data.categories = [{ name: 'Uncategorized', emoji: '📁', icon: 'inbox' }]
    worker.install()
    render(<App />)

    await screen.findByRole('heading', { name: 'Sem categoria' })
    const section = sectionTitled('Sem categoria')
    expect(document.querySelector('.cat-chips')?.textContent).toContain('Sem categoria')

    await userEvent.click(within(section).getAllByTitle('Mover…')[0])
    const heading = await screen.findByRole('heading', { name: /mover vídeo para/i })
    expect(heading.closest('.fixed')?.textContent).toContain('Sem categoria')
    expect(screen.queryByText('Uncategorized')).toBeNull()
  })
})
