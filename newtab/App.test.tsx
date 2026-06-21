// @vitest-environment jsdom
// Component specs for the curated home. Each test names the acceptance-criterion
// ID it proves (see specs/newtab-ui.spec.md).

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { DEFAULT_SETTINGS, StorageData, Video } from '../src/types'

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
    expect(await screen.findByText('Tutoriais')).toBeTruthy()
    // Also appears in "Recentemente adicionados" (cross-cutting), so allow duplicates.
    expect(screen.getAllByText('Aprenda React').length).toBeGreaterThan(0)
  })

  it('UI-3: toggling "Assistidos" hides watched videos', async () => {
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
  it('SMART-1/2/5: home shows Recentes and Poeira, with watched excluded', async () => {
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

  it('SMART-6: "Pegando poeira" is hidden when nothing is old enough', async () => {
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
    await screen.findByText('Tutoriais')

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
    await screen.findByText('Vazia')

    const emptyState = container.querySelector('.empty .ei')!
    expect(emptyState.querySelector('svg')).not.toBeNull()
    expect(emptyState.textContent).not.toContain('🎭')
  })

  it('HICON-5: the add-category modal shows an icon picker, not the emoji grid', async () => {
    scriptStore({ categories: [{ name: 'Tutoriais', emoji: '🎓' }], videos: [] })
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(/curated by you/i)

    await user.click(screen.getByRole('button', { name: /category/i }))
    // Icon picker buttons are labelled by their IconKey; the old emoji chars are gone.
    expect(screen.getByRole('button', { name: 'gamepad' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'trophy' })).toBeTruthy()
    expect(screen.queryByText('🎮')).toBeNull()
  })
})

describe('storage-robustness.spec (home)', () => {
  const LIBRARY = {
    categories: [{ name: 'Tutoriais', emoji: '🎓' }],
    videos: [video('aaaaaaaaaaa', 'Tutoriais', 'Aprenda React')],
  }

  it('ROB-10: a failed mutation logs structured JSON and renders the error toast', async () => {
    scriptStoreWithMutationReply(LIBRARY, { ok: false, error: 'quota exceeded' })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Tutoriais')

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
    await screen.findByText('Tutoriais')

    await user.click(screen.getAllByTitle('Mark as watched')[0])

    expect(screen.queryByRole('alert')).toBeNull()
    expect(mytubeErrorLogs(errorSpy)).toHaveLength(0)
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
