// @vitest-environment jsdom
// Executable spec for specs/channel-avatar.spec.md (AVATAR-5..AVATAR-7): the
// home card shows the saved channel photo when present and otherwise (or on a
// failed load) falls back to the initial-letter avatar.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { Video } from '../../src/types'
import { CardActions, VideoCardView } from './VideoCard'

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

describe('card-menu-clip.spec — context menu placement', () => {
  // Renders with fresh per-test handlers so call assertions are isolated.
  function renderWithHandlers(video: Video, handlers: Partial<CardActions> = {}) {
    const onOpen = handlers.onOpen ?? vi.fn()
    const onMove = handlers.onMove ?? vi.fn()
    const onToggleWatched = handlers.onToggleWatched ?? vi.fn()
    const onDelete = handlers.onDelete ?? vi.fn()
    const view = render(
      <VideoCardView
        video={video}
        onOpen={onOpen}
        onMove={onMove}
        onToggleWatched={onToggleWatched}
        onDelete={onDelete}
      />,
    )
    return { ...view, onOpen, onMove, onToggleWatched, onDelete }
  }

  function openMenu(container: HTMLElement) {
    const card = container.querySelector('.vcard') as HTMLElement
    fireEvent.contextMenu(card)
    return container.querySelector('.vmenu') as HTMLElement
  }

  it('MENU-1: open menu is not a descendant of the overflow:hidden thumb', () => {
    const { container } = renderWithHandlers(makeVideo())
    const menu = openMenu(container)
    expect(menu).not.toBeNull()
    // The clip cause: a .vmenu nested under .vthumb is cut off. It must hang off
    // the non-clipping .vcard instead.
    expect(container.querySelector('.vthumb .vmenu')).toBeNull()
    expect(menu.parentElement).toBe(container.querySelector('.vcard'))
  })

  it('MENU-2: renders all three items in order', () => {
    const { container } = renderWithHandlers(makeVideo())
    const menu = openMenu(container)
    const labels = within(menu)
      .getAllByRole('button')
      .map((b) => b.textContent?.trim())
    expect(labels).toEqual([
      'Move to…',
      'Mark as watched',
      'Remove',
    ])
  })

  it('MENU-3: clicking Remover fires onDelete with the id and closes the menu', () => {
    const { container, onDelete } = renderWithHandlers(makeVideo())
    const menu = openMenu(container)
    fireEvent.click(within(menu).getByText('Remove'))
    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith('dQw4w9WgXcQ')
    expect(container.querySelector('.vmenu')).toBeNull()
  })

  it('MENU-4: clicking Mover para… fires onMove and closes the menu', () => {
    const video = makeVideo()
    const { container, onMove } = renderWithHandlers(video)
    const menu = openMenu(container)
    fireEvent.click(within(menu).getByText('Move to…'))
    expect(onMove).toHaveBeenCalledTimes(1)
    expect(onMove).toHaveBeenCalledWith(video)
    expect(container.querySelector('.vmenu')).toBeNull()
  })

  it('MENU-5: no menu in the DOM until it is opened', () => {
    const { container } = renderWithHandlers(makeVideo())
    expect(container.querySelector('.vmenu')).toBeNull()
  })
})
