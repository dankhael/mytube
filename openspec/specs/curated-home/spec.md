# curated-home

## Purpose

Replace Chrome's new tab with a curated YouTube home: per-category video grids,
derived "smart" sections, search, a watched filter, drag-and-drop, and per-video
actions. Implemented in [newtab/App.tsx](../../../newtab/App.tsx) and its
components. Consolidates `specs/design-rework.spec.md` (HOME-*, THEME-*),
`specs/newtab-ui.spec.md` (UI-*, SMOKE-1), `specs/home-smart-sections.spec.md`
(SMART-*) and the home-tile portion of `specs/home-icon-tiles.spec.md` (HICON-1..7).

<!-- Reconciled 2026-06-12 (fix-memory-and-storage-robustness, first-change
     rule): behavioral scenarios below are tagged with their legacy IDs from
     newtab-ui (UI-*), home-smart-sections (SMART-*), design-rework (HOME-4)
     and save-video (REORDER-VID-1). The THEME-*/HOME-* visual-fidelity and
     HICON picker criteria stay owned by their Approved implementation-layer
     spec files (design-rework.spec.md, home-icon-tiles.spec.md) — this
     baseline tracks behavior, not pixels. -->

## Requirements

### Requirement: Render saved videos grouped by category

The home SHALL render each category as a section in stored order listing its
videos, and MUST show a welcome screen instead when the library is empty.

#### Scenario: Categories render in stored order (UI-2)
- **WHEN** the home loads with saved videos
- **THEN** each category is shown as a section in stored order, listing its videos

#### Scenario: Empty library shows a welcome screen (UI-1)
- **WHEN** there are no saved videos
- **THEN** a welcome/onboarding screen is shown instead of category sections

### Requirement: Smart sections derived from the saved videos

The home SHALL show two cross-cutting sections derived on every render from
[newtab/smart-sections.ts](../../../newtab/smart-sections.ts); both MUST exclude
watched videos and MUST be capped at `SMART_LIMIT` (12).

#### Scenario: Recently added (SMART-1)
- **WHEN** the home renders
- **THEN** "Recentemente adicionados" lists unwatched videos newest-first, with no age filter

#### Scenario: Gathering dust threshold (SMART-2)
- **WHEN** an unwatched video was added more than `DUST_AGE_DAYS` (21) days ago
- **THEN** it appears in "Pegando poeira", oldest-first

#### Scenario: Smart section hides when nothing qualifies (SMART-6)
- **WHEN** no unwatched video is older than 21 days
- **THEN** the "Pegando poeira" section is hidden entirely (no empty placeholder)

<!-- Known gap from the 2026-06 review (inconsistency I4): the 21-day threshold
     has no in-UI explanation. Not owned by an active change — an explanation
     would be its own small change. -->

### Requirement: Search filters the library

The home search SHALL match the trimmed, case-insensitive query against video
title and channel name, and the result MUST drive every section.

#### Scenario: Filter by title or channel (HOME-4)
- **WHEN** the user types a query
- **THEN** only videos whose title or channel contains the query are shown across all sections

#### Scenario: Empty query shows everything
- **WHEN** the query is empty or whitespace
- **THEN** all videos are shown

### Requirement: Show or hide watched videos

The home SHALL provide a toggle that hides watched videos from the category
sections.

#### Scenario: Toggle watched visibility (UI-3)
- **WHEN** the user toggles the watched filter off
- **THEN** watched videos are hidden from the category sections (smart sections already exclude them, SMART-5)

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

#### Scenario: Reorder videos within a category (REORDER-VID-1)
- **WHEN** the user drags a video within its category
- **THEN** the new order within that category is persisted (`REORDER_VIDEOS`) without disturbing other categories

### Requirement: Storage quota warning

The home SHALL warn the user when stored bytes reach 80% (`WARN_RATIO`) of the
102,400-byte `chrome.storage.sync` ceiling.

#### Scenario: Warn at 80% of 100KB
- **WHEN** stored bytes reach 80% of the 102,400-byte limit
- **THEN** a warning banner is shown with the current percentage and advice to remove videos

### Requirement: Channel avatar on the home card

The home video card SHALL display the saved channel photo in its avatar slot when
the video carries a valid `channelThumbnail`, and MUST fall back to the existing
initial-letter avatar (the uppercased first character of the channel name) when
the field is missing, invalid, or the image fails to load. A failed image load
MUST degrade to the initial-letter avatar rather than render a broken image.

#### Scenario: Card shows the channel photo
- **WHEN** a card renders for a video that has a valid `channelThumbnail`
- **THEN** the avatar slot shows an `<img>` whose `src` is that URL and whose `alt` is the channel name

#### Scenario: Card without an avatar shows the initial
- **WHEN** a card renders for a video with no `channelThumbnail`
- **THEN** the avatar slot shows the uppercased first character of the channel name

#### Scenario: Broken avatar image degrades to the initial
- **WHEN** a rendered avatar image fails to load (e.g. an expired URL)
- **THEN** the card replaces it with the initial-letter avatar instead of a broken image
