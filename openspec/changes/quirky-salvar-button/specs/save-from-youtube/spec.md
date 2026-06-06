## MODIFIED Requirements

### Requirement: Save control on YouTube video surfaces

The content script SHALL inject a "+ Salvar" button onto YouTube video cards on
the home feed (`ytd-rich-item-renderer`), search results (`ytd-video-renderer`)
and the suggested sidebar (`ytd-compact-video-renderer`), and an always-visible
pill into the action bar of an open `/watch` page. Injection MUST survive
YouTube's SPA navigation via a `MutationObserver`.

The watch-page pill SHALL be styled with the MyTube accent theme (the accent
color from `styles/theme-tokens.css`, not a hardcoded grey/red), and SHALL present
a quirky "extra" affordance: a sparkle glyph alongside a `+` that rotates on hover.
The rotation MUST be driven purely by CSS `:hover` (no JS state) so it degrades
gracefully and never blocks a click.

On the suggested sidebar (`ytd-compact-video-renderer`, the "Up next" list), the
injected control SHALL be a compact "mini Salvar" variant that is hidden by default
and revealed on hover of its card, visually smaller than the home-feed button so it
does not crowd the dense sidebar.

#### Scenario: Button appears on a feed card
- **WHEN** the user hovers a video card on the YouTube home, search or sidebar
- **THEN** a "+ Salvar" button is shown anchored over the card thumbnail

#### Scenario: Themed pill on the watch page
- **WHEN** the user opens a `/watch?v=<id>` page
- **THEN** a "+ Salvar" pill styled in the MyTube accent color is added to the watch action bar for that video, and is replaced (not duplicated) when navigating to a different video

#### Scenario: Plus rotates on hover
- **WHEN** the user hovers the watch-page "+ Salvar" pill
- **THEN** the `+` glyph rotates (via CSS) and the sparkle reads as an "extra" affordance, returning to rest when the pointer leaves — with no effect on the click-to-open-dropdown behavior

#### Scenario: Mini Salvar on the Up next sidebar
- **WHEN** the user hovers an "Up next" suggested-sidebar thumbnail (`ytd-compact-video-renderer`)
- **THEN** a compact mini "Salvar" control is revealed over that thumbnail, smaller than the home-feed button, and clicking it opens the same category picker

#### Scenario: Unparseable card is skipped
- **WHEN** a card has no resolvable 11-character `watch?v=` video id
- **THEN** no button is injected for that card and other cards are unaffected

#### Scenario: Injection does not resize YouTube's layout
- **WHEN** the button is anchored over a card thumbnail (home, search or sidebar)
- **THEN** YouTube's own thumbnail/image keeps its native size — the anchor MUST prefer an already-positioned host (`ytd-thumbnail`) and only set `position: relative` when the host is `static`, never forcing it onto `#thumbnail`'s auto-height anchor (which ballooned search-result thumbnails)

## ADDED Requirements

### Requirement: Toast confirmation on save

A successful save SHALL surface a transient toast notification in the page that
names the destination category, in addition to the existing in-button "✓ Salvo"
flip. The toast MUST auto-dismiss after a short delay and MUST NOT block
interaction with the page underneath. A failed save MUST NOT show the success
toast.

#### Scenario: Toast appears after a successful save
- **WHEN** the user picks a category and the `SAVE_VIDEO` message resolves `ok: true`
- **THEN** a toast such as "Salvo em <category> ✨" appears, then auto-dismisses after a short delay

#### Scenario: No toast on a failed save
- **WHEN** the `SAVE_VIDEO` message resolves `ok: false`
- **THEN** no success toast is shown and the button does not flip to "✓ Salvo"

### Requirement: Saving bumps the toolbar badge

Saving an unwatched video from any YouTube surface SHALL cause the toolbar action
badge (the unwatched-video count maintained by the service worker) to reflect the
new total, without requiring the popup or new-tab page to be open. This is driven
by the existing `chrome.storage` change listener and MUST remain true for saves
originating from the new control.

#### Scenario: Badge increments on first save of a video
- **WHEN** the user saves a not-yet-saved video (which is stored with `watched: false`)
- **THEN** the toolbar badge's unwatched count increases by one

#### Scenario: Re-save does not double-count
- **WHEN** the user re-saves a video whose id is already stored (a move, not a new entry)
- **THEN** the badge's unwatched count is unchanged, since no new unwatched entry is created
