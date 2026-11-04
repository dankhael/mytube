// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { showPopupError } from './status'

afterEach(() => document.body.replaceChildren())

it('replaces old failures and exposes a localized reload action', () => {
  const reload = vi.fn()
  showPopupError(reload)
  showPopupError(reload, 'pt-BR')
  expect(document.querySelectorAll('[role="alert"]')).toHaveLength(1)
  const button = document.querySelector('button')!
  expect(button.textContent).toBe('Recarregar')
  button.click()
  expect(reload).toHaveBeenCalledOnce()
})
