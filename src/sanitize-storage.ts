// Sanitizes raw `mytube` snapshots on read (security review finding S6).
// chrome.storage.sync is written by every synced device — other versions of
// this extension, future schemas, manual edits — so the `as StorageData` cast
// can never be trusted. Pure and read-only: it never writes back, the stored
// bytes stay untouched until the next legitimate mutation, and well-formed
// data passes through byte-identical (original references, original key order).

import { isIconKey } from './validate-message'
import { Category, DEFAULT_DATA, DEFAULT_SETTINGS, Settings, StorageData, Video } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStoredVideo(entry: unknown): entry is Video {
  if (!isRecord(entry)) return false
  return (
    typeof entry.id === 'string' &&
    typeof entry.title === 'string' &&
    typeof entry.thumbnail === 'string' &&
    typeof entry.channelName === 'string' &&
    typeof entry.category === 'string' &&
    typeof entry.addedAt === 'number' &&
    typeof entry.watched === 'boolean' &&
    (entry.watchedAt === undefined || typeof entry.watchedAt === 'number')
  )
}

function sanitizedVideos(value: unknown): Video[] {
  if (!Array.isArray(value)) return []
  return value.filter(isStoredVideo)
}

function isStoredCategory(entry: unknown): entry is Category {
  return isRecord(entry) && typeof entry.name === 'string' && typeof entry.emoji === 'string'
}

// An icon outside the closed set reads as unset, so the UI renders the same
// name-based fallback as a missing icon (SEC-17). Valid entries keep their
// original reference for the byte-identical pass-through (SEC-14).
function withGatedIcon(category: Category): Category {
  if (category.icon === undefined || isIconKey(category.icon)) return category
  const gated = { ...category }
  delete gated.icon
  return gated
}

function sanitizedCategories(value: unknown): Category[] {
  if (!Array.isArray(value)) return structuredClone(DEFAULT_DATA.categories)
  const kept = value.filter(isStoredCategory).map(withGatedIcon)
  return kept.length > 0 ? kept : structuredClone(DEFAULT_DATA.categories)
}

// Merge over defaults so options added after this snapshot was saved fall back
// gracefully — same contract getData always had (persistence-sync baseline).
function sanitizedSettings(value: unknown): Settings {
  if (!isRecord(value) || typeof value.soundEffects !== 'boolean') return { ...DEFAULT_SETTINGS }
  return { ...DEFAULT_SETTINGS, ...value }
}

// The top-level spread keeps unknown future fields and the stored key order, so
// a newer schema's data survives a round-trip through this older code (SEC-14).
export function sanitizeStorageData(raw: unknown): StorageData {
  if (!isRecord(raw)) return structuredClone(DEFAULT_DATA)
  return {
    ...raw,
    categories: sanitizedCategories(raw.categories),
    videos: sanitizedVideos(raw.videos),
    settings: sanitizedSettings(raw.settings),
  }
}
