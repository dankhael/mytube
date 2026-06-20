// @vitest-environment jsdom
// Executable spec for specs/channel-avatar.spec.md (AVATAR-5..AVATAR-7): the
// home card shows the saved channel photo when present and otherwise (or on a
// failed load) falls back to the initial-letter avatar.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { Video } from '../../src/types'
import { VideoCardView } from './VideoCard'

afterEach(cleanup)

const AVATAR = 'https://yt3.ggpht.com/ytc/abc=s88-c-k-c0x00ffffff-no-rj'

function makeVideo(overrides: Partial<Video> = {}): Video {
  return {
    id: 'dQw4w9WgXcQ',
    title: 'Vídeo real',
    thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
    channelName: 'Canal X',
    category: 'Tutoriais',
    addedAt: 1_700_000_000_000,
    watched: false,
    ...overrides,
  }
}

const noop = vi.fn()

function renderCard(video: Video) {
  return render(
    <VideoCardView
      video={video}
      onOpen={noop}
      onMove={noop}
      onToggleWatched={noop}
      onDelete={noop}
    />,
  )
}

describe('channel-avatar.spec — VideoCard avatar', () => {
  it('AVATAR-5: renders the channel photo when channelThumbnail is present', () => {
    const { container } = renderCard(makeVideo({ channelThumbnail: AVATAR }))
    const img = container.querySelector<HTMLImageElement>('.avatar-img')
    expect(img).not.toBeNull()
    expect(img!.getAttribute('src')).toBe(AVATAR)
    expect(img!.getAttribute('alt')).toBe('Canal X')
  })

  it('AVATAR-6: renders the initial-letter avatar when channelThumbnail is absent', () => {
    const { container } = renderCard(makeVideo())
    expect(container.querySelector('.avatar-img')).toBeNull()
    const avatar = container.querySelector('.avatar')
    expect(avatar?.textContent).toBe('C')
  })

  it('AVATAR-7: falls back to the initial when the avatar image fails to load', () => {
    const { container } = renderCard(makeVideo({ channelThumbnail: AVATAR }))
    const img = container.querySelector<HTMLImageElement>('.avatar-img')!
    fireEvent.error(img)
    expect(container.querySelector('.avatar-img')).toBeNull()
    const avatar = container.querySelector('.avatar')
    expect(avatar?.textContent).toBe('C')
  })
})
