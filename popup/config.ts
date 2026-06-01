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
  header.appendChild(textEl('h2', 'cfg-title', 'Settings'))
  const close = el('button', 'cfg-close')
  close.setAttribute('aria-label', 'Close')
  close.textContent = '✕'
  header.appendChild(close)

  // Body — one row per option (only sound effects for now).
  const body = el('div', 'cfg-body')
  body.appendChild(soundRow(settings.soundEffects, cb.onToggleSound))

  // Footer — donate placeholder card (not wired yet) — see PUI-7.
  const footer = el('div', 'cfg-footer')
  footer.appendChild(donateCard())

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

const COFFEE_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M6 2v2"/>' +
  '<path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/>' +
  '</svg>'

// Non-actionable "Buy me a coffee" placeholder card with a SOON badge (PUI-7).
function donateCard(): HTMLElement {
  const card = el('button', 'cfg-donate') as HTMLButtonElement
  card.disabled = true

  const ico = el('span', 'cfg-donate-ico')
  ico.innerHTML = COFFEE_SVG

  const text = el('div', 'cfg-donate-text')
  text.append(
    textEl('span', 'cfg-donate-title', 'Buy me a coffee'),
    textEl('span', 'cfg-donate-sub', 'Support the developer'),
  )

  card.append(ico, text, textEl('span', 'cfg-soon', 'SOON'))
  return card
}

function soundRow(initial: boolean, onToggle: (enabled: boolean) => void): HTMLElement {
  const row = el('div', 'cfg-row')
  const text = el('div', 'cfg-row-text')
  text.append(
    textEl('span', 'cfg-row-label', 'Sound effects'),
    textEl('span', 'cfg-row-sub', 'Little chimes as you browse'),
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
