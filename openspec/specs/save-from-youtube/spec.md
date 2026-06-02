# save-from-youtube

## Purpose

Let a user save any YouTube video into one of their categories directly from a
YouTube page, without leaving it. Implemented by the content script
([content/content.ts](../../../content/content.ts)) talking to the service worker
over the `SAVE_VIDEO` message. Consolidates `specs/save-video.spec.md`
(SAVE-*, VID-1).

<!-- TODO: reconcile the exact scenario IDs below against the original
     specs/save-video.spec.md text (SAVE-1, SAVE-2, SAVE-3, VID-1). The behavior
     here is derived from the code, which is the source of truth, but the legacy
     criterion wording was not re-read line-by-line. -->

## Requirements

### Requirement: Save control on YouTube video surfaces

The content script SHALL inject a "+ Salvar" button onto YouTube video cards on
the home feed (`ytd-rich-item-renderer`), search results (`ytd-video-renderer`)
and the suggested sidebar (`ytd-compact-video-renderer`), and an always-visible
pill into the action bar of an open `/watch` page. Injection MUST survive
YouTube's SPA navigation via a `MutationObserver`.

#### Scenario: Button appears on a feed card
- **WHEN** the user hovers a video card on the YouTube home, search or sidebar
- **THEN** a "+ Salvar" button is shown anchored over the card thumbnail

#### Scenario: Button appears on the watch page
- **WHEN** the user opens a `/watch?v=<id>` page
- **THEN** a "+ Salvar" pill is added to the watch action bar for that video, and is replaced (not duplicated) when navigating to a different video

#### Scenario: Unparseable card is skipped
- **WHEN** a card has no resolvable 11-character `watch?v=` video id
- **THEN** no button is injected for that card and other cards are unaffected

### Requirement: Save a video into a chosen category

Clicking the button SHALL open an inline dropdown of existing categories; picking
one MUST send `SAVE_VIDEO` with the scraped id, title, channel name and the
`i.ytimg.com/vi/<id>/mqdefault.jpg` thumbnail.

#### Scenario: Save into an existing category (SAVE-1)
- **WHEN** the user clicks "+ Salvar" and selects a category
- **THEN** the video is stored in that category and the button changes to "✓ Salvo" with the category shown in its tooltip

#### Scenario: Category list shows the legacy emoji (current reality)
- **WHEN** the dropdown renders the category list
- **THEN** each row shows `<emoji> <name>` — the `emoji` field is documented as legacy and is no longer shown on the home, but the content-script dropdown still renders it (inconsistency I1)

### Requirement: Create a category inline while saving

The dropdown SHALL offer "+ Nova categoria" which expands into a text input;
confirming MUST save the video and create the category in one step.

#### Scenario: Create-and-save (SAVE-2)
- **WHEN** the user types a new category name and presses Enter
- **THEN** the category is created (if it does not exist) and the video is saved into it
- **WHEN** the user presses Escape instead
- **THEN** the dropdown closes and nothing is saved

### Requirement: Re-saving moves instead of duplicating

Saving a video whose id is already stored SHALL move the existing entry rather
than create a duplicate.

#### Scenario: Re-save moves the video (SAVE-3)
- **WHEN** the user saves a video whose id is already stored
- **THEN** the existing entry's category is changed to the new choice and no duplicate entry is created

### Requirement: Saved state stays in sync across surfaces

The content script SHALL seed saved state via `GET_SAVED_IDS` and MUST re-sync
injected buttons when storage changes from another context.

#### Scenario: Buttons reflect edits made elsewhere
- **WHEN** the saved videos change in `chrome.storage.sync` (e.g. the user moves or removes a video on the home)
- **THEN** already-injected buttons update their "✓ Salvo"/"+ Salvar" state and category tooltip without a page reload
