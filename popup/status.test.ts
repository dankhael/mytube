// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { showPopupError } from './status'

afterEach(() => document.body.replaceChildren())

it('replaces old failures and exposes a localized retry action', () => {
  const retry = vi.fn()
  showPopupError(retry)
  showPopupError(retry, 'pt-BR')
  expect(document.querySelectorAll('[role="alert"]')).toHaveLength(1)
  const button = document.querySelector('button')!
  expect(button.textContent).toBe('Tentar novamente')
  button.click()
  expect(retry).toHaveBeenCalledOnce()
})
