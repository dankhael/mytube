// Settings modal for the popup. Pure DOM + injected callbacks (jsdom-testable).
// Self-contained close: ✕ button, Esc, or backdrop click. Built to hold more
// options later — each preference is just another `.cfg-row`.

import { Settings } from '../src/types'

export interface ConfigModalCallbacks {
  onToggleSound: (enabled: boolean) => void
}

// Returns the backdrop overlay; the caller appends it to the document.
export function createConfigModal(settings: Settings, cb: ConfigModalCallbacks): HTMLElement {
  const backdrop = el('div', 'cfg-backdrop')
  const modal = el('div', 'cfg-modal')
  modal.addEventListener('click', (e) => e.stopPropagation())

  // Header
  const header = el('div', 'cfg-header')
  header.appendChild(textEl('h2', 'cfg-title', 'Configurações'))
  const close = el('button', 'cfg-close')
  close.setAttribute('aria-label', 'Fechar')
  close.textContent = '✕'
  header.appendChild(close)

  // Body — one row per option (only sound effects for now).
  const body = el('div', 'cfg-body')
  body.appendChild(soundRow(settings.soundEffects, cb.onToggleSound))

  // Footer — donate placeholder (not wired yet).
  const footer = el('div', 'cfg-footer')
  const donate = el('button', 'cfg-donate') as HTMLButtonElement
  donate.disabled = true
  donate.textContent = '☕ Pague um café / apoie o desenvolvedor'
  footer.append(donate, textEl('span', 'cfg-soon', 'em breve'))

  modal.append(header, body, footer)
  backdrop.appendChild(modal)

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') destroy()
  }
  function destroy() {
    document.removeEventListener('keydown', onKey)
    backdrop.remove()
  }
  document.addEventListener('keydown', onKey)
  close.addEventListener('click', destroy)
  backdrop.addEventListener('click', destroy)

  return backdrop
}

function soundRow(initial: boolean, onToggle: (enabled: boolean) => void): HTMLElement {
  const row = el('div', 'cfg-row')
  row.appendChild(textEl('span', 'cfg-row-label', 'Efeitos sonoros'))

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
