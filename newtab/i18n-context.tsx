// React binding for the i18n catalog (spec I18N). The new-tab tree is deep
// (App → CategorySection → VideoCard, SmartSection → VideoCard, modals), so the
// active language rides a context instead of being threaded through every prop.
// `useT()` returns a translator already bound to the active language.

import { createContext, useContext, type ReactNode } from 'react'
import { DEFAULT_LANGUAGE, Language, MessageKey, t } from '../src/i18n'

const LanguageContext = createContext<Language>(DEFAULT_LANGUAGE)

export function LanguageProvider({ lang, children }: { lang: Language; children: ReactNode }) {
  return <LanguageContext.Provider value={lang}>{children}</LanguageContext.Provider>
}

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string

// Bound translator for the surrounding LanguageProvider. Defaults to English
// when used outside a provider (e.g. an isolated component test), matching the
// DEFAULT_LANGUAGE fallback in `t`.
export function useT(): Translate {
  const lang = useContext(LanguageContext)
  return (key, vars) => t(key, lang, vars)
}
