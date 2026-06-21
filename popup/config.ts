// Settings modal for the popup. Pure DOM + injected callbacks (jsdom-testable).
// Self-contained close: ✕ button, Esc, or backdrop click. Built to hold more
// options later — each preference is just another `.cfg-row`.

import { Settings } from '../src/types'
import { AccentPreset, ACCENT_PRESETS, accentHue } from '../src/theme'
import { Language, LANGUAGES, t } from '../src/i18n'

export interface ConfigModalCallbacks {
  onToggleSound: (enabled: boolean) => void
  onPickAccent: (accent: AccentPreset) => void
  onPickLanguage: (language: Language) => void
  // Opens Chrome's shortcut settings; extensions can't bind shortcuts themselves.
  onEditShortcut: () => void
}

// `homeShortcut` is the current open-home binding (e.g. "Ctrl+Shift+Y"), '' when
// unset. The caller reads it from chrome.commands and passes it in so this modal
// stays a pure DOM unit (no chrome dependency, jsdom-testable).
// Returns the backdrop overlay; the caller appends it to the document.
export function createConfigModal(
  settings: Settings,
  cb: ConfigModalCallbacks,
  homeShortcut = '',
): HTMLElement {
  const backdrop = el('div', 'cfg-backdrop')
  const modal = el('div', 'cfg-modal')
  modal.addEventListener('click', (e) => e.stopPropagation())
  backdrop.appendChild(modal)

  document.body.classList.add('config-open')

  // The modal owns a copy of what it shows so it can re-render itself in the
  // new language the moment the user switches (Decisions §2) — without a reopen
  // and without dropping the sound/accent they changed earlier in the session.
  const shown: Settings = { ...settings }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') destroy()
  }
  function destroy(): void {
    document.body.classList.remove('config-open')
    document.removeEventListener('keydown', onKey)
    backdrop.remove()
  }

  function render(): void {
    const lang = shown.language
    modal.replaceChildren(header(lang, destroy), body(lang), footer(lang))
  }

  function body(lang: Language): HTMLElement {
    const node = el('div', 'cfg-body')
    node.append(
      languageRow(lang, (next) => {
        shown.language = next
        cb.onPickLanguage(next)
        render() // re-localize the whole modal in place
      }),
      soundRow(shown.soundEffects, lang, (on) => {
        shown.soundEffects = on
        cb.onToggleSound(on)
      }),
      accentRow(shown.accent, lang, (accent) => {
        shown.accent = accent
        cb.onPickAccent(accent)
      }),
      shortcutRow(homeShortcut, lang, cb.onEditShortcut),
    )
    return node
  }

  document.addEventListener('keydown', onKey)
  backdrop.addEventListener('click', destroy)

  render()
  return backdrop
}

function header(lang: Language, onClose: () => void): HTMLElement {
  const node = el('div', 'cfg-header')
  node.appendChild(textEl('h2', 'cfg-title', t('config.title', lang)))
  const close = el('button', 'cfg-close')
  close.setAttribute('aria-label', t('common.close', lang))
  close.textContent = '✕'
  close.addEventListener('click', onClose)
  node.appendChild(close)
  return node
}

function footer(lang: Language): HTMLElement {
  const node = el('div', 'cfg-footer')
  node.appendChild(donateCard(lang))
  return node
}

const COFFEE_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M6 2v2"/>' +
  '<path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/>' +
  '</svg>'

// Non-actionable "Buy me a coffee" placeholder card with a SOON badge (PUI-7).
function donateCard(lang: Language): HTMLElement {
  const card = el('button', 'cfg-donate') as HTMLButtonElement
  card.disabled = true

  const ico = el('span', 'cfg-donate-ico')
  ico.innerHTML = COFFEE_SVG

  const text = el('div', 'cfg-donate-text')
  text.append(
    textEl('span', 'cfg-donate-title', t('config.donate.title', lang)),
    textEl('span', 'cfg-donate-sub', t('config.donate.sub', lang)),
  )

  card.append(ico, text, textEl('span', 'cfg-soon', t('config.donate.soon', lang)))
  return card
}

// Language picker as a full-width segmented control (I18N-6/7). Single-select
// like a radio group: the persisted language starts selected; picking another
// reports it and moves the selection. It gets its own stacked row because the
// pt-BR label is too wide to sit beside the label like the sound/accent rows.
function languageRow(selected: Language, onPick: (language: Language) => void): HTMLElement {
  const row = el('div', 'cfg-row cfg-row-stack')
  const text = el('div', 'cfg-row-text')
  text.append(
    textEl('span', 'cfg-row-label', t('config.language.label', selected)),
    textEl('span', 'cfg-row-sub', t('config.language.sub', selected)),
  )
  row.appendChild(text)

  const group = el('div', 'cfg-langs')
  group.setAttribute('role', 'radiogroup')
  group.setAttribute('aria-label', t('config.language.label', selected))

  const options = LANGUAGES.map(({ code, label }) => {
    const option = el('button', 'cfg-lang') as HTMLButtonElement
    option.setAttribute('role', 'radio')
    option.dataset.lang = code
    option.textContent = label
    option.addEventListener('click', () => {
      select(code)
      onPick(code)
    })
    group.appendChild(option)
    return option
  })

  function select(code: Language): void {
    for (const option of options) {
      const on = option.dataset.lang === code
      option.setAttribute('aria-checked', String(on))
      option.classList.toggle('selected', on)
    }
  }
  select(selected)

  row.appendChild(group)
  return row
}

// A row of accent-color swatches (THEME-5/6). Single-select like a radio group:
// the persisted preset starts selected; picking another reports it and moves the
// selection. Each swatch previews its real accent color via the --accent token.
function accentRow(
  selected: AccentPreset,
  lang: Language,
  onPick: (accent: AccentPreset) => void,
): HTMLElement {
  const row = el('div', 'cfg-row')
  const text = el('div', 'cfg-row-text')
  text.append(
    textEl('span', 'cfg-row-label', t('config.theme.label', lang)),
    textEl('span', 'cfg-row-sub', t('config.theme.sub', lang)),
  )
  row.appendChild(text)

  const group = el('div', 'cfg-swatches')
  group.setAttribute('role', 'radiogroup')
  group.setAttribute('aria-label', t('config.theme.label', lang))

  const swatches = ACCENT_PRESETS.map((preset) => {
    const swatch = el('button', 'cfg-swatch') as HTMLButtonElement
    swatch.setAttribute('role', 'radio')
    swatch.dataset.accent = preset
    swatch.setAttribute('aria-label', preset)
    swatch.title = preset
    // Preview the preset's hue with the same lightness/chroma as --accent.
    swatch.style.background = `oklch(0.815 0.125 ${accentHue(preset)})`
    swatch.addEventListener('click', () => {
      select(preset)
      onPick(preset)
    })
    group.appendChild(swatch)
    return swatch
  })

  function select(preset: AccentPreset): void {
    for (const swatch of swatches) {
      const on = swatch.dataset.accent === preset
      swatch.setAttribute('aria-checked', String(on))
      swatch.classList.toggle('selected', on)
    }
  }
  select(selected)

  row.appendChild(group)
  return row
}

function soundRow(
  initial: boolean,
  lang: Language,
  onToggle: (enabled: boolean) => void,
): HTMLElement {
  const row = el('div', 'cfg-row')
  const text = el('div', 'cfg-row-text')
  text.append(
    textEl('span', 'cfg-row-label', t('config.sound.label', lang)),
    textEl('span', 'cfg-row-sub', t('config.sound.sub', lang)),
  )
  row.appendChild(text)

  const toggle = el('button', 'cfg-toggle')
  toggle.setAttribute('role', 'switch')
  const set = (on: boolean) => {
    toggle.setAttribute('aria-checked', String(on))
    toggle.classList.toggle('on', on)
  }
  set(initial)
  toggle.addEventListener('click', () => {
    const next = toggle.getAttribute('aria-checked') !== 'true'
    set(next)
    onToggle(next)
  })

  row.appendChild(toggle)
  return row
}

// Keyboard shortcut to open the home. Chrome owns the binding (extensions can't
// assign their own shortcuts), so this row only DISPLAYS the current shortcut and
// the right-side button deep-links to chrome://extensions/shortcuts to change it.
function shortcutRow(shortcut: string, lang: Language, onEdit: () => void): HTMLElement {
  const row = el('div', 'cfg-row')
  const text = el('div', 'cfg-row-text')
  text.append(
    textEl('span', 'cfg-row-label', t('config.shortcut.label', lang)),
    textEl('span', 'cfg-row-sub', t('config.shortcut.sub', lang)),
  )
  row.appendChild(text)

  const button = el('button', 'cfg-shortcut') as HTMLButtonElement
  button.textContent = shortcut || t('config.shortcut.unset', lang)
  if (!shortcut) button.classList.add('cfg-shortcut-unset')
  button.setAttribute('aria-label', t('config.shortcut.change', lang))
  button.title = t('config.shortcut.change', lang)
  button.addEventListener('click', onEdit)

  row.appendChild(button)
  return row
}

function el(tag: string, className: string): HTMLElement {
  const node = document.createElement(tag)
  node.className = className
  return node
}

function textEl(tag: string, className: string, text: string): HTMLElement {
  const node = el(tag, className)
  node.textContent = text
  return node
}
