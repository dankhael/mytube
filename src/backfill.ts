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

// Null when the lookup adds nothing. Writing anyway isn't harmless: every commit
// fires storage.onChanged, and its listeners run the backfill again.
function metadataUpdate(video: Video, meta: VideoMetadata | null): MetadataUpdate | null {
  if (!meta) return null
  const title = meta.title || video.title
  const channelName = meta.channelName || video.channelName
  if (title === video.title && channelName === video.channelName) return null
  return { id: video.id, title, channelName }
}

export function createBackfillRunner(deps: BackfillDeps): BackfillRunner {
  // Ids whose lookup failed this session — permanently-dead videos (private,
  // deleted, region-locked) must not be re-fetched on every GET_ALL (ROB-5).
  const failedThisSession = new Set<string>()
  let running = false

  async function collectUpdates(targets: Video[]): Promise<MetadataUpdate[]> {
    const updates: MetadataUpdate[] = []
    for (const video of targets) {
      const update = metadataUpdate(video, await deps.fetchMetadata(video.id))
      if (update) updates.push(update)
      // Judged on the result, not on whether a lookup answered: a video that stays
      // incomplete would come back on every GET_ALL. A real title equal to the
      // placeholder, or an answer with one field, is as final as a dead video.
      if (needsEnrichment(update ?? video)) failedThisSession.add(video.id)
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
