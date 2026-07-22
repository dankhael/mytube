// One row of the "Salvar em…" category picker. Split from content.ts so the row
// construction is jsdom-testable without booting the whole content script.
// Renders the RESOLVED monochrome icon (explicit `icon`, else name auto-map) —
// not the legacy `emoji` field, which drifted from the home/popup tiles (the
// "trophy on home, 📁 in the save menu" bug). Built via createElementNS-backed
// helpers because YouTube enforces Trusted Types (no innerHTML).

import { Category } from '../src/types'
import { categoryIconElement } from '../src/category-icon-svg'

export function pickerCategoryItem(
  cat: Category,
  onChoose: (name: string) => void,
): HTMLButtonElement {
  const item = document.createElement('button')
  item.className = 'mytube-dropdown-item'
  const name = document.createElement('span')
  name.className = 'mytube-dropdown-name'
  name.textContent = cat.name
  item.append(categoryIconElement(cat), name)
  item.addEventListener('click', (e) => {
    e.stopPropagation()
    onChoose(cat.name)
  })
  return item
}
