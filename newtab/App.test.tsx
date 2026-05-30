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
