// Executable spec for the MyTubeStore reducer. Each test names the acceptance
// criterion ID it proves (see specs/*.spec.md) so spec ↔ test stay traceable.

import { beforeEach, describe, expect, it } from 'vitest'
import { FakeStorageBackend } from '../test/fake-storage'
import { MyTubeStore, unwatchedCount } from './storage'
import { Category, DEFAULT_SETTINGS, StorageData, UNCATEGORIZED, Video } from './types'

const VIDEO = { id: 'aaaaaaaaaaa', title: 'A', thumbnail: 't', channelName: 'C' }

function seed(categories: Category[], videos: Video[]): StorageData {
  return { categories, videos, settings: { ...DEFAULT_SETTINGS } }
}

function vid(id: string, category: string, watched = false): Video {
  return { id, title: id, thumbnail: 't', channelName: 'C', category, addedAt: 1, watched }
}

describe('save-video.spec', () => {
  let backend: FakeStorageBackend
  let store: MyTubeStore
  beforeEach(() => {
    backend = new FakeStorageBackend(seed([{ name: 'Tutoriais', emoji: '🎓' }], []))
    store = new MyTubeStore(backend)
  })

  it('SAVE-1: a new video is prepended with watched=false and a numeric addedAt', async () => {
    const data = await store.saveVideo(VIDEO, 'Tutoriais')
    expect(data.videos[0]).toMatchObject({ id: VIDEO.id, category: 'Tutoriais', watched: false })
    expect(typeof data.videos[0].addedAt).toBe('number')
  })

  it('SAVE-2: saving into an unknown category creates it with the default emoji', async () => {
    const data = await store.saveVideo(VIDEO, 'Nova')
    expect(data.categories.some((c) => c.name === 'Nova' && c.emoji === '📁')).toBe(true)
    expect(data.videos[0].category).toBe('Nova')
  })

  it('SAVE-3: re-saving a video moves it instead of duplicating', async () => {
    await store.saveVideo(VIDEO, 'Tutoriais')
    const data = await store.saveVideo(VIDEO, 'Outra')
    expect(data.videos.filter((v) => v.id === VIDEO.id)).toHaveLength(1)
    expect(data.videos[0].category).toBe('Outra')
  })

  it('DELETE-1: deleting a video removes only that id', async () => {
    backend = new FakeStorageBackend(seed([{ name: 'A', emoji: '📁' }], [vid('x', 'A'), vid('y', 'A')]))
    store = new MyTubeStore(backend)
    const data = await store.deleteVideo('x')
    expect(data.videos.map((v) => v.id)).toEqual(['y'])
  })

  it('MOVE-1: moving a video only changes its category', async () => {
    backend = new FakeStorageBackend(seed([{ name: 'A', emoji: '📁' }, { name: 'B', emoji: '📁' }], [vid('x', 'A')]))
    store = new MyTubeStore(backend)
    const data = await store.moveVideo('x', 'B')
    expect(data.videos[0].category).toBe('B')
  })

  it('META-3: applyMetadata updates only the listed videos', async () => {
    backend = new FakeStorageBackend(
      seed([{ name: 'A', emoji: '📁' }], [vid('x', 'A'), vid('y', 'A')]),
    )
    store = new MyTubeStore(backend)
    const data = await store.applyMetadata([{ id: 'x', title: 'Título real', channelName: 'Canal real' }])
    const x = data.videos.find((v) => v.id === 'x')!
    const y = data.videos.find((v) => v.id === 'y')!
    expect(x).toMatchObject({ title: 'Título real', channelName: 'Canal real' })
    expect(y.title).toBe('y') // untouched
  })

  it('REORDER-VID-1: reordering a category keeps other categories intact', async () => {
    backend = new FakeStorageBackend(
      seed([{ name: 'A', emoji: '📁' }, { name: 'B', emoji: '📁' }], [
        vid('a', 'A'),
        vid('b', 'A'),
        vid('c', 'A'),
        vid('z', 'B'),
      ]),
    )
    store = new MyTubeStore(backend)
    const data = await store.reorderVideos('A', ['c', 'a', 'b'])
    expect(data.videos.filter((v) => v.category === 'A').map((v) => v.id)).toEqual(['c', 'a', 'b'])
    expect(data.videos.filter((v) => v.category === 'B').map((v) => v.id)).toEqual(['z'])
  })
})

describe('categories.spec', () => {
  it('CAT-1: adding a duplicate category name is a no-op', async () => {
    const store = new MyTubeStore(new FakeStorageBackend(seed([], [])))
    await store.addCategory('Música', '🎵')
    const data = await store.addCategory('Música', '🎵')
    expect(data.categories.filter((c) => c.name === 'Música')).toHaveLength(1)
  })

  it('CAT-2: renaming a category repoints its videos', async () => {
    const store = new MyTubeStore(
      new FakeStorageBackend(seed([{ name: 'Tutoriais', emoji: '🎓' }], [vid('x', 'Tutoriais'), vid('y', 'Tutoriais')])),
    )
    const data = await store.updateCategory('Tutoriais', 'Estudos', '🎓')
    expect(data.categories.some((c) => c.name === 'Estudos')).toBe(true)
    expect(data.videos.every((v) => v.category === 'Estudos')).toBe(true)
  })

  it('HICON-6: addCategory persists the chosen icon', async () => {
    const store = new MyTubeStore(new FakeStorageBackend(seed([], [])))
    const data = await store.addCategory('Games', '📁', 'gamepad')
    expect(data.categories.find((c) => c.name === 'Games')?.icon).toBe('gamepad')
  })

  it('HICON-6: updateCategory changes the icon', async () => {
    const store = new MyTubeStore(
      new FakeStorageBackend(seed([{ name: 'Games', emoji: '📁', icon: 'gamepad' }], [])),
    )
    const data = await store.updateCategory('Games', 'Games', '📁', 'trophy')
    expect(data.categories.find((c) => c.name === 'Games')?.icon).toBe('trophy')
  })

  it('HICON-7: legacy categories without an icon load and update without error', async () => {
    // No `icon` key (pre-feature data) must still load and stay usable.
    const store = new MyTubeStore(new FakeStorageBackend(seed([{ name: 'Velha', emoji: '🎓' }], [])))
    const loaded = await store.getData()
    expect(loaded.categories[0].icon).toBeUndefined()
    const data = await store.updateCategory('Velha', 'Velha', '🎓', 'book')
    expect(data.categories[0].icon).toBe('book')
  })

  it('CAT-3: deleting a category (keep videos) moves them to "Sem categoria"', async () => {
    const store = new MyTubeStore(new FakeStorageBackend(seed([{ name: 'X', emoji: '📁' }], [vid('x', 'X')])))
    const data = await store.deleteCategory('X', false)
    expect(data.categories.some((c) => c.name === 'X')).toBe(false)
    expect(data.categories.some((c) => c.name === UNCATEGORIZED)).toBe(true)
    expect(data.videos[0].category).toBe(UNCATEGORIZED)
  })

  it('CAT-4: deleting a category (delete videos) removes them too', async () => {
    const store = new MyTubeStore(
      new FakeStorageBackend(seed([{ name: 'X', emoji: '📁' }], [vid('x', 'X'), vid('y', 'X')])),
    )
    const data = await store.deleteCategory('X', true)
    expect(data.categories.some((c) => c.name === 'X')).toBe(false)
    expect(data.videos).toHaveLength(0)
  })

  it('REORDER-CAT-1: omitted categories are kept at the end', async () => {
    const store = new MyTubeStore(
      new FakeStorageBackend(seed([{ name: 'A', emoji: '📁' }, { name: 'B', emoji: '📁' }, { name: 'C', emoji: '📁' }], [])),
    )
    const data = await store.reorderCategories(['C', 'A'])
    expect(data.categories.map((c) => c.name)).toEqual(['C', 'A', 'B'])
  })
})

describe('watched-quota.spec', () => {
  it('WATCH-1: marking watched sets watched + a numeric watchedAt', async () => {
    const store = new MyTubeStore(new FakeStorageBackend(seed([{ name: 'A', emoji: '📁' }], [vid('x', 'A')])))
    const data = await store.markWatched('x', true)
    expect(data.videos[0].watched).toBe(true)
    expect(typeof data.videos[0].watchedAt).toBe('number')
  })

  it('WATCH-2: un-marking clears watchedAt', async () => {
    const store = new MyTubeStore(new FakeStorageBackend(seed([{ name: 'A', emoji: '📁' }], [vid('x', 'A', true)])))
    const data = await store.markWatched('x', false)
    expect(data.videos[0].watched).toBe(false)
    expect(data.videos[0].watchedAt).toBeUndefined()
  })

  it('BADGE-1: unwatchedCount counts only unwatched videos', () => {
    const data = seed([], [vid('a', 'A'), vid('b', 'A', true), vid('c', 'A')])
    expect(unwatchedCount(data)).toBe(2)
  })

  it('QUOTA-1: getBytesInUse grows after saving a video', async () => {
    const backend = new FakeStorageBackend(seed([{ name: 'A', emoji: '📁' }], []))
    const store = new MyTubeStore(backend)
    const before = await store.getBytesInUse()
    await store.saveVideo(VIDEO, 'A')
    const after = await store.getBytesInUse()
    expect(after).toBeGreaterThan(before)
  })
})

describe('popup-config.spec (settings)', () => {
  it('CFG-9a: an empty store defaults to sound effects off', async () => {
    const store = new MyTubeStore(new FakeStorageBackend())
    const data = await store.getData()
    expect(data.settings.soundEffects).toBe(false)
  })

  it('CFG-8/9: updateSettings persists and merges over defaults', async () => {
    const backend = new FakeStorageBackend()
    const store = new MyTubeStore(backend)
    await store.updateSettings({ soundEffects: true })
    // re-read through a fresh store to prove it persisted, not just in memory
    const persisted = await new MyTubeStore(backend).getData()
    expect(persisted.settings.soundEffects).toBe(true)
  })
})
