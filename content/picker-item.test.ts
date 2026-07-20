// @vitest-environment jsdom
// Regression: the "Salvar em…" picker showed the legacy `emoji` (📁) instead of
// the category's resolved icon — a category shown with a trophy on the home
// rendered a folder in the save menu. Rows must render the same resolved
// monochrome icon as the home/popup tiles (HICON-4 extended to this surface).

import { describe, expect, it, vi } from 'vitest'
import { iconSvgElement } from '../src/category-icon-svg'
import { pickerCategoryItem } from './picker-item'

describe('content picker-item', () => {
  it('renders the auto-mapped icon for the name, never the stored emoji', () => {
    const item = pickerCategoryItem({ name: 'Esportes', emoji: '📁' }, vi.fn())
    expect(item.textContent).toBe('Esportes')
    expect(item.textContent).not.toContain('📁')
    expect(item.querySelector('svg')!.isEqualNode(iconSvgElement('trophy'))).toBe(true)
  })

  it('honours an explicit category icon over the name guess', () => {
    const item = pickerCategoryItem({ name: 'Esportes', emoji: '🏆', icon: 'gamepad' }, vi.fn())
    expect(item.querySelector('svg')!.isEqualNode(iconSvgElement('gamepad'))).toBe(true)
  })

  it('falls back to the default icon for an unmapped name', () => {
    const item = pickerCategoryItem({ name: 'Zzz', emoji: '📁' }, vi.fn())
    expect(item.querySelector('svg')!.isEqualNode(iconSvgElement('bookmark'))).toBe(true)
  })

  it('clicking the row picks the category name and stops propagation', () => {
    const onChoose = vi.fn()
    const outer = vi.fn()
    const host = document.createElement('div')
    host.addEventListener('click', outer)
    const item = pickerCategoryItem({ name: 'Esportes', emoji: '📁' }, onChoose)
    host.appendChild(item)

    item.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(onChoose).toHaveBeenCalledWith('Esportes')
    expect(outer).not.toHaveBeenCalled()
  })
})
