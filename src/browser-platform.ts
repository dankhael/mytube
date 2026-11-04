// Native APIs live at this boundary. Access is lazy so importing domain modules
// in tests/build tools does not require an extension context. Firefox gets its
// own adapter when its runtime/build is actually validated.
import type { Message } from './types'

export interface MessageRuntime {
  readonly lastError?: { message?: string }
  sendMessage(message: Message, callback: (response: unknown) => void): void
}

export interface StorageChange {
  oldValue?: unknown
  newValue?: unknown
}

// Chromium types are confined to the native boundary; consumers request only
// the capabilities they use, with narrower injectable interfaces in domain code.
export interface BrowserPlatform {
  runtime: Pick<typeof chrome.runtime,
    'sendMessage' | 'lastError' | 'getURL' | 'onInstalled' | 'onStartup' | 'onMessage'>
  sync: chrome.storage.SyncStorageArea
  storageChanges: typeof chrome.storage.onChanged
  tabs: Pick<typeof chrome.tabs, 'create'>
  commands: Pick<typeof chrome.commands, 'getAll' | 'onCommand'>
  action: Pick<typeof chrome.action, 'setIcon' | 'setBadgeText' | 'setBadgeBackgroundColor'>
  shortcutSettingsUrl: string
}

export const CHROME_SHORTCUTS_URL = 'chrome://extensions/shortcuts'

/** Resolve Chrome capabilities at the point of use, e.g. browserPlatform().sync.get(null). */
export function browserPlatform(): BrowserPlatform {
  return {
    runtime: chrome.runtime,
    sync: chrome.storage.sync,
    storageChanges: chrome.storage.onChanged,
    tabs: chrome.tabs,
    commands: chrome.commands,
    action: chrome.action,
    shortcutSettingsUrl: CHROME_SHORTCUTS_URL,
  }
}
