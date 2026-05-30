// MyTube background service worker — owns storage mutations and the badge.

import { ChromeSyncBackend } from '../src/storage-backend'
import { MyTubeStore, unwatchedCount } from '../src/storage'
import { Message, MessageResponse, StorageData } from '../src/types'

const store = new MyTubeStore(new ChromeSyncBackend())

async function updateBadge(data?: StorageData): Promise<void> {
  const d = data ?? (await store.getData())
  const count = unwatchedCount(d)
  await chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' })
  await chrome.action.setBadgeBackgroundColor({ color: '#FF0000' })
}

chrome.runtime.onInstalled.addListener(() => {
  updateBadge()
})

chrome.runtime.onStartup.addListener(() => {
  updateBadge()
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
        const data = await store.saveVideo(message.video, message.category)
        await updateBadge(data)
        return { ok: true, data }
      }
      case 'GET_ALL':
        return { ok: true, data: await store.getData() }
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
