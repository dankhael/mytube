// Shared types used across background, content script and the new tab page.

import { IconKey } from './category-icon'
import { AccentPreset, DEFAULT_ACCENT } from './theme'
import { Language, DEFAULT_LANGUAGE } from './i18n'

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
  language: Language // interface language; UI copy comes from src/i18n.ts
  // Watch-reminder toggles (spec watch-reminders / REMIND). Both opt-in: they
  // deliver the old new-tab reminder value WITHOUT claiming the new tab.
  openHomeOnStartup: boolean // open the home in one tab when the browser launches
  remindOnYoutubeHome: boolean // dismissible nudge on the YouTube home page
}

export const DEFAULT_SETTINGS: Settings = {
  soundEffects: false, // opt-in: no surprise audio on first install
  accent: DEFAULT_ACCENT, // preserves the original look (--accent-h: 290)
  language: DEFAULT_LANGUAGE, // English-first; pt-BR is opt-in (spec I18N-1)
  openHomeOnStartup: false, // off by default: a fresh install opens no surprise tab (REMIND-1)
  remindOnYoutubeHome: false, // off by default: no banner until the user opts in (REMIND-1)
}

export interface StorageData {
  categories: Category[] // category order
  videos: Video[]
  settings: Settings
}

// Sentinel category the reducer moves orphaned videos into. English-first to
// match the default install (Decisions §3); existing pt-BR installs keep their
// stored "Sem categoria" — renaming their data is out of scope (spec I18N).
export const UNCATEGORIZED = 'Uncategorized'

export const DEFAULT_DATA: StorageData = {
  categories: [
    { name: 'Tutorials', emoji: '🎓', icon: 'book' },
    { name: 'Entertainment', emoji: '🎭', icon: 'grid' },
    { name: UNCATEGORIZED, emoji: '📁', icon: 'inbox' },
  ],
  videos: [],
  settings: DEFAULT_SETTINGS,
}

// ---- Messaging contract ----

export type Message =
  | { action: 'SAVE_VIDEO'; video: Omit<Video, 'category' | 'addedAt' | 'watched'>; category: string }
  // Batch import (e.g. a whole YouTube playlist scraped by the content script).
  // Stored in a single read-modify-write so an N-item playlist is one commit,
  // not N races against the sync quota — see specs/playlist-import.spec.md (D5).
  | { action: 'IMPORT_VIDEOS'; videos: Omit<Video, 'category' | 'addedAt' | 'watched'>[]; category: string }
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
  // Opens the curated home in a new tab. Sent by the YouTube-home reminder nudge
  // (content script), which can't navigate the page to a chrome-extension:// URL
  // itself; the worker opens it via openHomeTab (spec watch-reminders, D3).
  | { action: 'OPEN_HOME' }

export interface SavedIdInfo {
  id: string
  category: string
}

export type MessageResponse =
  | { ok: true; data?: StorageData }
  | { ok: true; ids: SavedIdInfo[] }
  | { ok: false; error: string }
