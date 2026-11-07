// specs/localized-default-categories.spec.md — seeding the shipped default
// categories in the interface language on first install (DEFCAT-1…3), and the
// reducer's fallback bucket staying language-agnostic (DEFCAT-5).

import { describe, expect, it } from 'vitest'
import { FakeStorageBackend } from '../test/fake-storage'
import { localizeDefaultCategories, seedInstallLanguage } from './default-categories'
import { MyTubeStore } from './storage'
import { DEFAULT_DATA, DEFAULT_SETTINGS, UNCATEGORIZED } from './types'

const video = { id: 'aqz-KE-bpKQ', title: 'Big Buck Bunny', thumbnail: 't', channelName: 'Blender' }

async function freshStore() {
  const backend = new FakeStorageBackend()
  const store = new MyTubeStore(backend)
  await store.getData() // materializes the defaults, like a first open
  return { backend, store }
}

describe('localized-default-categories.spec', () => {
  it('DEFCAT-1: a fresh pt-BR install renames the untouched defaults, keeping icons and order', async () => {
    const { store } = await freshStore()
    await localizeDefaultCategories(store, 'pt-BR')

    const { categories } = await store.getData()
    expect(categories.map((c) => c.name)).toEqual(['Tutoriais', 'Entretenimento', UNCATEGORIZED])
    expect(categories.map((c) => c.icon)).toEqual(DEFAULT_DATA.categories.map((c) => c.icon))
  })

  it('DEFCAT-2: an English install leaves the defaults alone and writes nothing', async () => {
    const { backend, store } = await freshStore()
    const writesBefore = backend.writeCount
    await localizeDefaultCategories(store, 'en')

    expect((await store.getData()).categories.map((c) => c.name)).toEqual([
      'Tutorials',
      'Entertainment',
      UNCATEGORIZED,
    ])
    expect(backend.writeCount).toBe(writesBefore)
  })

  it('DEFCAT-3: a library that already has videos is never renamed (synced / reinstalled)', async () => {
    const { store } = await freshStore()
    await store.saveVideo(video, 'Tutorials')
    await localizeDefaultCategories(store, 'pt-BR')

    const data = await store.getData()
    expect(data.categories.map((c) => c.name)).toContain('Tutorials')
    expect(data.videos[0].category).toBe('Tutorials')
  })

  it('DEFCAT-3: defaults the user renamed or extended are left alone', async () => {
    const { store } = await freshStore()
    await store.addCategory('Music', '🎵', 'music')
    await localizeDefaultCategories(store, 'pt-BR')

    expect((await store.getData()).categories.map((c) => c.name)).toEqual([
      'Tutorials',
      'Entertainment',
      UNCATEGORIZED,
      'Music',
    ])
  })

  it('DEFCAT-5: deleting a category with "keep videos" still uses the stored Uncategorized key in pt-BR', async () => {
    const { store } = await freshStore()
    await localizeDefaultCategories(store, 'pt-BR')
    await store.saveVideo(video, 'Tutoriais')
    await store.deleteCategory('Tutoriais', false)

    expect((await store.getData()).videos[0].category).toBe(UNCATEGORIZED)
  })
})

describe('seedInstallLanguage', () => {
  it('DEFCAT-1: a first install on a pt-BR browser seeds the language and the names', async () => {
    const { store } = await freshStore()
    await seedInstallLanguage(store, 'pt-BR')

    const data = await store.getData()
    expect(data.settings.language).toBe('pt-BR')
    expect(data.categories[0].name).toBe('Tutoriais')
  })

  it('DEFCAT-2: a first install on an English browser writes nothing', async () => {
    const { backend, store } = await freshStore()
    await seedInstallLanguage(store, 'en')
    expect(backend.writeCount).toBe(0)
  })

  // 'en' is also the default, so a stored 'en' can be the user's own choice. It
  // would be rewritten for every synced device.
  it('regression: a reinstall on a pt-BR browser keeps a stored English library', async () => {
    const backend = new FakeStorageBackend({
      ...structuredClone(DEFAULT_DATA),
      settings: { ...DEFAULT_SETTINGS, language: 'en' },
    })
    await seedInstallLanguage(new MyTubeStore(backend), 'pt-BR')

    expect(backend.writeCount).toBe(0)
    expect(backend.snapshot()!.settings.language).toBe('en')
  })
})
