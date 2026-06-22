// Executable spec for specs/watch-reminders.spec.md (REMIND-1/5/6/8/9/10).
// Pure decision logic — no Chrome, no DOM.

import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, Settings } from './types'
import {
  HomeNudgeState,
  isYoutubeHomePath,
  openHomeOnStartup,
  shouldShowHomeNudge,
} from './watch-reminders'

function settings(partial: Partial<Settings> = {}): Settings {
  return { ...DEFAULT_SETTINGS, ...partial }
}

function nudgeState(partial: Partial<HomeNudgeState> = {}): HomeNudgeState {
  return { remindOnYoutubeHome: true, unwatched: 3, onYoutubeHome: true, dismissed: false, ...partial }
}

describe('watch-reminders.spec', () => {
  it('REMIND-1: both reminder toggles default to false', () => {
    expect(DEFAULT_SETTINGS.openHomeOnStartup).toBe(false)
    expect(DEFAULT_SETTINGS.remindOnYoutubeHome).toBe(false)
  })

  it('REMIND-5: opens the home exactly once when openHomeOnStartup is true', () => {
    const open = vi.fn()
    openHomeOnStartup(settings({ openHomeOnStartup: true }), open)
    expect(open).toHaveBeenCalledTimes(1)
  })

  it('REMIND-6: opens nothing when openHomeOnStartup is false', () => {
    const open = vi.fn()
    openHomeOnStartup(settings({ openHomeOnStartup: false }), open)
    expect(open).not.toHaveBeenCalled()
  })

  it('REMIND-8: shows the nudge when toggle on, backlog>0, on home, not dismissed', () => {
    expect(shouldShowHomeNudge(nudgeState())).toBe(true)
  })

  it('REMIND-9: the toggle is the master switch — off means never show', () => {
    expect(shouldShowHomeNudge(nudgeState({ remindOnYoutubeHome: false }))).toBe(false)
  })

  it('REMIND-10: dismissed, empty backlog, or off-home each suppress the nudge', () => {
    expect(shouldShowHomeNudge(nudgeState({ dismissed: true })), 'dismissed').toBe(false)
    expect(shouldShowHomeNudge(nudgeState({ unwatched: 0 })), 'empty backlog').toBe(false)
    expect(shouldShowHomeNudge(nudgeState({ onYoutubeHome: false })), 'off home').toBe(false)
  })

  it('isYoutubeHomePath: only the site root counts as home', () => {
    expect(isYoutubeHomePath('/')).toBe(true)
    expect(isYoutubeHomePath('')).toBe(true)
    expect(isYoutubeHomePath('/watch')).toBe(false)
    expect(isYoutubeHomePath('/results')).toBe(false)
    expect(isYoutubeHomePath('/@channel')).toBe(false)
  })
})
