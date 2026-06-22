// Opening the curated home. The page is a plain packaged extension page — it is
// deliberately NOT a new-tab override (that triggers Chrome's un-suppressable
// "keep this page?" consent prompt and hijacks every new tab). So callers open
// it on demand via its runtime URL, never chrome://newtab.

import { MessageResponse } from './types'

// Path of the home page inside the extension bundle (relative to the root).
export const HOME_PAGE_PATH = 'newtab/index.html'

// Name of the manifest `commands` entry that opens the home. Single source of
// truth for the manifest key, the worker's onCommand match and the popup's
// shortcut lookup, so they can't drift.
export const OPEN_HOME_COMMAND = 'open_home'

// Chrome's user-controlled shortcut page. Extensions cannot assign their own
// shortcuts (the same anti-hijack stance as the new-tab prompt), so the settings
// row can only deep-link the user here to set/clear the open-home binding.
export const SHORTCUTS_PAGE = 'chrome://extensions/shortcuts'

// The developer's Ko-fi page, opened by the "Buy me a coffee" settings card
// (CFG-6). Single source of truth so the URL can't drift across callers.
export const KOFI_URL = 'https://ko-fi.com/dankhael'

// Opens the MyTube home in a new tab. Shared by the popup button and the
// `open_home` keyboard shortcut so both resolve the same packaged URL.
// Injected `tabs`/`getUrl` default to the real chrome APIs but are overridable
// in tests (no Chrome runtime needed).
export function openHomeTab(
  tabs: { create: (props: { url: string }) => unknown } = chrome.tabs,
  getUrl: (path: string) => string = chrome.runtime.getURL,
): void {
  tabs.create({ url: getUrl(HOME_PAGE_PATH) })
}

// Worker handler for the OPEN_HOME message: opens the home and acknowledges.
// Extracted (with an injectable opener) so the trivial handler is unit-tested
// without importing the service worker, which touches chrome.* at module load
// (spec watch-reminders, REMIND-7).
export function handleOpenHome(open: () => void = openHomeTab): MessageResponse {
  open()
  return { ok: true }
}

// Opens Chrome's shortcut settings so the user can bind/rebind the open-home
// command. Injectable for tests.
export function openShortcutSettings(
  tabs: { create: (props: { url: string }) => unknown } = chrome.tabs,
): void {
  tabs.create({ url: SHORTCUTS_PAGE })
}

// Opens the developer's Ko-fi page from the "Buy me a coffee" settings card
// (CFG-6). Injectable for tests; no permission needed (chrome.tabs.create).
export function openDonatePage(
  tabs: { create: (props: { url: string }) => unknown } = chrome.tabs,
): void {
  tabs.create({ url: KOFI_URL })
}

// The shortcut currently bound to the open-home command, '' when the user hasn't
// set one. Chrome owns the binding, so this reads chrome.commands; injectable for
// tests. The namespace (not the bare method) is passed so `this` stays bound.
export async function homeShortcut(
  commands: { getAll: () => Promise<{ name?: string; shortcut?: string }[]> } = chrome.commands,
): Promise<string> {
  const all = await commands.getAll()
  return all.find((command) => command.name === OPEN_HOME_COMMAND)?.shortcut ?? ''
}
