// MyTube background service worker — owns storage mutations and the badge.

import { ChromeSyncBackend, isMyTubeKey } from '../src/storage-backend'
import { MyTubeStore, unwatchedCount } from '../src/storage'
import { createBackfillRunner } from '../src/backfill'
import { fetchVideoMetadata, needsEnrichment } from '../src/metadata'
import { validateIncomingMessage } from '../src/validate-message'
import { accentLogoSvg } from '../src/logo-svg'
import { detectLanguage, DEFAULT_LANGUAGE } from '../src/i18n'
import { openHomeTab, OPEN_HOME_COMMAND } from '../src/home-page'
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

// Last accent painted onto the toolbar icon, so a storage change that didn't
// touch the accent (e.g. saving a video) skips the rasterize.
let paintedAccent: string | null = null

// Rasterize the accent mark to ImageData. OffscreenCanvas + createImageBitmap are
// the only canvas primitives available in an MV3 worker (no DOM). The SVG carries
// an intrinsic 256² size so the bitmap has dimensions to scale from.
async function rasterizeIcon(svg: string, size: number): Promise<ImageData> {
  const bitmap = await createImageBitmap(new Blob([svg], { type: 'image/svg+xml' }), {
    resizeWidth: size,
    resizeHeight: size,
    resizeQuality: 'high',
  })
  const canvas = new OffscreenCanvas(size, size)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error(`OffscreenCanvas 2d context unavailable for size ${size}`)
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  return ctx.getImageData(0, 0, size, size)
}

// Recolor the toolbar icon to match the chosen accent (THEME-11). Best-effort:
// if rasterization isn't available the manifest PNG stays in place, so the icon
// is never left blank.
async function repaintIcon(accent: string): Promise<void> {
  if (accent === paintedAccent) return
  try {
    const svg = accentLogoSvg(accent)
    const imageData = {
      16: await rasterizeIcon(svg, 16),
      32: await rasterizeIcon(svg, 32),
      48: await rasterizeIcon(svg, 48),
    }
    await chrome.action.setIcon({ imageData })
    paintedAccent = accent
  } catch {
    // Leave the manifest default icon if the canvas/bitmap path is unavailable.
  }
}

// Single read drives both the badge count and the icon accent.
async function refreshAction(): Promise<void> {
  const data = await store.getData()
  await updateBadge(data)
  await repaintIcon(data.settings.accent)
}

// On first install, seed the interface language from the browser locale so a
// pt-BR browser starts in Portuguese (Decisions §1). Only runs on 'install'
// (never on update/chrome_update) and only when the stored value is still the
// untouched default, so it never overrides a user's explicit pick.
async function seedLanguageOnInstall(): Promise<void> {
  const detected = detectLanguage(navigator.language)
  if (detected === DEFAULT_LANGUAGE) return
  const data = await store.getData()
  if (data.settings.language === DEFAULT_LANGUAGE) {
    await store.updateSettings({ language: detected })
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') void seedLanguageOnInstall()
  void refreshAction()
  void backfill.run()
})

chrome.runtime.onStartup.addListener(() => {
  void refreshAction()
  void backfill.run()
})

// Keyboard shortcut to open the curated home (commands.open_home). The home is a
// packaged page, not a new-tab override, so it has to be opened explicitly.
chrome.commands.onCommand.addListener((command) => {
  if (command === OPEN_HOME_COMMAND) openHomeTab()
})

// Keep the badge + icon in sync if storage changes from another context (e.g. new
// tab or the popup accent picker). The snapshot is sharded across many mytube:*
// keys (finding R1) and a multi-key set fires onChanged per key, so re-read the
// whole snapshot through the store (which sanitizes, S6) rather than trusting any
// single key's newValue.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return
  if (!Object.keys(changes).some(isMyTubeKey)) return
  void refreshAction()
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
