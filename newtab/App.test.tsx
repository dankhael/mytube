// @vitest-environment jsdom
// Component specs for the curated home. Each test names the acceptance-criterion
// ID it proves (see specs/newtab-ui.spec.md).

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { DEFAULT_SETTINGS, StorageData, Video } from '../src/types'

function video(id: string, category: string, title: string, watched = false): Video {
  return {
    id,
    title,
    thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    channelName: 'Canal',
    category,
    addedAt: 1,
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
    expect(screen.getByText('Aprenda React')).toBeTruthy()
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
    expect(screen.getByText('Video Aberto')).toBeTruthy()
  })
})
