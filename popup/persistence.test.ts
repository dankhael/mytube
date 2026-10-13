// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { DEFAULT_DATA, type Message, type MessageResponse } from '../src/types'

class FailingSettingsRuntime {
  sendMessage(message: Message, reply: (response: MessageResponse) => void): void {
    reply(message.action === 'UPDATE_SETTINGS'
      ? { ok: false, error: 'Sync quota exceeded' }
      : { ok: true, data: structuredClone(DEFAULT_DATA) })
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.replaceChildren()
  document.body.classList.remove('config-open')
  document.documentElement.removeAttribute('style')
})

it('ARCH-8: rolls back a failed preference preview and closes the stale settings modal', async () => {
  vi.stubGlobal('chrome', {
    ...chrome,
    runtime: new FailingSettingsRuntime(),
    commands: { getAll: async () => [] },
  })
  document.body.innerHTML = '<span id="total"></span><ul id="list"></ul><button id="config"></button><button id="open"></button>'
  await import('./popup')
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Settings' }))
  await user.click(await screen.findByRole('radio', { name: 'mint' }))
  await screen.findByRole('alert')
  await waitFor(() => expect(document.documentElement.style.getPropertyValue('--accent-h')).toBe('290'))
  expect(document.querySelector('.cfg-backdrop')).toBeNull()
  expect(document.body.classList.contains('config-open')).toBe(false)
})
