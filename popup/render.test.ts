// @vitest-environment jsdom
// Popup render/interaction specs. See specs/popup-categories.spec.md.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderPopup, PopupCallbacks } from './render'
import { DEFAULT_SETTINGS, StorageData, Video } from '../src/types'

function vid(id: string, title: string, channel: string): Video {
  return {
    id,
    title,
    thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    channelName: channel,
    category: 'Tutoriais',
    addedAt: 1,
    watched: false,
  }
}

function mount(data: Omit<StorageData, 'settings'>, cb?: Partial<PopupCallbacks>) {
  const root = document.createElement('ul')
  document.body.appendChild(root)
  const callbacks: PopupCallbacks = { openVideo: vi.fn(), openHome: vi.fn(), ...cb }
  renderPopup(root, { ...data, settings: { ...DEFAULT_SETTINGS } }, callbacks)
  return { root, callbacks }
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('popup-categories.spec (render)', () => {
  it('POPUP-1: each category is a row with count, all collapsed', () => {
    const { root } = mount({
      categories: [
        { name: 'Tutoriais', emoji: '🎓' },
        { name: 'Games', emoji: '🎮' },
      ],
      videos: [vid('a', 'A', 'CanalA')],
    })
    expect(root.querySelectorAll('.cat-row')).toHaveLength(2)
    expect(root.querySelector('.cat-name')?.textContent).toBe('Tutoriais')
    expect(root.querySelector('.cat-count')?.textContent).toBe('1')
    expect(root.querySelectorAll('li.cat.open')).toHaveLength(0)
  })

  it('POPUP-2: clicking expands to show thumb/title/channel and collapses again', () => {
    const { root } = mount({
      categories: [{ name: 'Tutoriais', emoji: '🎓' }],
      videos: [vid('aaaaaaaaaaa', 'Aprenda React', 'Canal X')],
    })
    const row = root.querySelector<HTMLElement>('.cat-row')!

    row.click()
    const section = root.querySelector('li.cat')!
    expect(section.classList.contains('open')).toBe(true)
    expect(root.querySelector('.vid-title')?.textContent).toBe('Aprenda React')
    expect(root.querySelector('.vid-channel')?.textContent).toBe('Canal X')
    expect(root.querySelector<HTMLImageElement>('.vid-thumb')?.src).toContain('aaaaaaaaaaa')

    row.click()
    expect(section.classList.contains('open')).toBe(false)
  })

  it('POPUP-3: clicking a video opens it by id', () => {
    const openVideo = vi.fn()
    const { root } = mount(
      { categories: [{ name: 'Tutoriais', emoji: '🎓' }], videos: [vid('vid12345678', 'T', 'C')] },
      { openVideo },
    )
    root.querySelector<HTMLElement>('.cat-row')!.click()
    root.querySelector<HTMLElement>('.vid')!.click()
    expect(openVideo).toHaveBeenCalledWith('vid12345678')
  })

  it('POPUP-4: an empty store shows the hint and no category rows', () => {
    const { root } = mount({ categories: [{ name: 'Tutoriais', emoji: '🎓' }], videos: [] })
    expect(root.querySelector('.empty')).not.toBeNull()
    expect(root.querySelectorAll('.cat-row')).toHaveLength(0)
  })

  it('POPUP-5: expanding a zero-video category shows a placeholder', () => {
    const { root } = mount({
      categories: [
        { name: 'Cheia', emoji: '📁' },
        { name: 'Vazia', emoji: '📁' },
      ],
      videos: [vid('a', 'A', 'C')], // keeps store non-empty so categories render
    })
    const vaziaRow = root.querySelectorAll<HTMLElement>('.cat-row')[1]
    vaziaRow.click()
    expect(root.querySelector('.cat-empty')?.textContent).toMatch(/no videos here/i)
  })

  it('I18N-8: a pt-BR store renders the popup empty state in Portuguese', () => {
    const root = document.createElement('ul')
    document.body.appendChild(root)
    renderPopup(
      root,
      { categories: [], videos: [], settings: { ...DEFAULT_SETTINGS, language: 'pt-BR' } },
      { openVideo: vi.fn(), openHome: vi.fn() },
    )
    expect(root.querySelector('.empty')?.textContent).toMatch(/nenhum vídeo salvo/i)
  })

  it('I18N-9: an English store renders the popup empty state in English', () => {
    const { root } = mount({ categories: [], videos: [] })
    expect(root.querySelector('.empty')?.textContent).toMatch(/no videos saved/i)
  })

  it('PUI-2: category row shows an icon tile (svg), not the emoji, with a count pill', () => {
    const { root } = mount({
      categories: [
        { name: 'Tutoriais', emoji: '🎓' },
        { name: 'Vazia', emoji: '🎮' },
      ],
      videos: [vid('a', 'A', 'C')], // category 'Tutoriais'
    })
    const ico = root.querySelector('.cat-ico')!
    expect(ico.querySelector('svg')).not.toBeNull()
    expect(ico.textContent).not.toContain('🎓')
    // Count pill renders even for the zero-video category.
    const counts = [...root.querySelectorAll('.cat-count')].map((c) => c.textContent)
    expect(counts).toEqual(['1', '0'])
  })

  it('PUI-3: the chevron reflects collapsed vs expanded state', () => {
    const { root } = mount({
      categories: [{ name: 'Tutoriais', emoji: '🎓' }],
      videos: [vid('a', 'A', 'C')],
    })
    const row = root.querySelector<HTMLElement>('.cat-row')!
    expect(root.querySelector('.chev')?.textContent).toBe('▸')
    row.click()
    expect(root.querySelector('.chev')?.textContent).toBe('▾')
    row.click()
    expect(root.querySelector('.chev')?.textContent).toBe('▸')
  })

  it('POPUP-7: more than 10 videos caps at 10 with a "ver todos" link', () => {
    const openHome = vi.fn()
    const videos = Array.from({ length: 12 }, (_, i) => vid(`id${i}`.padEnd(11, '0'), `T${i}`, 'C'))
    const { root } = mount(
      { categories: [{ name: 'Tutoriais', emoji: '🎓' }], videos },
      { openHome },
    )
    root.querySelector<HTMLElement>('.cat-row')!.click()

    expect(root.querySelectorAll('.vid')).toHaveLength(10)
    const more = root.querySelector<HTMLElement>('.more-link')!
    expect(more.textContent).toContain('(12)')
    more.click()
    expect(openHome).toHaveBeenCalled()
  })
})
