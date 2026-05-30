// Shared types used across background, content script and the new tab page.

export interface Video {
  id: string // YouTube videoId
  title: string
  thumbnail: string // thumbnail URL (mqdefault.jpg)
  channelName: string
  category: string
  addedAt: number // timestamp
  watched: boolean
  watchedAt?: number
}

export interface Category {
  name: string
  emoji: string
}

// User preferences. New options should be added here with a default so that
// missing/unknown keys fall back gracefully (no schema migration needed).
export interface Settings {
  soundEffects: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  soundEffects: false, // opt-in: no surprise audio on first install
}

export interface StorageData {
  categories: Category[] // category order
  videos: Video[]
  settings: Settings
}

export const UNCATEGORIZED = 'Sem categoria'

export const DEFAULT_DATA: StorageData = {
  categories: [
    { name: 'Tutoriais', emoji: '🎓' },
    { name: 'Entretenimento', emoji: '🎭' },
    { name: UNCATEGORIZED, emoji: '📁' },
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
  | { action: 'ADD_CATEGORY'; name: string; emoji: string }
  | { action: 'UPDATE_CATEGORY'; oldName: string; name: string; emoji: string }
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
