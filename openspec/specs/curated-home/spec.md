# curated-home

## Purpose

Replace Chrome's new tab with a curated YouTube home: per-category video grids,
derived "smart" sections, search, a watched filter, drag-and-drop, and per-video
actions. Implemented in [newtab/App.tsx](../../../newtab/App.tsx) and its
components. Consolidates `specs/design-rework.spec.md` (HOME-*, THEME-*),
`specs/newtab-ui.spec.md` (UI-*, SMOKE-1), `specs/home-smart-sections.spec.md`
(SMART-*) and the home-tile portion of `specs/home-icon-tiles.spec.md` (HICON-1..7).

<!-- TODO: this is the largest consolidated capability. The HOME-*/THEME-* visual
     redesign criteria from design-rework.spec.md and the PUI/HICON tile visuals
     were NOT re-read line-by-line; the requirements below cover the behavior I
     verified in the code. Reconcile visual/theme criteria against the original
     spec files before treating this capability as complete. -->

## Requirements

### Requirement: Render saved videos grouped by category

The home SHALL render each category as a section in stored order listing its
videos, and MUST show a welcome screen instead when the library is empty.

#### Scenario: Categories render in stored order
- **WHEN** the home loads with saved videos
- **THEN** each category is shown as a section in stored order, listing its videos

#### Scenario: Empty library shows a welcome screen
- **WHEN** there are no saved videos
- **THEN** a welcome/onboarding screen is shown instead of category sections

### Requirement: Smart sections derived from the saved videos

The home SHALL show two cross-cutting sections derived on every render from
[newtab/smart-sections.ts](../../../newtab/smart-sections.ts); both MUST exclude
watched videos and MUST be capped at `SMART_LIMIT` (12).

#### Scenario: Recently added (SMART)
- **WHEN** the home renders
- **THEN** "Recentemente adicionados" lists unwatched videos newest-first, with no age filter

#### Scenario: Gathering dust threshold (SMART)
- **WHEN** an unwatched video was added more than `DUST_AGE_DAYS` (21) days ago
- **THEN** it appears in "Pegando poeira", oldest-first

#### Scenario: Gathering dust is empty when nothing is old enough
- **WHEN** no unwatched video is older than 21 days
- **THEN** the "Pegando poeira" section is empty

<!-- TODO: the 21-day threshold has no in-UI explanation (inconsistency I4). -->

### Requirement: Search filters the library

The home search SHALL match the trimmed, case-insensitive query against video
title and channel name, and the result MUST drive every section.

#### Scenario: Filter by title or channel
- **WHEN** the user types a query
- **THEN** only videos whose title or channel contains the query are shown across all sections

#### Scenario: Empty query shows everything
- **WHEN** the query is empty or whitespace
- **THEN** all videos are shown

### Requirement: Show or hide watched videos

The home SHALL provide a toggle that hides watched videos from the category
sections.

#### Scenario: Toggle watched visibility
- **WHEN** the user toggles the watched filter off
- **THEN** watched videos are hidden from the category sections (smart sections already exclude them)

### Requirement: Per-video actions on a card

Each video card SHALL open the video on click and MUST offer move,
toggle-watched and delete via hover actions and a right-click context menu
(see [newtab/components/VideoCard.tsx](../../../newtab/components/VideoCard.tsx)).

#### Scenario: Open a video
- **WHEN** the user clicks a card
- **THEN** the video opens at `youtube.com/watch?v=<id>` in a new tab

#### Scenario: Context menu actions
- **WHEN** the user right-clicks a card (or uses the hover "more" menu)
- **THEN** a menu offers Mover para… (move), Marcar (não) assistido (toggle watched) and Remover (delete)

### Requirement: Drag and drop reordering

The home SHALL let the user reorder categories among themselves and reorder videos
within a category, persisting each change.

#### Scenario: Reorder categories
- **WHEN** the user drags a category to a new position
- **THEN** the new category order is persisted (`REORDER_CATEGORIES`)

#### Scenario: Reorder videos within a category
- **WHEN** the user drags a video within its category
- **THEN** the new order within that category is persisted (`REORDER_VIDEOS`) without disturbing other categories

### Requirement: Storage quota warning

The home SHALL warn the user when stored bytes reach 80% (`WARN_RATIO`) of the
102,400-byte `chrome.storage.sync` ceiling.

#### Scenario: Warn at 80% of 100KB
- **WHEN** stored bytes reach 80% of the 102,400-byte limit
- **THEN** a warning banner is shown with the current percentage and advice to remove videos
