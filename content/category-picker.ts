// Generic category chooser: builds the themed dropdown, lists categories plus an
// inline "+ Nova categoria", and hands the chosen name to `onPick`. Both the
// per-card save and the playlist import (content/playlist-import.ts) drive it —
// the action is injected, not baked in. Placement stays in content.ts (`mount`).

import { Language, t } from '../src/i18n'
import { Category } from '../src/types'
import { pickerCategoryItem } from './picker-item'
import { SendToWorker } from './save-flow'

// Headers the generic picker can show — both are catalog keys (i18n).
export type PickerHeaderKey = 'content.saveTo' | 'content.import.pickCategory'

export interface CategoryPickerDeps {
  send: SendToWorker
  isTornDown: () => boolean
  language: () => Language
  closeDropdowns: () => void
  mount: (dropdown: HTMLElement, anchor: HTMLElement) => void
}

/**
 * The picker's categories, or null when the library couldn't be read. Null is not
 * [] on purpose: zero categories is a valid library, and only null is an error.
 * @example const categories = await loadPickerCategories(sendMessage)
 */
export async function loadPickerCategories(send: SendToWorker): Promise<Category[] | null> {
  const res = await send({ action: 'GET_ALL' })
  return res.ok && 'data' in res && res.data ? res.data.categories : null
}

/**
 * The picker's body when categories couldn't be read: the error plus a retry. It
 * replaces "+ New category" too, because that write would fail the same way.
 * @example dropdown.appendChild(pickerLoadError('en', () => reopenPicker()))
 */
export function pickerLoadError(lang: Language, onRetry: () => void): HTMLElement {
  const box = document.createElement('div')
  box.setAttribute('role', 'alert')
  const message = document.createElement('div')
  message.className = 'mytube-dropdown-header'
  message.textContent = t('content.loadFailed', lang)
  const retry = document.createElement('button')
  retry.className = 'mytube-dropdown-item'
  retry.textContent = t('content.tryAgain', lang)
  retry.addEventListener('click', (e) => {
    e.stopPropagation() // the menu's outside-click handler must not race the reopen
    onRetry()
  })
  box.append(message, retry)
  return box
}

function emptyDropdown(title: string): HTMLElement {
  const dropdown = document.createElement('div')
  dropdown.className = 'mytube-dropdown'
  const header = document.createElement('div')
  header.className = 'mytube-dropdown-header'
  header.textContent = title
  dropdown.appendChild(header)
  return dropdown
}

function newCategoryInput(
  lang: Language,
  choose: (name: string) => void,
  cancel: () => void,
): HTMLInputElement {
  const input = document.createElement('input')
  input.className = 'mytube-dropdown-input'
  input.placeholder = t('content.categoryNamePlaceholder', lang)
  input.addEventListener('click', (ev) => ev.stopPropagation())
  input.addEventListener('keydown', (ev) => {
    ev.stopPropagation()
    if (ev.key === 'Enter' && input.value.trim()) choose(input.value.trim())
    else if (ev.key === 'Escape') cancel()
  })
  return input
}

// "Nova categoria" — expands into an inline input.
function newCategoryItem(
  lang: Language,
  choose: (name: string) => void,
  cancel: () => void,
): HTMLButtonElement {
  const item = document.createElement('button')
  item.className = 'mytube-dropdown-item mytube-dropdown-new'
  item.textContent = t('content.newCategory', lang)
  item.addEventListener('click', (e) => {
    e.stopPropagation()
    const input = newCategoryInput(lang, choose, cancel)
    item.replaceWith(input)
    input.focus()
  })
  return item
}

/**
 * Opens the chooser on `btn`, or its error and retry when the library can't be read.
 * @example await openCategoryPicker(btn, save, 'content.saveTo', pickerDeps)
 */
export async function openCategoryPicker(
  btn: HTMLElement,
  onPick: (category: string) => void,
  headerKey: PickerHeaderKey,
  deps: CategoryPickerDeps,
): Promise<void> {
  deps.closeDropdowns()
  const categories = await loadPickerCategories(deps.send)
  // A send that found the extension gone has torn this script down by now, and an
  // orphaned script must leave no UI behind (M4).
  if (deps.isTornDown()) return
  const lang = deps.language()
  const dropdown = emptyDropdown(t(headerKey, lang))
  const choose = (category: string) => {
    deps.closeDropdowns()
    onPick(category)
  }
  if (categories) {
    categories.forEach((cat) => dropdown.appendChild(pickerCategoryItem(cat, choose, lang)))
    dropdown.appendChild(newCategoryItem(lang, choose, deps.closeDropdowns))
  } else {
    const retry = () => void openCategoryPicker(btn, onPick, headerKey, deps)
    dropdown.appendChild(pickerLoadError(lang, retry))
  }
  deps.mount(dropdown, btn)
}
