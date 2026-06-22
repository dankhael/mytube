// Runtime enforcement of the compile-time Message contract (security review
// finding S2). The content script runs inside youtube.com, so anything on that
// page can craft runtime.sendMessage payloads — the service worker is the trust
// boundary and validates here, before its switch (see design in
// openspec/changes/harden-extension-security/design.md, decision 1).

import { ALL_ICONS, IconKey } from './category-icon'
import { Message } from './types'

export type ValidationResult = { ok: true; message: Message } | { ok: false; error: string }

const VIDEO_ID_SHAPE = /^[\w-]{11}$/

// Generous bound: real YouTube titles are ≤ 100 chars. Clamp — never reject —
// so a save can't fail on length while the sync quota stays protected (SEC-7).
export const MAX_TEXT_LENGTH = 300

export function isYoutubeVideoId(value: unknown): value is string {
  return typeof value === 'string' && VIDEO_ID_SHAPE.test(value)
}

// Stored thumbnails may only point at the canonical ytimg URL for the id; any
// other candidate is replaced, killing tracking-pixel/exfiltration URLs (SEC-4).
export function canonicalThumbnail(id: string, candidate: string): string {
  const canonical = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`
  return candidate === canonical ? candidate : canonical
}

// Channel avatars live at opaque Google host paths, so unlike the thumbnail they
// can't be canonicalized to one deterministic URL. We host-allowlist instead: an
// off-list / non-https URL is the same tracking-pixel / exfiltration vector SEC-4
// guards against, so it's dropped rather than stored. The CSP img-src
// (manifest.config.ts) MUST list the same hosts or the <img> won't load.
export const AVATAR_HOSTS: readonly string[] = [
  'yt3.ggpht.com',
  'yt3.googleusercontent.com',
  'lh3.googleusercontent.com',
]

export function isAllowedAvatarUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && AVATAR_HOSTS.includes(url.hostname)
  } catch {
    return false
  }
}

const ICON_KEYS: ReadonlySet<string> = new Set(ALL_ICONS)

export function isIconKey(value: unknown): value is IconKey {
  return typeof value === 'string' && ICON_KEYS.has(value)
}

export function clampText(value: string): string {
  return value.length <= MAX_TEXT_LENGTH ? value : value.slice(0, MAX_TEXT_LENGTH)
}

function rejectedId(id: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error: `Invalid video id: ${JSON.stringify(id)} — expected an 11-char id matching /^[\\w-]{11}$/`,
  }
}

// Unknown icons read as unset so the UI falls back exactly like a missing icon.
function gatedIcon(icon: unknown): IconKey | undefined {
  return isIconKey(icon) ? icon : undefined
}

// The save-shaped payload carried by SAVE_VIDEO and each IMPORT_VIDEOS entry.
type VideoPayload = Extract<Message, { action: 'SAVE_VIDEO' }>['video']

// Sanitize one incoming video the same way for single-save and batch-import:
// canonical thumbnail, clamped text, host-gated avatar. Returns null when the id
// is malformed so the caller decides (SAVE rejects; IMPORT drops the entry).
function gateVideo(video: VideoPayload): VideoPayload | null {
  if (!isYoutubeVideoId(video.id)) return null
  return {
    ...video,
    title: clampText(video.title),
    thumbnail: canonicalThumbnail(video.id, video.thumbnail),
    channelName: clampText(video.channelName),
    // Keep the avatar only if it's an https URL on an allowlisted host;
    // anything else is dropped (undefined) without failing the save.
    channelThumbnail: isAllowedAvatarUrl(video.channelThumbnail) ? video.channelThumbnail : undefined,
  }
}

function validatedSaveVideo(message: Extract<Message, { action: 'SAVE_VIDEO' }>): ValidationResult {
  const gated = gateVideo(message.video)
  if (!gated) return rejectedId(message.video.id)
  return { ok: true, message: { ...message, category: clampText(message.category), video: gated } }
}

// Drop malformed entries instead of rejecting the whole batch: one garbage
// playlist row must never fail a 100-video import (IMPORT-7). An all-invalid
// payload resolves to an empty, harmless import (IMPORT-9).
function validatedImportVideos(
  message: Extract<Message, { action: 'IMPORT_VIDEOS' }>,
): ValidationResult {
  const videos = message.videos
    .map(gateVideo)
    .filter((v): v is VideoPayload => v !== null)
  return { ok: true, message: { ...message, category: clampText(message.category), videos } }
}

// Lookup-only fields (UPDATE_CATEGORY.oldName, DELETE_CATEGORY.name, REORDER_*
// arrays) are deliberately untouched — unknown values no-op in the reducer.
export function validateIncomingMessage(message: Message): ValidationResult {
  switch (message.action) {
    case 'SAVE_VIDEO':
      return validatedSaveVideo(message)
    case 'IMPORT_VIDEOS':
      return validatedImportVideos(message)
    case 'DELETE_VIDEO':
    case 'MARK_WATCHED':
      return isYoutubeVideoId(message.id) ? { ok: true, message } : rejectedId(message.id)
    case 'MOVE_VIDEO':
      if (!isYoutubeVideoId(message.id)) return rejectedId(message.id)
      return { ok: true, message: { ...message, category: clampText(message.category) } }
    case 'ADD_CATEGORY':
      return { ok: true, message: { ...message, name: clampText(message.name), icon: gatedIcon(message.icon) } }
    case 'UPDATE_CATEGORY':
      return { ok: true, message: { ...message, name: clampText(message.name), icon: gatedIcon(message.icon) } }
    default:
      return { ok: true, message }
  }
}
