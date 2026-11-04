// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { DEFAULT_DATA, type Message, type MessageResponse } from '../src/types'

// Holds UPDATE_SETTINGS open so a test can act while the save is in flight.
class HeldSettingsRuntime {
  private release: (() => void) | undefined
  sendMessage(message: Message, reply: (response: MessageResponse) => void): void {
    if (message.action !== 'UPDATE_SETTINGS') {
      reply({ ok: true, data: structuredClone(DEFAULT_DATA) })
      return
    }
    this.release = () => reply({ ok: false, error: 'Sync quota exceeded' })
  }
  failHeldSave(): void {
    this.release?.()
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.replaceChildren()
  document.body.classList.remove('config-open')
})

it('regression: Esc cannot close the dialog mid-save, so the late reply finds its own', async () => {
  const runtime = new HeldSettingsRuntime()
  vi.stubGlobal('chrome', { ...chrome, runtime, commands: { getAll: async () => [] } })
  document.body.innerHTML = '<span id="total"></span><ul id="list"></ul><button id="config"></button><button id="open"></button>'
  await import('./popup')
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Settings' }))
  await user.click(await screen.findByRole('radio', { name: 'mint' }))
  await user.keyboard('{Escape}')
  expect(document.querySelector('.cfg-backdrop')).not.toBeNull()
  runtime.failHeldSave()
  await screen.findByRole('alert')
  await waitFor(() => expect(document.querySelector('.cfg-backdrop')).toBeNull())
})
