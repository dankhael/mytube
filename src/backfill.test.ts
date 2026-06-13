// Executable spec for specs/storage-robustness.spec.md (ROB-4..ROB-7).
// The backfill runner is extracted from the service worker so the session-
// scoped failure cache (finding M1) is testable: one runner instance == one
// worker session, so a worker restart naturally retries failed lookups.

import { describe, expect, it } from 'vitest'
import { FakeStorageBackend } from '../test/fake-storage'
import { createBackfillRunner } from './backfill'
import { MISSING_CHANNEL, MISSING_TITLE, VideoMetadata } from './metadata'
import { MyTubeStore } from './storage'
import { DEFAULT_SETTINGS, StorageData, Video } from './types'

// Named fake for the oEmbed lookup (CLAUDE.md: no inline stubs). `gate` lets
// ROB-7 hold the first run in flight while a second run is attempted.
class FakeMetadataFetch {
  calls: string[] = []
  private gate: Promise<void> | undefined

  constructor(private readonly results: Record<string, VideoMetadata | null>) {}

  holdUntil(gate: Promise<void>): void {
    this.gate = gate
  }

  lookup = async (id: string): Promise<VideoMetadata | null> => {
    this.calls.push(id)
    if (this.gate) await this.gate
    return this.results[id] ?? null
  }
}

function incompleteVideo(id: string): Video {
  return {
    id,
    title: MISSING_TITLE,
    thumbnail: 't',
    channelName: MISSING_CHANNEL,
    category: 'A',
    addedAt: 1,
    watched: false,
  }
}

function libraryWith(videos: Video[]): StorageData {
  return { categories: [{ name: 'A', emoji: '📁' }], videos, settings: { ...DEFAULT_SETTINGS } }
}

const COMPLETE: Video = {
  ...incompleteVideo('complete111'),
  title: 'Vídeo completo',
  channelName: 'Canal X',
}

describe('storage-robustness.spec — backfill runner', () => {
  it('ROB-4: one applyMetadata write fills recovered fields; null lookups update nothing', async () => {
    const backend = new FakeStorageBackend(
      libraryWith([incompleteVideo('recovers111'), incompleteVideo('deadvideo11'), COMPLETE]),
    )
    const fetch = new FakeMetadataFetch({
      recovers111: { title: 'Título real', channelName: 'Canal real' },
      deadvideo11: null,
    })
    const runner = createBackfillRunner({ store: new MyTubeStore(backend), fetchMetadata: fetch.lookup })

    await runner.run()

    const stored = backend.snapshot()!
    expect(stored.videos.find((v) => v.id === 'recovers111')).toMatchObject({
      title: 'Título real',
      channelName: 'Canal real',
    })
    expect(stored.videos.find((v) => v.id === 'deadvideo11')!.title).toBe(MISSING_TITLE)
    expect(fetch.calls).toEqual(['recovers111', 'deadvideo11']) // complete video never fetched
  })

  it('ROB-5: an id that failed earlier in the session is not fetched again', async () => {
    const backend = new FakeStorageBackend(libraryWith([incompleteVideo('deadvideo11')]))
    const fetch = new FakeMetadataFetch({ deadvideo11: null })
    const runner = createBackfillRunner({ store: new MyTubeStore(backend), fetchMetadata: fetch.lookup })

    await runner.run()
    await runner.run()

    expect(fetch.calls).toEqual(['deadvideo11'])
  })

  it('ROB-6: a fresh runner (new worker session) retries a previously-failed id', async () => {
    const backend = new FakeStorageBackend(libraryWith([incompleteVideo('deadvideo11')]))
    const fetch = new FakeMetadataFetch({ deadvideo11: null })
    const store = new MyTubeStore(backend)

    await createBackfillRunner({ store, fetchMetadata: fetch.lookup }).run()
    await createBackfillRunner({ store, fetchMetadata: fetch.lookup }).run()

    expect(fetch.calls).toEqual(['deadvideo11', 'deadvideo11'])
  })

  it('ROB-7: an overlapping run() does not start a second pass', async () => {
    const backend = new FakeStorageBackend(libraryWith([incompleteVideo('recovers111')]))
    const fetch = new FakeMetadataFetch({
      recovers111: { title: 'Título real', channelName: 'Canal real' },
    })
    let release!: () => void
    fetch.holdUntil(new Promise<void>((resolve) => (release = resolve)))
    const runner = createBackfillRunner({ store: new MyTubeStore(backend), fetchMetadata: fetch.lookup })

    const first = runner.run()
    // Let the first run reach its (gated) fetch before the overlapping call.
    await new Promise((resolve) => setTimeout(resolve, 0))
    await runner.run() // returns immediately: a pass is already in flight
    expect(fetch.calls).toEqual(['recovers111'])

    release()
    await first
  })
})
