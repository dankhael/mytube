// MyTube background service worker — owns storage mutations and the badge.

import { ChromeSyncBackend, isMyTubeKey } from '../src/storage-backend'
import { MyTubeStore, unwatchedCount } from '../src/storage'
import { createBackfillRunner } from '../src/backfill'
import { fetchVideoMetadata, needsEnrichment } from '../src/metadata'
import { validateIncomingMessage } from '../src/validate-message'
import { Message, MessageResponse, StorageData, Video } from '../src/types'

const store = new MyTubeStore(new ChromeSyncBackend())

// Module scope == one runner per service-worker session: its failure cache
// dies with the worker, so dead videos stop being re-fetched forever (M1)
// but get one fresh attempt after the next worker restart.
const backfill = createBackfillRunner({ store, fetchMetadata: fetchVideoMetadata })

type SavePayload = Omit<Video, 'category' | 'addedAt' | 'watched'>

// Fill missing title/channel from oEmbed before storing (best-effort).
async function enrichOnSave(video: SavePayload): Promise<SavePayload> {
  if (!needsEnrichment(video)) return video
  const meta = await fetchVideoMetadata(video.id)
  if (!meta) return video
  return {
    ...video,
    title: meta.title || video.title,
    channelName: meta.channelName || video.channelName,
  }
}

async function updateBadge(data?: StorageData): Promise<void> {
  const d = data ?? (await store.getData())
  const count = unwatchedCount(d)
  await chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' })
  await chrome.action.setBadgeBackgroundColor({ color: '#FF0000' })
}

chrome.runtime.onInstalled.addListener(() => {
  updateBadge()
  void backfill.run()
})

chrome.runtime.onStartup.addListener(() => {
  updateBadge()
  void backfill.run()
})

// Keep the badge in sync if storage changes from another context (e.g. new tab).
// The snapshot is sharded across many mytube:* keys (finding R1) and a multi-key
// set fires onChanged per key, so re-read the whole snapshot through the store
// (which sanitizes, S6) rather than trusting any single key's newValue.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return
  if (!Object.keys(changes).some(isMyTubeKey)) return
  void updateBadge()
})

async function handle(incoming: Message): Promise<MessageResponse> {
  // Runtime trust boundary (finding S2): the sender runs inside youtube.com,
  // so the Message union is enforced here, not just at compile time.
  const verdict = validateIncomingMessage(incoming)
  if (!verdict.ok) return verdict
  const message = verdict.message
  try {
    switch (message.action) {
      case 'SAVE_VIDEO': {
        const enriched = await enrichOnSave(message.video)
        const data = await store.saveVideo(enriched, message.category)
        await updateBadge(data)
        return { ok: true, data }
      }
      case 'GET_ALL': {
        const data = await store.getData()
        // Fire-and-forget: the new tab updates live via storage.onChanged.
        void backfill.run()
        return { ok: true, data }
      }
      case 'DELETE_VIDEO':
        return { ok: true, data: await store.deleteVideo(message.id) }
      case 'MOVE_VIDEO':
        return { ok: true, data: await store.moveVideo(message.id, message.category) }
      case 'MARK_WATCHED':
        return { ok: true, data: await store.markWatched(message.id, message.watched) }
      case 'ADD_CATEGORY':
        return { ok: true, data: await store.addCategory(message.name, message.emoji, message.icon) }
      case 'UPDATE_CATEGORY':
        return {
          ok: true,
          data: await store.updateCategory(
            message.oldName,
            message.name,
            message.emoji,
            message.icon,
          ),
        }
      case 'DELETE_CATEGORY':
        return { ok: true, data: await store.deleteCategory(message.name, message.deleteVideos) }
      case 'REORDER_CATEGORIES':
        return { ok: true, data: await store.reorderCategories(message.order) }
      case 'REORDER_VIDEOS':
        return { ok: true, data: await store.reorderVideos(message.category, message.order) }
      case 'UPDATE_SETTINGS':
        return { ok: true, data: await store.updateSettings(message.settings) }
      case 'GET_SAVED_IDS': {
        const data = await store.getData()
        return { ok: true, ids: data.videos.map((v) => ({ id: v.id, category: v.category })) }
      }
      default:
        return { ok: false, error: 'Unknown action' }
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  handle(message).then(sendResponse)
  return true // keep the channel open for the async response
})
