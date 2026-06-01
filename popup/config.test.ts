// @vitest-environment jsdom
// Config modal specs. See specs/popup-config.spec.md.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createConfigModal } from './config'
import { Settings } from '../src/types'

function open(settings: Settings, onToggleSound = vi.fn()) {
  const modal = createConfigModal(settings, { onToggleSound })
  document.body.appendChild(modal)
  return { modal, onToggleSound }
}

afterEach(() => document.body.replaceChildren())

describe('popup-config.spec (modal)', () => {
  it('CFG-2: the sound toggle reflects the persisted value', () => {
    open({ soundEffects: true })
    const toggle = document.querySelector('.cfg-toggle')!
    expect(toggle.getAttribute('aria-checked')).toBe('true')
    expect(toggle.classList.contains('on')).toBe(true)
  })

  it('CFG-3: flipping the toggle reports and reflects the new value', () => {
    const { onToggleSound } = open({ soundEffects: false })
    const toggle = document.querySelector<HTMLElement>('.cfg-toggle')!
    toggle.click()
    expect(onToggleSound).toHaveBeenCalledWith(true)
    expect(toggle.getAttribute('aria-checked')).toBe('true')
  })

  it('CFG-6: the footer shows a disabled donate placeholder', () => {
    open({ soundEffects: false })
    const donate = document.querySelector<HTMLButtonElement>('.cfg-donate')!
    expect(donate.disabled).toBe(true)
    expect(donate.textContent).toMatch(/coffee/i)
    expect(document.querySelector('.cfg-soon')?.textContent).toMatch(/soon/i)
  })

  it('PUI-5: the modal title is "Settings" with a close control', () => {
    open({ soundEffects: false })
    expect(document.querySelector('.cfg-title')?.textContent).toBe('Settings')
    expect(document.querySelector('.cfg-close')).not.toBeNull()
  })

  it('PUI-6: the sound row has the English label and accurate subtitle', () => {
    open({ soundEffects: false })
    expect(document.querySelector('.cfg-row-label')?.textContent).toBe('Sound effects')
    expect(document.querySelector('.cfg-row-sub')?.textContent).toMatch(/as you browse/i)
  })

  it('PUI-7: the donate card has a title, subtitle and SOON badge', () => {
    open({ soundEffects: false })
    expect(document.querySelector('.cfg-donate-title')?.textContent).toBe('Buy me a coffee')
    expect(document.querySelector('.cfg-donate-sub')?.textContent).toBe('Support the developer')
    expect(document.querySelector('.cfg-soon')?.textContent).toBe('SOON')
    expect(document.querySelector('.cfg-donate-ico svg')).not.toBeNull()
  })

  it('CFG-7: closes via ✕, Esc and backdrop click', () => {
    // ✕
    open({ soundEffects: false })
    document.querySelector<HTMLElement>('.cfg-close')!.click()
    expect(document.querySelector('.cfg-backdrop')).toBeNull()

    // Esc
    open({ soundEffects: false })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(document.querySelector('.cfg-backdrop')).toBeNull()

    // backdrop click (but clicking inside the modal does NOT close)
    const { modal } = open({ soundEffects: false })
    modal.querySelector<HTMLElement>('.cfg-modal')!.click()
    expect(document.querySelector('.cfg-backdrop')).not.toBeNull()
    modal.click() // the backdrop itself
    expect(document.querySelector('.cfg-backdrop')).toBeNull()
  })
})
