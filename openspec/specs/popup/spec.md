# popup

## Purpose

The toolbar popup gives a quick browse of saved videos by category, an unwatched
summary, shortcuts to open a video or the home, and a settings panel. Entry point
[popup/popup.ts](../../../popup/popup.ts), helpers in
[popup/groups.ts](../../../popup/groups.ts). Consolidates
`specs/popup-categories.spec.md` (POPUP-*), `specs/popup-config.spec.md` (CFG-*)
and `specs/popup-redesign.spec.md` (PUI-*).

<!-- TODO: popup-redesign.spec.md re-references CFG-1/2/6 and POPUP-1 and adds
     PUI-1..9; popup-config defines CFG-1..9. When carrying IDs forward, each ID
     must be defined once with cross-references for re-uses. The PUI redesign
     visual criteria were NOT re-read line-by-line. Reconcile against the three
     source files before treating this capability as complete. -->

## Requirements

### Requirement: Unwatched summary header

The popup SHALL show an "N unwatched" label, with the number styled distinctly
from the word.

#### Scenario: Show the unwatched count (PUI-1)
- **WHEN** the popup opens
- **THEN** it shows an "N unwatched" label with the number emphasized

### Requirement: Browse videos grouped by category

The popup SHALL list categories in stored order, each with up to `VIDEO_CAP` (10)
of its videos; empty categories MUST still be listed with a placeholder.

#### Scenario: List categories with their videos
- **WHEN** the popup renders the list
- **THEN** each category is shown with up to 10 of its videos in stored order; the remainder lives on the home

#### Scenario: Empty category keeps a placeholder
- **WHEN** a category has no videos
- **THEN** it is still listed with a placeholder

### Requirement: Open a video or the home

The popup SHALL open a clicked video at its watch URL in a new tab, and SHALL open
the curated home from its open-home control.

#### Scenario: Open a video
- **WHEN** the user clicks a video in the popup
- **THEN** `youtube.com/watch?v=<id>` opens in a new tab

#### Scenario: Open the curated home
- **WHEN** the user clicks the open-home control
- **THEN** a new tab is created at the home (`chrome://newtab`)

### Requirement: Settings panel with a sound toggle

The gear button SHALL open a config modal whose `soundEffects` toggle persists via
`UPDATE_SETTINGS`; the setting MUST default to false on a fresh install.

#### Scenario: Toggle click sounds (CFG)
- **WHEN** the user toggles "sound effects" in the config modal
- **THEN** the change is persisted via `UPDATE_SETTINGS` and applied live to subsequent click sounds

#### Scenario: Sound is opt-in
- **WHEN** the extension is freshly installed
- **THEN** `soundEffects` defaults to false (no audio on first use)

<!-- TODO: CFG-3..5, CFG-7..9 and PUI-2..9 cover config-modal and redesign details
     (layout, additional controls) not enumerated here. Reconcile against
     specs/popup-config.spec.md and specs/popup-redesign.spec.md. -->
