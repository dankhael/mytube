// MyTube background service worker — owns storage mutations and the badge.

import { ChromeSyncBackend } from '../src/storage-backend'
import { MyTubeStore, unwatchedCount } from '../src/storage'
import { fetchVideoMetadata, needsEnrichment } from '../src/metadata'
import { Message, MessageResponse, StorageData, Video } from '../src/types'

const store = new MyTubeStore(new ChromeSyncBackend())

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

// One-shot pass over already-saved videos that were scraped incompletely.
let backfilling = false
async function backfillMetadata(): Promise<void> {
  if (backfilling) return
  backfilling = true
  try {
    const data = await store.getData()
    const targets = data.videos.filter(needsEnrichment)
    if (targets.length === 0) return

    const updates: { id: string; title: string; channelName: string }[] = []
    for (const v of targets) {
      const meta = await fetchVideoMetadata(v.id)
      if (meta && (meta.title || meta.channelName)) {
        updates.push({
          id: v.id,
          title: meta.title || v.title,
          channelName: meta.channelName || v.channelName,
        })
      }
    }
    if (updates.length > 0) await store.applyMetadata(updates)
  } finally {
    backfilling = false
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
  backfillMetadata()
})

chrome.runtime.onStartup.addListener(() => {
  updateBadge()
  backfillMetadata()
})

// Keep the badge in sync if storage changes from another context (e.g. new tab).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.mytube) {
    updateBadge(changes.mytube.newValue as StorageData)
  }
})

async function handle(message: Message): Promise<MessageResponse> {
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
        void backfillMetadata()
        return { ok: true, data }
      }
      case 'DELETE_VIDEO':
        return { ok: true, data: await store.deleteVideo(message.id) }
      case 'MOVE_VIDEO':
        return { ok: true, data: await store.moveVideo(message.id, message.category) }
      case 'MARK_WATCHED':
        return { ok: true, data: await store.markWatched(message.id, message.watched) }
      case 'ADD_CATEGORY':
        return { ok: true, data: await store.addCategory(message.name, message.emoji) }
      case 'UPDATE_CATEGORY':
        return {
          ok: true,
          data: await store.updateCategory(message.oldName, message.name, message.emoji),
        }
      case 'DELETE_CATEGORY':
        return { ok: true, data: await store.deleteCategory(message.name, message.deleteVideos) }
      case 'REORDER_CATEGORIES':
        return { ok: true, data: await store.reorderCategories(message.order) }
      case 'REORDER_VIDEOS':
        return { ok: true, data: await store.reorderVideos(message.category, message.order) }
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
