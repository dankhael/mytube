// @vitest-environment jsdom
// Regression test: rows of the user's own playlists (classic
// ytd-playlist-video-renderer, with the drag handle) got no "+ Salvar" pill,
// while other people's playlists (yt-lockup-view-model rows) did — the classic
// renderer was never a save target. Live injection stays Manual acceptance.

import { describe, expect, it } from 'vitest'
import { findSaveTargets } from './card-selectors'
import { extractCard } from './extract-card'
import { isCollectionCard } from './collection-card'

const LIST = 'PLa1F2ddGya_-I9y1nXALrBqrZNdlUE012'

// Trimmed classic row: reorder handle, ytd-thumbnail link, #video-title, channel.
const OWNED_ROW = `<ytd-playlist-video-renderer><div id="reorder"></div>
  <ytd-thumbnail><a id="thumbnail" href="/watch?v=1y6smkh6c-0&amp;list=${LIST}&amp;index=1">t</a></ytd-thumbnail>
  <a id="video-title" title="Don't You Worry Child">Don't You Worry Child</a>
  <ytd-channel-name><a href="/@swedishhousemafia">Swedish House Mafia</a></ytd-channel-name>
  </ytd-playlist-video-renderer>`

function page(html: string): HTMLElement {
  const el = document.createElement('div')
  el.innerHTML = html
  return el
}

describe('card-selectors — findSaveTargets', () => {
  it('includes rows of an owned playlist (classic ytd-playlist-video-renderer)', () => {
    const [row] = findSaveTargets(page(OWNED_ROW))
    expect(row?.tagName.toLowerCase()).toBe('ytd-playlist-video-renderer')
  })

  it('reads an owned-playlist row as a saveable video, not a collection', () => {
    const [row] = findSaveTargets(page(OWNED_ROW))
    expect(extractCard(row)).toMatchObject({ id: '1y6smkh6c-0', title: "Don't You Worry Child", channelName: 'Swedish House Mafia' })
    expect(isCollectionCard(row)).toBe(false)
  })

  it('still includes the home, search, sidebar and lockup renderers', () => {
    const tags = ['ytd-rich-item-renderer', 'ytd-video-renderer', 'ytd-compact-video-renderer', 'yt-lockup-view-model']
    const found = findSaveTargets(page(tags.map((t) => `<${t}></${t}>`).join('')))
    expect(found.map((el) => el.tagName.toLowerCase())).toEqual(tags)
  })
})
