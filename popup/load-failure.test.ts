// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { type Message, type MessageResponse } from '../src/types'

class UnreadableLibraryRuntime {
  sendMessage(_message: Message, reply: (response: MessageResponse) => void): void {
    reply({ ok: false, error: 'Incomplete sync chunk mytube:videos:0' })
  }
  getURL(path: string): string {
    return `chrome-extension://test/${path}`
  }
}

class RecordingTabs {
  readonly opened: string[] = []
  create = (props: { url: string }): void => {
    this.opened.push(props.url)
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.resetModules()
  document.body.replaceChildren()
})

it('regression: Open home still works when the library cannot be read', async () => {
  const tabs = new RecordingTabs()
  vi.stubGlobal('chrome', { ...chrome, runtime: new UnreadableLibraryRuntime(), tabs })
  document.body.innerHTML = '<span id="total"></span><ul id="list"></ul><button id="config"></button><button id="open">Open</button>'
  await import('./popup')
  await screen.findByRole('alert')
  await userEvent.setup().click(screen.getByRole('button', { name: 'Open' }))
  expect(tabs.opened).toEqual(['chrome-extension://test/newtab/index.html'])
})

it('regression: the load error follows the browser language, since settings are unreadable', async () => {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('pt-BR')
  vi.stubGlobal('chrome', { ...chrome, runtime: new UnreadableLibraryRuntime(), tabs: new RecordingTabs() })
  document.body.innerHTML = '<span id="total"></span><ul id="list"></ul><button id="config"></button><button id="open">Open</button>'
  await import('./popup')
  expect((await screen.findByRole('alert')).textContent).toContain('Não foi possível carregar')
  expect(screen.getByRole('button', { name: 'Recarregar' })).toBeTruthy()
})
