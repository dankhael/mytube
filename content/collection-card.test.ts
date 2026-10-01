// @vitest-environment jsdom
// Regression test: "+ Salvar" on a /feed/playlists tile saved the playlist's
// first video under the playlist's title. Collection cards must be recognized
// (and skipped by the injector); single-video lockups — including playlist-page
// rows, which also carry &list= — must not be.

import { describe, expect, it } from 'vitest'
import { isCollectionCard } from './collection-card'

function fragment(html: string): HTMLElement {
  const el = document.createElement('div')
  el.innerHTML = html
  return el
}

const LIST = 'PLa1F2ddGya_-I9y1nXALrBqrZNdlUE012'

describe('collection-card — isCollectionCard', () => {
  it('flags a playlist tile by its "view full playlist" link', () => {
    const card = fragment(
      `<a href="/watch?v=dQw4w9WgXcQ&amp;list=${LIST}">thumb</a>` +
        `<a href="/playlist?list=${LIST}">Ver playlist completa</a>`,
    )
    expect(isCollectionCard(card)).toBe(true)
  })

  it('flags a playlist tile by its stacked collection thumbnail', () => {
    const card = fragment(
      '<yt-collection-thumbnail-view-model><a href="/watch?v=dQw4w9WgXcQ&amp;list=PLx">t</a></yt-collection-thumbnail-view-model>',
    )
    expect(isCollectionCard(card)).toBe(true)
  })

  it('flags a Mix by its radio link', () => {
    const card = fragment('<a href="/watch?v=dQw4w9WgXcQ&amp;list=RDdQw4w9WgXcQ&amp;start_radio=1">Mix</a>')
    expect(isCollectionCard(card)).toBe(true)
  })

  it('does not flag a playlist-page row (video link carrying &list=)', () => {
    const card = fragment(`<a href="/watch?v=dQw4w9WgXcQ&amp;list=${LIST}&amp;index=1">row</a>`)
    expect(isCollectionCard(card)).toBe(false)
  })

  it('does not flag a plain video card', () => {
    expect(isCollectionCard(fragment('<a href="/watch?v=dQw4w9WgXcQ">video</a>'))).toBe(false)
  })
})
