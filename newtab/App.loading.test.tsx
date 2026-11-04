// @vitest-environment jsdom
// The home while its library is loading or failing to: replies landing out of
// order, the language before settings exist, and the way out of a blocked library.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { DEFAULT_SETTINGS, StorageData } from '../src/types'
import { t } from '../src/i18n'

// The worker's GET_ALL: answers at once with `reply`, or with none holds every
// request until the test releases it, to land replies out of order.
class ScriptedGetAll {
  private held: ((reply: unknown) => void)[] = []
  constructor(private readonly reply?: unknown) {
    vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(
      ((_msg: unknown, respond: (r: unknown) => void) => this.receive(respond)) as never,
    )
  }
  private receive(respond: (reply: unknown) => void): void {
    if (this.reply === undefined) this.held.push(respond)
    else respond(this.reply)
  }
  answer(request: number, reply: unknown): void {
    this.held[request](reply)
  }
}

function libraryWith(title: string): StorageData {
  return {
    categories: [{ name: 'Tutoriais', emoji: '🎓' }],
    videos: [{
      id: 'aaaaaaaaaaa', title, channelName: 'Canal', category: 'Tutoriais', addedAt: 1_730_000_000_123,
      thumbnail: 'https://i.ytimg.com/vi/aaaaaaaaaaa/mqdefault.jpg', watched: false,
    }],
    settings: { ...DEFAULT_SETTINGS },
  }
}

const BLOCKED = { ok: false, error: 'Incomplete sync chunk' }

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('home while loading', () => {
  it('regression: a superseded failure does not bring the error back over a healthy library', async () => {
    const worker = new ScriptedGetAll()
    render(<App />)
    worker.answer(0, BLOCKED)
    const retry = await screen.findByRole('button', { name: 'Try again' })
    const user = userEvent.setup()
    await user.click(retry)
    await user.click(retry)

    await act(async () => worker.answer(2, { ok: true, data: libraryWith('Newest title') }))
    await screen.findAllByText('Newest title')
    await act(async () => worker.answer(1, BLOCKED))

    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('regression: a superseded success does not replace newer data', async () => {
    const worker = new ScriptedGetAll()
    render(<App />)
    worker.answer(0, BLOCKED)
    const retry = await screen.findByRole('button', { name: 'Try again' })
    const user = userEvent.setup()
    await user.click(retry)
    await user.click(retry)

    await act(async () => worker.answer(2, { ok: true, data: libraryWith('Newest title') }))
    await screen.findAllByText('Newest title')
    await act(async () => worker.answer(1, { ok: true, data: libraryWith('Older title') }))

    expect(screen.queryAllByText('Older title')).toEqual([])
    expect(screen.getAllByText('Newest title').length).toBeGreaterThan(0)
  })

  it('regression: the first load error follows the browser language, since settings are unreadable', async () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('pt-BR')
    new ScriptedGetAll(BLOCKED)
    render(<App />)
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Não foi possível carregar')
    expect(within(alert).getByRole('button', { name: 'Tentar novamente' })).toBeTruthy()
    expect(within(alert).getByRole('button', { name: 'Exportar backup' })).toBeTruthy()
  })

  it('regression: the loading text follows the browser language too', async () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('pt-BR')
    new ScriptedGetAll()
    render(<App />)
    expect(screen.getByText(t('home.loading', 'pt-BR'))).toBeTruthy()
  })

  it('RECOVER-2: a blocked library offers export next to Retry', async () => {
    new ScriptedGetAll(BLOCKED)
    render(<App />)
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeTruthy()
    expect(within(alert).getByRole('button', { name: 'Export backup' })).toBeTruthy()
  })

  it('RECOVER-2: a library that loads does not offer export', async () => {
    new ScriptedGetAll({ ok: true, data: { categories: [], videos: [], settings: { ...DEFAULT_SETTINGS } } })
    render(<App />)
    await screen.findByText(/curated by you/i)
    expect(screen.queryByRole('button', { name: 'Export backup' })).toBeNull()
  })
})
