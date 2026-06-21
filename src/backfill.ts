// One-shot metadata backfill, extracted from the service worker so the
// session-scoped failure cache (security review finding M1) is unit-testable.
// The worker keeps ONE runner at module scope: "session" == instance lifetime,
// so a video that later becomes public is retried after the next worker
// restart — the same eventual consistency the feature always had (ROB-6).

import { VideoMetadata, needsEnrichment } from './metadata'
import { MyTubeStore } from './storage'
import { Video } from './types'

export interface BackfillRunner {
  run(): Promise<void>
}

export interface BackfillDeps {
  store: MyTubeStore
  fetchMetadata: (id: string) => Promise<VideoMetadata | null>
}

interface MetadataUpdate {
  id: string
  title: string
  channelName: string
}

export function createBackfillRunner(deps: BackfillDeps): BackfillRunner {
  // Ids whose lookup failed this session — permanently-dead videos (private,
  // deleted, region-locked) must not be re-fetched on every GET_ALL (ROB-5).
  const failedThisSession = new Set<string>()
  let running = false

  async function collectUpdates(targets: Video[]): Promise<MetadataUpdate[]> {
    const updates: MetadataUpdate[] = []
    for (const video of targets) {
      const meta = await deps.fetchMetadata(video.id)
      if (meta && (meta.title || meta.channelName)) {
        updates.push({
          id: video.id,
          title: meta.title || video.title,
          channelName: meta.channelName || video.channelName,
        })
      } else {
        failedThisSession.add(video.id)
      }
    }
    return updates
  }

  async function run(): Promise<void> {
    if (running) return // a pass is already in flight — never double-fetch (ROB-7)
    running = true
    try {
      const data = await deps.store.getData()
      const targets = data.videos.filter((v) => needsEnrichment(v) && !failedThisSession.has(v.id))
      if (targets.length === 0) return
      const updates = await collectUpdates(targets)
      if (updates.length > 0) await deps.store.applyMetadata(updates)
    } finally {
      running = false
    }
  }

  return { run }
}
