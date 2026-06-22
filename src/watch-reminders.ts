// Pure decision logic for the opt-in watch reminders (spec watch-reminders).
// Kept free of Chrome/DOM so the rules are unit-tested without a browser; the
// service worker and content script wire these to real tabs/DOM.

import { Settings } from './types'

// Open the home in a tab on browser launch only when the user opted in. The
// `open` callback is injected so this stays testable without chrome.tabs
// (REMIND-5/6).
export function openHomeOnStartup(settings: Settings, open: () => void): void {
  if (settings.openHomeOnStartup) open()
}

// The state the YouTube-home nudge decision reads. Each field is gathered by the
// content script (setting + unwatched count + current page + session dismissal).
export interface HomeNudgeState {
  remindOnYoutubeHome: boolean
  unwatched: number
  onYoutubeHome: boolean
  dismissed: boolean
}

// Show the nudge only when the master toggle is on, there's a backlog to nudge
// about, we're actually on the YouTube home, and the user hasn't dismissed it
// this session. The toggle is the master switch (REMIND-8/9/10).
export function shouldShowHomeNudge(state: HomeNudgeState): boolean {
  return state.remindOnYoutubeHome && state.unwatched > 0 && state.onYoutubeHome && !state.dismissed
}

// "YouTube home" is the site root; search/watch/channel pages carry a non-root
// path, where we deliberately stay out of the way (spec D6).
export function isYoutubeHomePath(pathname: string): boolean {
  return pathname === '/' || pathname === ''
}
