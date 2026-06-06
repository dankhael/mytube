## MODIFIED Requirements

### Requirement: Save control on YouTube video surfaces

The content script SHALL inject a themed "+ Salvar" button onto YouTube video
cards on the home feed (`ytd-rich-item-renderer`), search results
(`ytd-video-renderer`), the suggested/"Up next" sidebar (the legacy
`ytd-compact-video-renderer` **and** the current lockup renderer the watch-page
related list now uses, e.g. `yt-lockup-view-model`), and an always-visible pill
into the action bar of an open `/watch` page. Injection MUST survive YouTube's SPA
navigation via a `MutationObserver` and MUST NOT resize YouTube's own thumbnail
layout.

All injected card/sidebar controls SHALL use the MyTube accent theme and the
quirky sparkle + rotate-on-hover affordance introduced for the watch pill — the
home-feed and search overlay buttons included — rather than the legacy black/red
pill.

#### Scenario: Themed button on a feed card
- **WHEN** the user hovers a video card on the YouTube home or search
- **THEN** an accent-themed "+ Salvar" button (sparkle + rotate-on-hover) is shown anchored over the card thumbnail

#### Scenario: Mini Salvar on the watch-page suggestions
- **WHEN** the user hovers a suggested/"Up next" card on a `/watch` page, including cards rendered by the current lockup renderer
- **THEN** a compact mini "Salvar" control is revealed over that card, and clicking it opens the same category picker

#### Scenario: Button appears on the watch page
- **WHEN** the user opens a `/watch?v=<id>` page
- **THEN** a themed "+ Salvar" pill is added to the watch action bar for that video, and is replaced (not duplicated) when navigating to a different video

#### Scenario: Unparseable card is skipped
- **WHEN** a card has no resolvable 11-character `watch?v=` video id
- **THEN** no button is injected for that card and other cards are unaffected

#### Scenario: Injection does not resize YouTube's layout
- **WHEN** the button is anchored over a card thumbnail on any surface
- **THEN** YouTube's own thumbnail/image keeps its native size (the anchor prefers an already-positioned host and only sets `position: relative` when the host is `static`)
