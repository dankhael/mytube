// @vitest-environment jsdom
// Regression test: the popup's static chrome stayed English in pt-BR — the
// footer read "Open my home" and the gear's label/tooltip "Settings", because
// both were hard-coded in popup.html and never passed through t(). Found while
// capturing the pt-BR store screenshots.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it } from 'vitest'
import { localizePopupChrome } from './chrome-labels'

const here = dirname(fileURLToPath(import.meta.url))
const shell = readFileSync(join(here, 'popup.html'), 'utf8')

beforeEach(() => {
  document.body.innerHTML = shell.slice(shell.indexOf('<body>') + 6, shell.indexOf('</body>'))
})

const openButton = () => document.getElementById('open')!
const gear = () => document.getElementById('config')!

describe('popup chrome labels', () => {
  it('translates the footer button to pt-BR and keeps its play icon', () => {
    localizePopupChrome(document, 'pt-BR')
    expect(openButton().textContent?.trim()).toBe('Abrir minha home')
    expect(openButton().querySelector('svg')).not.toBeNull()
  })

  it("translates the gear's accessible name and tooltip to pt-BR", () => {
    localizePopupChrome(document, 'pt-BR')
    expect(gear().getAttribute('aria-label')).toBe('Configurações')
    expect(gear().getAttribute('title')).toBe('Configurações')
    expect(gear().textContent).toBe('⚙')
  })

  it('switches back to English when the language changes', () => {
    localizePopupChrome(document, 'pt-BR')
    localizePopupChrome(document, 'en')
    expect(openButton().textContent?.trim()).toBe('Open my home')
    expect(gear().getAttribute('aria-label')).toBe('Settings')
  })
})
