// Executable spec for specs/i18n-language.spec.md (I18N-3/4/5) — the message
// catalog and the t(key, lang) lookup. Surface-level localization (popup,
// new-tab, content script) is covered by component tests + Manual acceptance.

import { describe, expect, it } from 'vitest'
import { detectLanguage, messageKeys, t, type MessageKey } from './i18n'

describe('i18n-language.spec — catalog', () => {
  it('I18N-3: t returns the locale string for a defined key', () => {
    expect(t('config.title', 'en')).toBe('Settings')
    expect(t('config.title', 'pt-BR')).toBe('Configurações')
    expect(t('home.welcomeBack', 'pt-BR')).toBe('Bem-vindo de volta.')
  })

  it('I18N-3: t fills {placeholders} from vars', () => {
    expect(t('common.seeAll', 'en', { count: 12 })).toBe('See all (12)')
    expect(t('content.savedIn', 'pt-BR', { category: 'Tutoriais' })).toBe('Salvo em: Tutoriais')
  })

  it('I18N-4: both locales define exactly the same key set', () => {
    const en = messageKeys('en').sort()
    const pt = messageKeys('pt-BR').sort()
    expect(pt).toEqual(en)
  })

  it('I18N-5: an unknown language falls back to English', () => {
    expect(t('config.title', 'fr')).toBe('Settings')
    expect(t('config.title', undefined)).toBe('Settings')
    expect(t('config.title', 42)).toBe('Settings')
  })

  it('I18N-5: an unknown key returns the key itself rather than undefined, no throw', () => {
    const unknown = 'does.not.exist' as MessageKey
    expect(() => t(unknown, 'en')).not.toThrow()
    expect(t(unknown, 'pt-BR')).toBe('does.not.exist')
  })

  it('Decisions §1: detectLanguage maps pt* locales to pt-BR, everything else to en', () => {
    expect(detectLanguage('pt-BR')).toBe('pt-BR')
    expect(detectLanguage('pt')).toBe('pt-BR')
    expect(detectLanguage('PT-pt')).toBe('pt-BR')
    expect(detectLanguage('en-US')).toBe('en')
    expect(detectLanguage('es')).toBe('en')
    expect(detectLanguage(undefined)).toBe('en')
  })
})
