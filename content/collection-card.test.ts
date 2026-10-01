// @vitest-environment jsdom
// Regression tests for "+ Salvar" on playlist/Mix tiles, which saved the list's
// first video under the list's title — and for the 1.0.1 over-correction that hid
// the button on every music video: YouTube links plain search results as
// `watch?v=…&list=RD…&start_radio=1`, and a Mix shares that same `list=RD…` with
// the video it was seeded from. Fragments trimmed from live YouTube (2026-09).

import { describe, expect, it } from 'vitest'
import { Box, isCollectionCard, isPreviewOfCollection } from './collection-card'

function fragment(html: string): HTMLElement {
  const el = document.createElement('div')
  el.innerHTML = html
  return el
}

const LIST = 'PLa1F2ddGya_-I9y1nXALrBqrZNdlUE012'
const RADIO = '/watch?v=1y6smkh6c-0&amp;list=RD1y6smkh6c-0&amp;start_radio=1'

// A search-result music video: a plain video, despite its radio-shaped link.
const MUSIC_VIDEO = `<ytd-video-renderer><ytd-thumbnail>
  <a id="thumbnail" href="${RADIO}&amp;pp=ygUU">thumb</a></ytd-thumbnail></ytd-video-renderer>`

// A Mix (or playlist) tile: the stacked collection thumbnail around the link.
function collectionTile(href: string): string {
  return `<yt-lockup-view-model><a href="${href}"><yt-collection-thumbnail-view-model>
    <yt-collections-stack></yt-collections-stack></yt-collection-thumbnail-view-model></a>
    </yt-lockup-view-model>`
}

describe('collection-card — isCollectionCard', () => {
  it('flags a playlist tile by its stacked collection thumbnail', () => {
    const card = fragment(collectionTile(`/watch?v=835AJcII3jI&amp;list=${LIST}`))
    expect(isCollectionCard(card)).toBe(true)
  })

  it('flags a Mix tile (same stacked thumbnail)', () => {
    expect(isCollectionCard(fragment(collectionTile(RADIO)))).toBe(true)
  })

  it('flags a classic grid playlist by its ytd-playlist-thumbnail', () => {
    expect(isCollectionCard(fragment('<ytd-playlist-thumbnail></ytd-playlist-thumbnail>'))).toBe(true)
  })

  it('does not flag a music-video search result whose link carries start_radio', () => {
    expect(isCollectionCard(fragment(MUSIC_VIDEO))).toBe(false)
  })

  it('does not flag a playlist-page row (video link carrying &list=)', () => {
    const card = fragment(`<a href="/watch?v=dQw4w9WgXcQ&amp;list=${LIST}&amp;index=1">row</a>`)
    expect(isCollectionCard(card)).toBe(false)
  })

  it('does not flag a plain video card', () => {
    expect(isCollectionCard(fragment('<a href="/watch?v=dQw4w9WgXcQ">video</a>'))).toBe(false)
  })
})

// jsdom has no layout, so boxes are injected: each element's box comes from its
// data-box="left,top,width,height" attribute.
function boxOf(el: Element): Box {
  const [left, top, width, height] = (el.getAttribute('data-box') ?? '0,0,0,0').split(',').map(Number)
  return { left, top, width, height }
}

// A search page: the Mix tile at y=0..200, the plain music video at y=300..500.
// Both carry list=RD1y6smkh6c-0 — only position tells them apart.
function searchPage(): HTMLElement {
  return fragment(
    `<yt-lockup-view-model><a href="${RADIO}"><yt-collection-thumbnail-view-model data-box="0,0,360,200">
    </yt-collection-thumbnail-view-model></a></yt-lockup-view-model>` + MUSIC_VIDEO,
  )
}

function previewAt(box: string): HTMLElement {
  return fragment(`<ytd-video-preview data-box="${box}"><a href="${RADIO}">p</a></ytd-video-preview>`)
    .firstElementChild as HTMLElement
}

describe('collection-card — isPreviewOfCollection', () => {
  it('flags a preview sitting over a Mix/playlist tile', () => {
    expect(isPreviewOfCollection(previewAt('0,0,360,200'), searchPage(), boxOf)).toBe(true)
  })

  it('does not flag a preview over the plain video that shares the Mix list=', () => {
    expect(isPreviewOfCollection(previewAt('0,300,360,200'), searchPage(), boxOf)).toBe(false)
  })

  it('does not flag a preview on a page with no collection tiles', () => {
    expect(isPreviewOfCollection(previewAt('0,0,360,200'), fragment(MUSIC_VIDEO), boxOf)).toBe(false)
  })

  it('does not flag a hidden preview (zero-size box)', () => {
    expect(isPreviewOfCollection(previewAt('0,0,0,0'), searchPage(), boxOf)).toBe(false)
  })
})
