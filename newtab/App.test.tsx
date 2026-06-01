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

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('newtab-ui.spec', () => {
  it('UI-1: an empty store renders the welcome screen', async () => {
    scriptStore({ categories: [{ name: 'Tutoriais', emoji: '🎓' }], videos: [] })
    render(<App />)
    expect(await screen.findByText(/curada por você/i)).toBeTruthy()
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
    await user.click(screen.getByRole('button', { name: /assistidos/i }))

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

    expect(await screen.findByText('Recentemente adicionados')).toBeTruthy()
    expect(screen.getByText('Pegando poeira')).toBeTruthy()
    // Watched video lives only in its category (excluded from both smart sections).
    expect(screen.getAllByText('Ja Visto')).toHaveLength(1)
  })

  it('SMART-6: "Pegando poeira" is hidden when nothing is old enough', async () => {
    scriptStore({
      categories: [{ name: 'Tutoriais', emoji: '🎓' }],
      videos: [videoAt('fresh111111', 'Tutoriais', 'Recentinho', Date.now() - 2 * DAY, false)],
    })
    render(<App />)

    expect(await screen.findByText('Recentemente adicionados')).toBeTruthy()
    expect(screen.queryByText('Pegando poeira')).toBeNull()
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
    await screen.findByText(/curada por você/i)

    await user.click(screen.getByRole('button', { name: /categoria/i }))
    // Icon picker buttons are labelled by their IconKey; the old emoji chars are gone.
    expect(screen.getByRole('button', { name: 'gamepad' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'trophy' })).toBeTruthy()
    expect(screen.queryByText('🎮')).toBeNull()
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
    await user.type(screen.getByPlaceholderText(/buscar/i), 'react')

    expect(screen.queryByText('Receita de Bolo')).toBeNull()
    expect(screen.getAllByText('Aprenda React').length).toBeGreaterThan(0)
  })
})
