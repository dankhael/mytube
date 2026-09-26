// @vitest-environment jsdom
// Regression test for "Import to MyTube" reporting "No videos found" on every
// playlist: YouTube replaced `ytd-playlist-video-renderer` rows with
// `yt-lockup-view-model`, and the importer only looked for the old tag. The
// live page stays Manual acceptance (IMPORT-DOM-4, IMPORT-DOM-7); this pins
// row discovery + scraping against fragments of both layouts.

import { describe, expect, it } from 'vitest'
import { findPlaylistRows, scrapePlaylistRows } from './playlist-rows'

const LIST = 'PLa1F2ddGya_-I9y1nXALrBqrZNdlUE012'

// Trimmed from the live playlist page (2026-09): thumbnail link with the
// duration badge, then the lockup metadata (h3 title link, channel text).
function lockupRow(id: string, title: string, list = LIST): string {
  const href = `/watch?v=${id}&amp;list=${list}&amp;index=1&amp;pp=iAQB`
  return `<yt-lockup-view-model class="ytLockupViewModelWrapper"><div class="ytLockupViewModelHost">
    <a href="${href}" class="ytLockupViewModelContentImage"><yt-thumbnail-view-model>
      <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg"><yt-thumbnail-bottom-overlay-view-model>
      <badge-shape class="ytBadgeShapeHost" aria-label="52 minutes, 1 second"><div class="ytBadgeShapeText">52:01</div></badge-shape>
      </yt-thumbnail-bottom-overlay-view-model></yt-thumbnail-view-model></a>
    <yt-lockup-metadata-view-model><h3 title="${title}"><a href="${href}" class="ytLockupMetadataViewModelTitle">
      <span>${title}</span></a></h3>
      <yt-content-metadata-view-model><div class="ytContentMetadataViewModelMetadataRow">
      <span class="ytContentMetadataViewModelMetadataText"><a href="/@BlenderOfficial">Blender</a></span></div>
      <div class="ytContentMetadataViewModelMetadataRow"><span class="ytContentMetadataViewModelMetadataText">10</span></div>
      </yt-content-metadata-view-model></yt-lockup-metadata-view-model></div></yt-lockup-view-model>`
}

// The previous layout (still what the importer was written against).
function legacyRow(id: string, title: string): string {
  return `<ytd-playlist-video-renderer><a id="thumbnail" href="/watch?v=${id}&amp;list=${LIST}&amp;index=2"></a>
    <a id="video-title" title="${title}">${title}</a>
    <ytd-channel-name><a href="/@x">Legacy Channel</a></ytd-channel-name></ytd-playlist-video-renderer>`
}

function page(html: string): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = html
  return root
}

describe('playlist-rows — findPlaylistRows', () => {
  it('finds the current yt-lockup-view-model rows', () => {
    const root = page(
      lockupRow('ZFhohXh1kcQ', 'Spinal Spline') + lockupRow('aqz-KE-bpKQ', 'Big Buck Bunny'),
    )
    expect(findPlaylistRows(root, LIST)).toHaveLength(2)
  })

  it('still finds the legacy ytd-playlist-video-renderer rows', () => {
    expect(findPlaylistRows(page(legacyRow('M7lc1UVf-VE', 'Old')), LIST)).toHaveLength(1)
  })

  it('ignores lockups that link into another list (recommendations on the same page)', () => {
    const root = page(
      lockupRow('ZFhohXh1kcQ', 'Row') + lockupRow('jNQXAC9IVRw', 'Elsewhere', 'PLother'),
    )
    expect(findPlaylistRows(root, LIST)).toHaveLength(1)
  })
})

describe('playlist-rows — scrapePlaylistRows', () => {
  it('reads id, title, channel and duration from a lockup row', () => {
    const [card] = scrapePlaylistRows(page(lockupRow('ZFhohXh1kcQ', 'The Spinal Spline')), LIST)
    expect(card).toMatchObject({
      id: 'ZFhohXh1kcQ',
      title: 'The Spinal Spline',
      channelName: 'Blender',
      duration: '52:01',
      thumbnail: 'https://i.ytimg.com/vi/ZFhohXh1kcQ/mqdefault.jpg',
    })
  })

  it('de-dupes a video listed twice and keeps first-seen order', () => {
    const root = page(
      lockupRow('ZFhohXh1kcQ', 'A') +
        lockupRow('aqz-KE-bpKQ', 'B') +
        lockupRow('ZFhohXh1kcQ', 'A again'),
    )
    expect(scrapePlaylistRows(root, LIST).map((card) => card.id)).toEqual([
      'ZFhohXh1kcQ',
      'aqz-KE-bpKQ',
    ])
  })

  it('skips a row without a readable video id instead of failing the import', () => {
    const broken = `<yt-lockup-view-model><a href="/watch?v=bad&amp;list=${LIST}"></a></yt-lockup-view-model>`
    const root = page(broken + lockupRow('aqz-KE-bpKQ', 'B'))
    expect(scrapePlaylistRows(root, LIST).map((card) => card.id)).toEqual(['aqz-KE-bpKQ'])
  })
})
