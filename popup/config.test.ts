// @vitest-environment jsdom
// Config modal specs. See specs/popup-config.spec.md.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createConfigModal } from './config'
import { Settings } from '../src/types'

function open(
  partial: Partial<Settings> = {},
  onToggleSound = vi.fn(),
  onPickAccent = vi.fn(),
  onPickLanguage = vi.fn(),
  homeShortcut = '',
  onEditShortcut = vi.fn(),
  onToggleStartup = vi.fn(),
  onToggleHomeReminder = vi.fn(),
) {
  const settings: Settings = {
    soundEffects: false,
    accent: 'violet',
    language: 'en',
    openHomeOnStartup: false,
    remindOnYoutubeHome: false,
    ...partial,
  }
  const modal = createConfigModal(
    settings,
    { onToggleSound, onPickAccent, onPickLanguage, onEditShortcut, onToggleStartup, onToggleHomeReminder },
    homeShortcut,
  )
  document.body.appendChild(modal)
  return { modal, onToggleSound, onPickAccent, onPickLanguage, onEditShortcut, onToggleStartup, onToggleHomeReminder }
}

// The sound row is the .cfg-row that owns the toggle (the language row is first now).
function soundRowEl(): HTMLElement {
  return document.querySelector<HTMLElement>('.cfg-toggle')!.closest('.cfg-row')!
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
    const row = soundRowEl()
    expect(row.querySelector('.cfg-row-label')?.textContent).toBe('Sound effects')
    expect(row.querySelector('.cfg-row-sub')?.textContent).toMatch(/as you browse/i)
  })

  it('I18N-6: the language row marks the persisted language selected', () => {
    open({ language: 'pt-BR' })
    const options = document.querySelectorAll<HTMLElement>('.cfg-lang')
    expect(options.length).toBe(2)
    const selected = document.querySelector<HTMLElement>('.cfg-lang.selected')
    expect(selected?.dataset.lang).toBe('pt-BR')
    expect(selected?.getAttribute('aria-checked')).toBe('true')
  })

  it('I18N-6: an English install renders the modal in English', () => {
    open({ language: 'en' })
    expect(document.querySelector('.cfg-title')?.textContent).toBe('Settings')
  })

  it('I18N-8: a pt-BR install renders the modal in Portuguese', () => {
    open({ language: 'pt-BR' })
    expect(document.querySelector('.cfg-title')?.textContent).toBe('Configurações')
    expect(soundRowEl().querySelector('.cfg-row-label')?.textContent).toBe('Efeitos sonoros')
  })

  it('I18N-7: picking another language reports it and moves the selection', () => {
    const { onPickLanguage } = open({ language: 'en' })
    const pt = document.querySelector<HTMLElement>('.cfg-lang[data-lang="pt-BR"]')!
    pt.click()
    expect(onPickLanguage).toHaveBeenCalledWith('pt-BR')
    expect(pt.classList.contains('selected')).toBe(true)
    expect(pt.getAttribute('aria-checked')).toBe('true')
    expect(document.querySelectorAll('.cfg-lang.selected').length).toBe(1)
  })

  it('PUI-7: the donate card has a title, subtitle and SOON badge', () => {
    open({ soundEffects: false })
    expect(document.querySelector('.cfg-donate-title')?.textContent).toBe('Buy me a coffee')
    expect(document.querySelector('.cfg-donate-sub')?.textContent).toBe('Support the developer')
    expect(document.querySelector('.cfg-soon')?.textContent).toBe('SOON')
    expect(document.querySelector('.cfg-donate-ico svg')).not.toBeNull()
  })

  it('THEME-5: the theme-color row marks the persisted accent selected', () => {
    open({ accent: 'mint' })
    const swatches = document.querySelectorAll<HTMLElement>('.cfg-swatch')
    expect(swatches.length).toBe(6)
    const selected = document.querySelector<HTMLElement>('.cfg-swatch.selected')
    expect(selected?.dataset.accent).toBe('mint')
    expect(selected?.getAttribute('aria-checked')).toBe('true')
  })

  it('THEME-6: picking another swatch reports it and moves the selection', () => {
    const { onPickAccent } = open({ accent: 'violet' })
    const red = document.querySelector<HTMLElement>('.cfg-swatch[data-accent="red"]')!
    red.click()
    expect(onPickAccent).toHaveBeenCalledWith('red')
    expect(red.classList.contains('selected')).toBe(true)
    expect(red.getAttribute('aria-checked')).toBe('true')
    expect(document.querySelectorAll('.cfg-swatch.selected').length).toBe(1)
  })

  // The shortcut row owns the .cfg-shortcut button.
  function shortcutButton(): HTMLButtonElement {
    return document.querySelector<HTMLButtonElement>('.cfg-shortcut')!
  }

  it('SHORTCUT-1: the shortcut row shows the current binding when set', () => {
    open({}, vi.fn(), vi.fn(), vi.fn(), 'Ctrl+Shift+Y')
    const button = shortcutButton()
    expect(button.textContent).toBe('Ctrl+Shift+Y')
    expect(button.classList.contains('cfg-shortcut-unset')).toBe(false)
  })

  it('SHORTCUT-2: the shortcut row shows "Not set" when no binding exists', () => {
    open({}, vi.fn(), vi.fn(), vi.fn(), '')
    const button = shortcutButton()
    expect(button.textContent).toBe('Not set')
    expect(button.classList.contains('cfg-shortcut-unset')).toBe(true)
  })

  it('SHORTCUT-3: pt-BR renders the row label and the unset placeholder localized', () => {
    open({ language: 'pt-BR' }, vi.fn(), vi.fn(), vi.fn(), '')
    const row = shortcutButton().closest('.cfg-row')!
    expect(row.querySelector('.cfg-row-label')?.textContent).toBe('Atalho da home')
    expect(shortcutButton().textContent).toBe('Não definido')
  })

  it('SHORTCUT-4: clicking the shortcut button calls onEditShortcut', () => {
    const { onEditShortcut } = open({}, vi.fn(), vi.fn(), vi.fn(), 'Ctrl+Shift+Y')
    shortcutButton().click()
    expect(onEditShortcut).toHaveBeenCalledTimes(1)
  })

  it('REMIND-11: the startup toggle reflects the setting and reports the negated value', () => {
    const { onToggleStartup } = open(
      { openHomeOnStartup: false },
      vi.fn(), vi.fn(), vi.fn(), '', vi.fn(),
      vi.fn(),
    )
    const toggle = document.querySelector<HTMLElement>('.cfg-toggle--startup')!
    expect(toggle.getAttribute('aria-checked')).toBe('false')
    const row = toggle.closest('.cfg-row')!
    expect(row.querySelector('.cfg-row-label')?.textContent).toBe('Open home on startup')
    toggle.click()
    expect(onToggleStartup).toHaveBeenCalledWith(true)
    expect(toggle.getAttribute('aria-checked')).toBe('true')
  })

  it('REMIND-12: the YouTube-home reminder toggle reflects the setting and reports the negated value', () => {
    const { onToggleHomeReminder } = open(
      { remindOnYoutubeHome: true },
      vi.fn(), vi.fn(), vi.fn(), '', vi.fn(), vi.fn(),
      vi.fn(),
    )
    const toggle = document.querySelector<HTMLElement>('.cfg-toggle--remind')!
    expect(toggle.getAttribute('aria-checked')).toBe('true')
    const row = toggle.closest('.cfg-row')!
    expect(row.querySelector('.cfg-row-label')?.textContent).toBe('Remind me on YouTube')
    toggle.click()
    expect(onToggleHomeReminder).toHaveBeenCalledWith(false)
    expect(toggle.getAttribute('aria-checked')).toBe('false')
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
