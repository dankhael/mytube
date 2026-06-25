<!--
The handshake (see CLAUDE.md → "Spec handshake"):
  1. Agent drafts this file with Status: Draft.
  2. Human reviews/edits the criteria and flips Status to Approved.
  3. ONLY THEN may the agent implement.
Do not implement against a Draft. Do not edit Approved criteria without the human.

Backing OpenSpec change: openspec/changes/salvar-home-and-suggestions/
Builds on (sequence after): openspec/changes/quirky-salvar-button/
-->

# Spec: Salvar on the home feed & watch suggestions

- **Status:** Approved  <!-- Draft → Approved (only a human sets Approved) -->
- **Owner:** dankhael
- **Contract:** no contract change — reuses `SAVE_VIDEO` in [src/types.ts](../src/types.ts).
  Content-script presentation + selector coverage only.
- **Tests:** none new (DOM/content script) — all criteria are **Manual acceptance**
  below, per [specs/README.md](./README.md).

## Why

The themed/quirky "+ Salvar" look only reached the watch pill + a mini sidebar
variant, and the variant never appears because the watch-page suggestions now use
a newer lockup renderer than our `ytd-compact-video-renderer` selector. The save
control should look consistent and be present on every video surface.

## Decisions baked into this draft (edit before approving)

> **D1 — Home button look:** the home-feed button adopts the **full themed pill**
> (accent fill + corner sparkle + rotate-on-hover), matching the watch pill.
> _Alt: keep the dark pill but recolor only the text/icon._
> **D2 — Scope of the themed look:** applied to **both home feed and search**
> overlay buttons (they share `.mytube-btn`). _Alt: home only._
> **D3 — Mini detection:** by **sidebar location** (`#secondary` /
> `ytd-watch-next-secondary-results-renderer`), not renderer tag, so home-feed
> lockups are not shrunk.

## Acceptance criteria

These behaviors live on YouTube's shifting DOM, so they are verified by hand (see
Manual acceptance). IDs are stable so the OpenSpec delta and the checklist align.

| ID | Given | When | Then |
|---|---|---|---|
| **HOME-THEME** | a home-feed card (`ytd-rich-item-renderer`) | the user hovers it | the overlay "+ Salvar" button is **accent-themed** with the corner sparkle, and the `+` rotates on hover — matching the watch pill (not the legacy black/red pill) |
| **SEARCH-THEME** | a search result card (`ytd-video-renderer`) | the user hovers it | the overlay button shows the same themed look as the home feed (per D2) |
| **HOME-LEGIBLE** | the themed overlay over any thumbnail | the button is shown | it stays legible over both bright and dark thumbnails (shadow/border retained), and the `✓ Salvo` state is still visually distinct |
| **SUGGEST-MINI** | a watch-page suggestion in `#secondary` (current lockup renderer) | the user hovers the card | a compact **mini** Salvar control is revealed; clicking it opens the same category picker |
| **SUGGEST-EXTRACT** | a suggestion rendered by the lockup view-model | the button is injected | `extractCard` resolves a real id, title, channel and `mqdefault` thumbnail (no `MISSING_*` placeholders) |
| **HOME-NOSHRINK** | a home-feed/search card using the lockup renderer | the button is injected | it uses the **normal** (non-mini) size — only sidebar (`#secondary`) cards get the mini variant (D3) |
| **SALVAR-PREVIEW-1** | a card whose thumbnail YouTube covers with its inline hover preview (`ytd-video-preview`) | the preview mounts | a Save pill is shown **inside the preview's controls** (top-left, clear of the mute/CC controls), since a thumbnail-overlay pill is buried by the preview's separate, later-painting `ytd-app` branch (z-index can't beat it) |
| **SALVAR-PREVIEW-2** | the preview Save pill | the user clicks it | the category picker opens and saves the **currently-previewed** video (id re-read on click, so swapping between cards saves the right one); title/channel may backfill via oEmbed (metadata enrichment) |
| **SALVAR-PREVIEW-3** | the shared, reused preview overlay | it swaps to another card or hides | exactly **one** pill exists (re-targeted to the new id, `✓ Salvo` state in sync), and it is removed when the preview hides — never left floating |
| **SALVAR-PREVIEW-4** | a home/search card whose preview is up (the overlay pill could otherwise paint **alongside** the preview pill, as on the home feed) | the preview is active | the card's own thumbnail-overlay pill is **hidden** (only the preview's left pill shows — no double Save button); it reappears when the preview goes away, so a user with inline playback off still has it |
| **SALVAR-LEFT** | any thumbnail-overlay card (feed / search / **channel Videos tab** / sidebar) | the pill is shown | it sits at the **top-left** of the thumbnail, not top-right — YouTube owns the top-right corner with its hover controls (Watch Later / queue / ⋮), which overlapped the pill on channel + feed cards. The watch pill and its action-bar alignment are unaffected |

## Out of scope / non-goals

- No change to `SAVE_VIDEO`, the reducer, the storage schema, the dropdown/picker,
  the toast, or the badge.
- Not chasing every YouTube experiment renderer — cover the current sidebar lockup
  plus legacy `ytd-compact-video-renderer`.
- Watch pill (already shipped in `quirky-salvar-button`) is unchanged here.

## Manual acceptance (not unit-tested)

- [ ] **HOME-THEME** — Home-feed hover shows the accent-themed button w/ sparkle; `+` rotates on hover.
- [ ] **SEARCH-THEME** — Search results show the same themed button (per D2).
- [ ] **HOME-LEGIBLE** — Button readable over bright + dark thumbnails; `✓ Salvo` stays distinct.
- [ ] **SUGGEST-MINI** — Hovering a watch-page suggestion reveals the mini control; clicking opens the picker.
- [ ] **SUGGEST-EXTRACT** — Saving a suggestion stores a real title/channel/thumbnail (check the new-tab card).
- [ ] **HOME-NOSHRINK** — Home/search lockup cards keep the normal-size button; only `#secondary` is mini.
- [ ] **SALVAR-PREVIEW-1** — Let a search/home thumbnail's inline preview mount; a Save pill shows in the preview's top-left controls.
- [ ] **SALVAR-PREVIEW-2** — Click it; the picker opens and the **previewed** video is saved (verify the right title/channel on the new-tab card).
- [ ] **SALVAR-PREVIEW-3** — Move across several cards: one pill, re-targeted each time; `✓ Salvo` reflects already-saved videos; pill gone once the preview hides.
- [ ] **SALVAR-PREVIEW-4** — On the home feed with a preview up, only the left preview pill shows (no second pill top-right); the overlay pill returns when the preview closes.
- [ ] **SALVAR-LEFT** — Overlay pill sits top-left on feed/search/channel-Videos/sidebar cards; no overlap with YouTube's top-right Watch Later/queue/⋮ controls; watch pill alignment unchanged.
- [ ] No regression: watch pill + dropdown, toast, badge, and `SALVAR-NOEXPAND` (no thumbnail expansion) still hold.
