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

  it('ROB-3: a backend write rejection propagates and leaves the snapshot unchanged', async () => {
    const backend = new FakeStorageBackend(seed([{ name: 'A', emoji: '📁' }], [vid('x', 'A')]))
    const store = new MyTubeStore(backend)
    backend.failNextWrite(new Error('QUOTA_BYTES_PER_ITEM quota exceeded'))
    await expect(store.deleteVideo('x')).rejects.toThrow('QUOTA_BYTES_PER_ITEM')
    expect(backend.snapshot()!.videos.map((v) => v.id)).toEqual(['x'])
  })

  it('ROB-8: two un-awaited mutations both land in the final snapshot', async () => {
    const backend = new FakeStorageBackend(seed([{ name: 'A', emoji: '📁' }], []))
    backend.delayReads(10) // widen the read-modify-write window
    const store = new MyTubeStore(backend)

    await Promise.all([
      store.saveVideo({ ...VIDEO, id: 'aaaaaaaaaaa' }, 'A'),
      store.saveVideo({ ...VIDEO, id: 'bbbbbbbbbbb' }, 'A'),
    ])

    const ids = backend.snapshot()!.videos.map((v) => v.id).sort()
    expect(ids).toEqual(['aaaaaaaaaaa', 'bbbbbbbbbbb'])
  })

  it('ROB-9: a failed write rejects its caller but does not wedge the queue', async () => {
    const backend = new FakeStorageBackend(seed([{ name: 'A', emoji: '📁' }], [vid('x', 'A')]))
    const store = new MyTubeStore(backend)

    backend.failNextWrite(new Error('sync is sad'))
    await expect(store.deleteVideo('x')).rejects.toThrow('sync is sad')

    const data = await store.markWatched('x', true)
    expect(data.videos[0].watched).toBe(true)
    expect(backend.snapshot()!.videos[0].watched).toBe(true)
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

describe('playlist-import.spec', () => {
  const v1 = { id: 'aaaaaaaaaaa', title: 'A', thumbnail: 't', channelName: 'C' }
  const v2 = { id: 'bbbbbbbbbbb', title: 'B', thumbnail: 't', channelName: 'C' }
  const v3 = { id: 'ccccccccccc', title: 'D', thumbnail: 't', channelName: 'C' }

  it('IMPORT-1: a batch is stored with category/addedAt/watched in a single write', async () => {
    const backend = new FakeStorageBackend(seed([], []))
    const store = new MyTubeStore(backend)
    const data = await store.importVideos([v1, v2, v3], 'Música')
    expect(data.videos).toHaveLength(3)
    for (const v of data.videos) {
      expect(v.category).toBe('Música')
      expect(v.watched).toBe(false)
      expect(typeof v.addedAt).toBe('number')
    }
    expect(backend.writeCount).toBe(1)
  })

  it('IMPORT-2: importing into an unknown category creates it once', async () => {
    const backend = new FakeStorageBackend(seed([{ name: 'A', emoji: '📁' }], []))
    const store = new MyTubeStore(backend)
    const data = await store.importVideos([v1], 'Música')
    expect(data.categories.filter((c) => c.name === 'Música')).toHaveLength(1)
    expect(data.videos[0].category).toBe('Música')
  })

  it('IMPORT-3: re-importing a saved video moves it, preserving addedAt/watched', async () => {
    const existing: Video = { ...v1, category: 'A', addedAt: 42, watched: true, watchedAt: 7 }
    const backend = new FakeStorageBackend(
      seed([{ name: 'A', emoji: '📁' }, { name: 'B', emoji: '📁' }], [existing]),
    )
    const store = new MyTubeStore(backend)
    const data = await store.importVideos([v1], 'B')
    expect(data.videos.filter((v) => v.id === v1.id)).toHaveLength(1)
    expect(data.videos[0]).toMatchObject({ category: 'B', addedAt: 42, watched: true })
  })

  it('IMPORT-4: imported videos are prepended in the given array order', async () => {
    const store = new MyTubeStore(new FakeStorageBackend(seed([], [])))
    const data = await store.importVideos([v1, v2, v3], 'C')
    expect(data.videos.map((v) => v.id)).toEqual([v1.id, v2.id, v3.id])
  })

  it('IMPORT-5: a duplicate id within one payload collapses to a single entry', async () => {
    const store = new MyTubeStore(new FakeStorageBackend(seed([], [])))
    const dup = { ...v1, title: 'newer' }
    const data = await store.importVideos([v1, dup], 'C')
    const matches = data.videos.filter((v) => v.id === v1.id)
    expect(matches).toHaveLength(1)
    expect(matches[0].title).toBe('newer') // later occurrence wins
  })

  it('IMPORT-6: importing an empty list is a no-op (no category, no write)', async () => {
    const backend = new FakeStorageBackend(seed([{ name: 'A', emoji: '📁' }], [vid('x', 'A')]))
    const store = new MyTubeStore(backend)
    const data = await store.importVideos([], 'C')
    expect(data.videos.map((v) => v.id)).toEqual(['x'])
    expect(data.categories.map((c) => c.name)).toEqual(['A'])
    expect(backend.writeCount).toBe(0)
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

  it('REMIND-4: updating one reminder toggle leaves the other settings untouched', async () => {
    const backend = new FakeStorageBackend()
    const store = new MyTubeStore(backend)
    await store.updateSettings({ openHomeOnStartup: true })
    const persisted = await new MyTubeStore(backend).getData()
    expect(persisted.settings.openHomeOnStartup).toBe(true)
    // The partial patch must not flip the sibling toggle or the other prefs.
    expect(persisted.settings.remindOnYoutubeHome).toBe(false)
    expect(persisted.settings.soundEffects).toBe(false)
  })
})
