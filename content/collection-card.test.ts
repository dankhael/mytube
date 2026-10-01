// @vitest-environment jsdom
// Regression test: "+ Salvar" on a /feed/playlists tile saved the playlist's
// first video under the playlist's title. Collection cards must be recognized
// (and skipped by the injector); single-video lockups — including playlist-page
// rows, which also carry &list= — must not be.

import { describe, expect, it } from 'vitest'
import { isCollectionCard, isPreviewOfCollection } from './collection-card'

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
    const card = fragment(
      '<a href="/watch?v=dQw4w9WgXcQ&amp;list=RDdQw4w9WgXcQ&amp;start_radio=1">Mix</a>',
    )
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

// The hover preview plays a playlist tile's first video with a watch link
// carrying the tile's list= — trimmed from the live channel /playlists tab.
function previewOf(href: string): HTMLElement {
  return fragment(`<ytd-video-preview><a href="${href}">preview</a></ytd-video-preview>`)
}

function playlistTile(list: string): string {
  return `<yt-lockup-view-model><a href="/watch?v=835AJcII3jI&amp;list=${list}">
    <yt-collection-thumbnail-view-model></yt-collection-thumbnail-view-model></a>
    <a href="/playlist?list=${list}">Ver playlist completa</a></yt-lockup-view-model>`
}

describe('collection-card — isPreviewOfCollection', () => {
  it('flags a preview playing a playlist tile on the page', () => {
    const page = fragment(playlistTile(LIST))
    const preview = previewOf(`/watch?v=835AJcII3jI&list=${LIST}`)
    expect(isPreviewOfCollection(preview, page)).toBe(true)
  })

  it('does not flag a plain video preview (no list=)', () => {
    const page = fragment(playlistTile(LIST))
    expect(isPreviewOfCollection(previewOf('/watch?v=dQw4w9WgXcQ'), page)).toBe(false)
  })

  it('does not flag a playlist-page row preview (its list has no tile on the page)', () => {
    const page = fragment(
      `<yt-lockup-view-model><a href="/watch?v=dQw4w9WgXcQ&amp;list=${LIST}&amp;index=1">row</a></yt-lockup-view-model>`,
    )
    const preview = previewOf(`/watch?v=dQw4w9WgXcQ&list=${LIST}&index=1`)
    expect(isPreviewOfCollection(preview, page)).toBe(false)
  })

  it('does not flag a preview whose list= belongs to a different playlist tile', () => {
    const page = fragment(playlistTile('PLother'))
    expect(isPreviewOfCollection(previewOf(`/watch?v=835AJcII3jI&list=${LIST}`), page)).toBe(false)
  })
})
