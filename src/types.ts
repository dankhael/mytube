// Shared types used across background, content script and the new tab page.

import { IconKey } from './category-icon'
import { AccentPreset, DEFAULT_ACCENT } from './theme'

export interface Video {
  id: string // YouTube videoId
  title: string
  thumbnail: string // thumbnail URL (mqdefault.jpg)
  channelName: string
  // Channel avatar URL captured from the YouTube DOM at save time. Optional:
  // there is no deterministic per-videoId avatar URL (oEmbed returns none), so
  // many cards have none and old saves predate this field — the home card falls
  // back to the initial-letter avatar. Host-gated on save/read (see channel-avatar).
  channelThumbnail?: string
  category: string
  addedAt: number // timestamp
  watched: boolean
  watchedAt?: number
}

export interface Category {
  name: string
  emoji: string // legacy: kept for back-compat, no longer displayed (see HICON spec)
  icon?: IconKey // chosen tile icon; when unset the name auto-maps (resolveCategoryIcon)
}

// User preferences. New options should be added here with a default so that
// missing/unknown keys fall back gracefully (no schema migration needed).
export interface Settings {
  soundEffects: boolean
  accent: AccentPreset // accent color; applied via --accent-h (see src/theme.ts)
}

export const DEFAULT_SETTINGS: Settings = {
  soundEffects: false, // opt-in: no surprise audio on first install
  accent: DEFAULT_ACCENT, // preserves the original look (--accent-h: 290)
}

export interface StorageData {
  categories: Category[] // category order
  videos: Video[]
  settings: Settings
}

export const UNCATEGORIZED = 'Sem categoria'

export const DEFAULT_DATA: StorageData = {
  categories: [
    { name: 'Tutoriais', emoji: '🎓', icon: 'book' },
    { name: 'Entretenimento', emoji: '🎭', icon: 'grid' },
    { name: UNCATEGORIZED, emoji: '📁', icon: 'inbox' },
  ],
  videos: [],
  settings: DEFAULT_SETTINGS,
}

// ---- Messaging contract ----

export type Message =
  | { action: 'SAVE_VIDEO'; video: Omit<Video, 'category' | 'addedAt' | 'watched'>; category: string }
  | { action: 'GET_ALL' }
  | { action: 'DELETE_VIDEO'; id: string }
  | { action: 'MOVE_VIDEO'; id: string; category: string }
  | { action: 'MARK_WATCHED'; id: string; watched: boolean }
  | { action: 'ADD_CATEGORY'; name: string; emoji: string; icon?: IconKey }
  | { action: 'UPDATE_CATEGORY'; oldName: string; name: string; emoji: string; icon?: IconKey }
  | { action: 'DELETE_CATEGORY'; name: string; deleteVideos: boolean }
  | { action: 'REORDER_CATEGORIES'; order: string[] }
  | { action: 'REORDER_VIDEOS'; category: string; order: string[] }
  | { action: 'GET_SAVED_IDS' }
  | { action: 'UPDATE_SETTINGS'; settings: Partial<Settings> }

export interface SavedIdInfo {
  id: string
  category: string
}

export type MessageResponse =
  | { ok: true; data?: StorageData }
  | { ok: true; ids: SavedIdInfo[] }
  | { ok: false; error: string }
