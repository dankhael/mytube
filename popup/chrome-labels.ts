// Localizes the popup's static chrome — the "Open my home" footer button and
// the gear's accessible name / tooltip — which popup.html ships in English for
// the first paint. They used to stay English in pt-BR because nothing ran them
// through t() (found while capturing the pt-BR store screenshots).

import { t } from '../src/i18n'

// Replaces only the button's text node, so its play icon (<svg>) survives.
function setButtonLabel(button: HTMLElement, label: string): void {
  const text = [...button.childNodes].find(
    (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
  )
  if (text) text.textContent = ` ${label} `
  else button.append(label)
}

/**
 * Paints the popup shell's fixed labels in `lang`; safe to re-run on a
 * language switch.
 * @example localizePopupChrome(document, settings.language)
 */
export function localizePopupChrome(doc: Document, lang: unknown): void {
  const open = doc.getElementById('open')
  if (open) setButtonLabel(open, t('popup.openHome', lang))
  const gear = doc.getElementById('config')
  if (!gear) return
  const settings = t('config.title', lang)
  gear.setAttribute('aria-label', settings)
  gear.setAttribute('title', settings)
}
