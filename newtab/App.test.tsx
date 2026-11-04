// @vitest-environment jsdom
// Component specs for the curated home. Each test names the acceptance-criterion
// ID it proves (see specs/newtab-ui.spec.md).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { DEFAULT_SETTINGS, StorageData, UNCATEGORIZED, Video } from '../src/types'

const DAY = 24 * 60 * 60 * 1000

function video(id: string, category: string, title: string, watched = false): Video {
  return videoAt(id, category, title, Date.now() - DAY, watched)
}

function videoAt(id: string, category: string, title: string, addedAt: number, watched = false): Video {
  return {
    id,
    title,
    thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    channelName: 'Canal',
    category,
    addedAt,
    watched,
  }
}

// Script the service-worker reply for GET_ALL (and any other action) with `data`.
function scriptStore(data: Omit<StorageData, 'settings'>) {
  const full: StorageData = { ...data, settings: { ...DEFAULT_SETTINGS } }
  vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(
    ((_msg: unknown, cb: (r: unknown) => void) => cb({ ok: true, data: full })) as never,
  )
}

// GET_ALL succeeds with `data`; every mutation answers `mutationReply` (ROB-10/11).
function scriptStoreWithMutationReply(data: Omit<StorageData, 'settings'>, mutationReply: unknown) {
  const full: StorageData = { ...data, settings: { ...DEFAULT_SETTINGS } }
  vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(
    ((msg: { action: string }, cb: (r: unknown) => void) =>
      cb(msg.action === 'GET_ALL' ? { ok: true, data: full } : mutationReply)) as never,
  )
}

// Only the home's own structured logs — React act()/error noise must not count.
function mytubeErrorLogs(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls
    .map((args: unknown[]) => String(args[0]))
    .filter((line: string) => line.includes('mytube.newtab'))
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('newtab-ui.spec', () => {
  it('UI-1: an empty store renders the welcome screen', async () => {
    scriptStore({ categories: [{ name: 'Tutoriais', emoji: '🎓' }], videos: [] })
    render(<App />)
    expect(await screen.findByText(/curated by you/i)).toBeTruthy()
  })

  it('UI-2: categories and their videos are rendered', async () => {
    scriptStore({
      categories: [{ name: 'Tutoriais', emoji: '🎓' }],
      videos: [video('aaaaaaaaaaa', 'Tutoriais', 'Aprenda React')],
    })
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Tutoriais' })).toBeTruthy()
    // Also appears in "Recentemente adicionados" (cross-cutting), so allow duplicates.
    expect(screen.getAllByText('Aprenda React').length).toBeGreaterThan(0)
  })

  it('UI-3: toggling "Watched" hides watched videos', async () => {
    scriptStore({
      categories: [{ name: 'Tutoriais', emoji: '🎓' }],
      videos: [
        video('aaaaaaaaaaa', 'Tutoriais', 'Video Aberto', false),
        video('bbbbbbbbbbb', 'Tutoriais', 'Video Assistido', true),
      ],
    })
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByText('Video Assistido')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Watched' }))

    expect(screen.queryByText('Video Assistido')).toBeNull()
    expect(screen.getAllByText('Video Aberto').length).toBeGreaterThan(0)
  })
})

describe('home-smart-sections.spec (home)', () => {
  it('SMART-1/2/5: home shows Recently added and Gathering dust, with watched excluded', async () => {
    const now = Date.now()
    scriptStore({
      categories: [{ name: 'Tutoriais', emoji: '🎓' }],
      videos: [
        videoAt('rec11111111', 'Tutoriais', 'Novo Video', now - DAY, false),
        videoAt('old11111111', 'Tutoriais', 'Video Antigo', now - 40 * DAY, false),
        videoAt('seen1111111', 'Tutoriais', 'Ja Visto', now - 50 * DAY, true),
      ],
    })
    render(<App />)

    expect(await screen.findByText('Recently added')).toBeTruthy()
    expect(screen.getByText('Gathering dust')).toBeTruthy()
    // Watched video lives only in its category (excluded from both smart sections).
    expect(screen.getAllByText('Ja Visto')).toHaveLength(1)
  })

  it('SMART-6: "Gathering dust" is hidden when nothing is old enough', async () => {
    scriptStore({
      categories: [{ name: 'Tutoriais', emoji: '🎓' }],
      videos: [videoAt('fresh111111', 'Tutoriais', 'Recentinho', Date.now() - 2 * DAY, false)],
    })
    render(<App />)

    expect(await screen.findByText('Recently added')).toBeTruthy()
    expect(screen.queryByText('Gathering dust')).toBeNull()
  })
})

describe('home-icon-tiles.spec (home)', () => {
  it('HICON-1: a category tile renders a monochrome icon, not the emoji', async () => {
    scriptStore({
      categories: [{ name: 'Tutoriais', emoji: '🎓' }], // no explicit icon → auto-map (book)
      videos: [video('aaaaaaaaaaa', 'Tutoriais', 'Aprenda React')],
    })
    const { container } = render(<App />)
    await screen.findByRole('heading', { name: 'Tutoriais' })

    // Smart-section tiles keep their emoji (out of scope); the category tile is
    // the one that rendered an <svg>.
    const iconTile = [...container.querySelectorAll('.cat-ico')].find((t) => t.querySelector('svg'))
    expect(iconTile).toBeTruthy()
    expect(iconTile!.textContent).not.toContain('🎓')
  })

  it('HICON-2: an empty category shows the icon in its empty state', async () => {
    scriptStore({
      categories: [
        { name: 'Cheia', emoji: '📁' },
        { name: 'Vazia', emoji: '🎭' },
      ],
      videos: [video('aaaaaaaaaaa', 'Cheia', 'Um video')],
    })
    const { container } = render(<App />)
    await screen.findByRole('heading', { name: 'Vazia' })

    const emptyState = container.querySelector('.empty .ei')!
    expect(emptyState.querySelector('svg')).not.toBeNull()
    expect(emptyState.textContent).not.toContain('🎭')
  })

  it('HICON-5: the add-category modal shows an icon picker, not the emoji grid', async () => {
    scriptStore({ categories: [{ name: 'Tutoriais', emoji: '🎓' }], videos: [] })
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(/curated by you/i)

    await user.click(screen.getByRole('button', { name: 'Category' }))
    // Icon picker buttons are labelled by their IconKey; the old emoji chars are gone.
    expect(screen.getByRole('button', { name: 'gamepad' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'trophy' })).toBeTruthy()
    expect(screen.queryByText('🎮')).toBeNull()
  })
})

describe('storage-robustness.spec (home)', () => {
  it('ARCH-8: shows a retryable load error and recovers without presenting an empty library', async () => {
    const reply = vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(
      ((_msg: unknown, cb: (r: unknown) => void) => cb({ ok: false, error: 'Incomplete sync chunk' })) as never,
    )
    render(<App />)
    expect((await screen.findByRole('alert')).textContent).toContain('Could not load')
    expect(screen.queryByText(/curated by you/i)).toBeNull()
    reply.mockImplementation(
      ((_msg: unknown, cb: (r: unknown) => void) => cb({
        ok: true, data: { categories: [], videos: [], settings: { ...DEFAULT_SETTINGS } },
      })) as never,
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    await screen.findByText(/curated by you/i)
    expect(screen.queryByRole('alert')).toBeNull()
  })
  it('RECOVER-2: a blocked library offers export next to Retry', async () => {
    vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(
      ((_msg: unknown, cb: (r: unknown) => void) => cb({ ok: false, error: 'Incomplete sync chunk' })) as never,
    )
    render(<App />)
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeTruthy()
    expect(within(alert).getByRole('button', { name: 'Export backup' })).toBeTruthy()
  })

  it('RECOVER-2: a library that loads does not offer export', async () => {
    scriptStore({ categories: [], videos: [] })
    render(<App />)
    await screen.findByText(/curated by you/i)
    expect(screen.queryByRole('button', { name: 'Export backup' })).toBeNull()
  })

  const LIBRARY = {
    categories: [{ name: 'Tutoriais', emoji: '🎓' }],
    videos: [video('aaaaaaaaaaa', 'Tutoriais', 'Aprenda React')],
  }

  it('ROB-10: a failed mutation logs structured JSON and renders the error toast', async () => {
    scriptStoreWithMutationReply(LIBRARY, { ok: false, error: 'quota exceeded' })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Tutoriais' })

    await user.click(screen.getAllByTitle('Mark as watched')[0])

    const toast = await screen.findByRole('alert')
    expect(toast.textContent).toContain('was not saved')
    const logged = mytubeErrorLogs(errorSpy).join('\n')
    expect(logged).toContain('MARK_WATCHED')
    expect(logged).toContain('quota exceeded')
  })

  it('ROB-11: a successful mutation shows no toast and logs no error', async () => {
    const full: StorageData = { ...LIBRARY, settings: { ...DEFAULT_SETTINGS } }
    scriptStoreWithMutationReply(LIBRARY, { ok: true, data: full })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Tutoriais' })

    await user.click(screen.getAllByTitle('Mark as watched')[0])

    expect(screen.queryByRole('alert')).toBeNull()
    expect(mytubeErrorLogs(errorSpy)).toHaveLength(0)
  })
})

describe('home-category-chips.spec', () => {
  it('CHIP-1: one chip renders per category, in stored order', async () => {
    scriptStore({
      categories: [
        { name: 'Jogos', emoji: '🎮' },
        { name: 'Música', emoji: '🎵' },
        { name: 'Podcasts', emoji: '🎙️' },
      ],
      videos: [video('aaaaaaaaaaa', 'Jogos', 'Gameplay')],
    })
    render(<App />)
    const nav = await screen.findByRole('navigation', { name: 'Jump to category' })
    expect(within(nav).getAllByRole('button').map((c) => c.textContent)).toEqual([
      'Jogos',
      'Música',
      'Podcasts',
    ])
  })

  it('CHIP-2: each chip shows the category name and its icon', async () => {
    scriptStore({
      categories: [{ name: 'Jogos', emoji: '🎮' }],
      videos: [video('aaaaaaaaaaa', 'Jogos', 'Gameplay')],
    })
    render(<App />)
    const nav = await screen.findByRole('navigation', { name: 'Jump to category' })
    const chip = within(nav).getByRole('button', { name: /Jogos/ })
    expect(chip.textContent).toContain('Jogos')
    expect(chip.querySelector('svg')).not.toBeNull()
  })

  it('CHIP-3: clicking a chip scrolls its section into view', async () => {
    const scrollSpy = vi.fn()
    Element.prototype.scrollIntoView = scrollSpy
    scriptStore({
      categories: [
        { name: 'Jogos', emoji: '🎮' },
        { name: 'Música', emoji: '🎵' },
      ],
      videos: [video('aaaaaaaaaaa', 'Música', 'Clipe')],
    })
    const user = userEvent.setup()
    render(<App />)
    const nav = await screen.findByRole('navigation', { name: 'Jump to category' })

    await user.click(within(nav).getByRole('button', { name: /Música/ }))

    expect(scrollSpy).toHaveBeenCalled()
    expect((scrollSpy.mock.instances[0] as HTMLElement).id).toBe('cat-section:Música')
  })

  it('CHIP-4: no chip row on the empty welcome screen', async () => {
    scriptStore({ categories: [{ name: 'Jogos', emoji: '🎮' }], videos: [] })
    render(<App />)
    await screen.findByText(/curated by you/i)
    expect(screen.queryByRole('navigation', { name: 'Jump to category' })).toBeNull()
  })

  it('CHIP-5: an active search hides chips for categories with no match', async () => {
    scriptStore({
      categories: [
        { name: 'Jogos', emoji: '🎮' },
        { name: 'Música', emoji: '🎵' },
      ],
      videos: [
        video('aaaaaaaaaaa', 'Jogos', 'Aprenda React'),
        video('bbbbbbbbbbb', 'Música', 'Receita de Bolo'),
      ],
    })
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('navigation', { name: 'Jump to category' })

    await user.type(screen.getByPlaceholderText(/search/i), 'react')

    const nav = screen.getByRole('navigation', { name: 'Jump to category' })
    expect(within(nav).getAllByRole('button').map((c) => c.textContent)).toEqual(['Jogos'])
  })

  it('CHIP-6: the chip row re-derives when categories change in the store', async () => {
    let categories = [{ name: 'Jogos', emoji: '🎮' }]
    const reply = (cb: (r: unknown) => void) =>
      cb({ ok: true, data: { categories, videos: [video('aaaaaaaaaaa', 'Jogos', 'G')], settings: { ...DEFAULT_SETTINGS } } })
    vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(
      ((_msg: unknown, cb: (r: unknown) => void) => reply(cb)) as never,
    )
    // addListener is a shared vi.fn() across the file; clear it so calls[0] is
    // this App's storage listener, not a leftover from an earlier test.
    vi.mocked(chrome.storage.onChanged.addListener).mockClear()
    render(<App />)
    const first = await screen.findByRole('navigation', { name: 'Jump to category' })
    expect(within(first).getAllByRole('button')).toHaveLength(1)

    // The store gains a category; firing storage.onChanged makes the home reload.
    categories = [{ name: 'Jogos', emoji: '🎮' }, { name: 'Música', emoji: '🎵' }]
    const fire = vi.mocked(chrome.storage.onChanged.addListener).mock.calls[0][0]
    await act(async () => {
      fire({ 'mytube:meta': {} } as never, 'sync')
    })

    await waitFor(() => {
      const nav = screen.getByRole('navigation', { name: 'Jump to category' })
      expect(within(nav).getAllByRole('button').map((c) => c.textContent)).toEqual(['Jogos', 'Música'])
    })
  })
})

describe('category-delete.spec (home)', () => {
  // sendMessage is a shared vi.fn() (test/setup.ts) that restoreAllMocks leaves
  // populated, and these tests count the messages sent.
  beforeEach(() => {
    vi.mocked(chrome.runtime.sendMessage).mockClear()
  })

  // Opens the section's ⋯ menu and picks Delete; the section must be the only one.
  async function pickDeleteFromMenu() {
    const user = userEvent.setup()
    await user.click(await screen.findByTitle('Category options'))
    await user.click(screen.getByRole('button', { name: 'Delete category' }))
  }

  function sentDeletes(spy: ReturnType<typeof vi.spyOn>): unknown[] {
    return spy.mock.calls
      .map((args: unknown[]) => args[0] as { action: string })
      .filter((msg: { action: string }) => msg.action === 'DELETE_CATEGORY')
  }

  it('CATDEL-1: with no videos, every category renders under the welcome screen', async () => {
    scriptStore({
      categories: [
        { name: 'Jogos', emoji: '🎮' },
        { name: 'Vazia', emoji: '📁' },
      ],
      videos: [],
    })
    render(<App />)
    expect(await screen.findByText(/curated by you/i)).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Jogos' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Vazia' })).toBeTruthy()
    expect(screen.getAllByTitle('Category options')).toHaveLength(2)
  })

  it('CATDEL-2: an empty category is deletable while the library has no videos', async () => {
    const after = { categories: [], videos: [], settings: { ...DEFAULT_SETTINGS } }
    scriptStoreWithMutationReply(
      { categories: [{ name: 'Vazia', emoji: '📁' }], videos: [] },
      { ok: true, data: after },
    )
    const sendSpy = vi.spyOn(chrome.runtime, 'sendMessage')
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)
    await pickDeleteFromMenu()
    expect(sentDeletes(sendSpy)).toEqual([
      { action: 'DELETE_CATEGORY', name: 'Vazia', deleteVideos: false },
    ])
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Vazia' })).toBeNull())
  })

  it('CATDEL-3: chips and smart sections stay hidden with no videos', async () => {
    scriptStore({ categories: [{ name: 'Jogos', emoji: '🎮' }], videos: [] })
    render(<App />)
    await screen.findByRole('heading', { name: 'Jogos' })
    expect(screen.queryByRole('navigation', { name: 'Jump to category' })).toBeNull()
    expect(screen.queryByText('Recently added')).toBeNull()
    expect(screen.queryByText('Gathering dust')).toBeNull()
  })

  it('CATDEL-7: deleting "Uncategorized" with videos asks once and deletes them', async () => {
    scriptStore({
      categories: [{ name: UNCATEGORIZED, emoji: '📁' }],
      videos: [video('aaaaaaaaaaa', UNCATEGORIZED, 'Um'), video('bbbbbbbbbbb', UNCATEGORIZED, 'Dois')],
    })
    const sendSpy = vi.spyOn(chrome.runtime, 'sendMessage')
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)
    await pickDeleteFromMenu()
    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(confirmSpy.mock.calls[0][0]).toContain('2')
    expect(sentDeletes(sendSpy)).toEqual([
      { action: 'DELETE_CATEGORY', name: UNCATEGORIZED, deleteVideos: true },
    ])
  })

  it('CATDEL-7: cancelling the "Uncategorized" confirm sends nothing', async () => {
    scriptStore({
      categories: [{ name: UNCATEGORIZED, emoji: '📁' }],
      videos: [video('aaaaaaaaaaa', UNCATEGORIZED, 'Um')],
    })
    const sendSpy = vi.spyOn(chrome.runtime, 'sendMessage')
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<App />)
    await pickDeleteFromMenu()
    expect(sentDeletes(sendSpy)).toEqual([])
  })
})

describe('crt-theme.spec (home)', () => {
  // GET_ALL scripted with non-default settings (theme/accent) — spec crt-theme.
  function scriptStoreWithSettings(
    data: Omit<StorageData, 'settings'>,
    settings: Partial<StorageData['settings']>,
  ) {
    const full: StorageData = { ...data, settings: { ...DEFAULT_SETTINGS, ...settings } }
    vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(
      ((_msg: unknown, cb: (r: unknown) => void) => cb({ ok: true, data: full })) as never,
    )
  }

  const LIB = {
    categories: [{ name: 'Jogos', emoji: '🎮' }],
    videos: [video('aaaaaaaaaaa', 'Jogos', 'Gameplay')],
  }

  // applyThemePreset writes to the real <html>; scrub it so tests stay independent.
  afterEach(() => document.documentElement.removeAttribute('data-theme'))

  it('CRT-7: a stored smpte theme sets data-theme on <html> on init', async () => {
    scriptStoreWithSettings(LIB, { theme: 'smpte' })
    render(<App />)
    await waitFor(() => expect(document.documentElement.getAttribute('data-theme')).toBe('smpte'))
  })

  it('CRT-9: the theme attribute and the accent hue compose (both applied)', async () => {
    scriptStoreWithSettings(LIB, { theme: 'smpte', accent: 'mint' })
    render(<App />)
    await waitFor(() => expect(document.documentElement.getAttribute('data-theme')).toBe('smpte'))
    expect(document.documentElement.style.getPropertyValue('--accent-h')).toBe('168')
  })

  it('CRT-10: a theme changed elsewhere re-applies via storage.onChanged', async () => {
    let theme = 'aurora'
    const reply = (cb: (r: unknown) => void) =>
      cb({ ok: true, data: { ...LIB, settings: { ...DEFAULT_SETTINGS, theme } } })
    vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(
      ((_msg: unknown, cb: (r: unknown) => void) => reply(cb)) as never,
    )
    // addListener is a shared vi.fn() across the file; clear it so calls[0] is
    // this App's storage listener, not a leftover from an earlier test.
    vi.mocked(chrome.storage.onChanged.addListener).mockClear()
    render(<App />)
    await screen.findByRole('heading', { name: 'Jogos' })
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)

    // The theme flips in the store (e.g. picked in the popup); firing
    // storage.onChanged makes the home reload and re-skin (CRT-10).
    theme = 'smpte'
    const fire = vi.mocked(chrome.storage.onChanged.addListener).mock.calls[0][0]
    await act(async () => {
      fire({ 'mytube:meta': {} } as never, 'sync')
    })
    await waitFor(() => expect(document.documentElement.getAttribute('data-theme')).toBe('smpte'))
  })
})

describe('design-rework.spec (home)', () => {
  it('HOME-2: the greeting renders', async () => {
    scriptStore({ categories: [{ name: 'Tutoriais', emoji: '🎓' }], videos: [] })
    render(<App />)
    expect(await screen.findByText('Welcome back.')).toBeTruthy()
  })

  it('HOME-4: typing in search filters videos by title', async () => {
    scriptStore({
      categories: [{ name: 'Tutoriais', emoji: '🎓' }],
      videos: [
        videoAt('keepme00000', 'Tutoriais', 'Aprenda React', Date.now() - DAY),
        videoAt('hideme00000', 'Tutoriais', 'Receita de Bolo', Date.now() - DAY),
      ],
    })
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findAllByText('Receita de Bolo')).not.toHaveLength(0)
    await user.type(screen.getByPlaceholderText(/search/i), 'react')

    expect(screen.queryByText('Receita de Bolo')).toBeNull()
    expect(screen.getAllByText('Aprenda React').length).toBeGreaterThan(0)
  })
})
