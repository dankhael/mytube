<!--
The handshake (see CLAUDE.md → "Spec handshake"):
  1. Agent drafts this file with Status: Draft.
  2. Human reviews/edits the criteria and flips Status to Approved.
  3. ONLY THEN may the agent implement.
Do not implement against a Draft. Do not edit Approved criteria without the human.

Backing OpenSpec change: openspec/changes/quirky-salvar-button/
-->

# Spec: Quirky "+ Salvar" button (themed pill, mini sidebar, toast)

- **Status:** Approved  <!-- Draft → Approved (only a human sets Approved) -->
- **Owner:** dankhael
- **Contract:** no contract change — reuses `SAVE_VIDEO` in [src/types.ts](../src/types.ts).
  This is a content-script presentation/feedback change only.
- **Tests:** none new (DOM/content script) — all criteria are **Manual acceptance**
  below, per [specs/README.md](./README.md). Existing `SAVE_VIDEO` persistence
  proof stays in [src/storage.test.ts](../src/storage.test.ts).

## Why

The save control is the app's core verb but reads as a flat black pill that fights
YouTube's chrome, the dense "Up next" sidebar gets only the generic card button,
and a save gives no real confirmation. Make it feel like an on-brand, delightful
"extra" and confirm saves clearly — without touching save/dropdown logic.

## Acceptance criteria

These behaviors live on YouTube's shifting DOM, so they are verified by hand (see
Manual acceptance). IDs are kept stable so the OpenSpec delta and the checklist
line up.

| ID | Given | When | Then |
|---|---|---|---|
| **SALVAR-THEME** | a `/watch` page | the "+ Salvar" pill is injected | it renders in the MyTube **accent** color (not hardcoded grey/red); the `✓ Salvo` saved state stays visually distinct |
| **SALVAR-ROTATE** | the watch pill at rest | the user hovers it | the `+` glyph rotates (CSS only) and the sparkle reads as an "extra"; click-to-open-dropdown still works |
| **SALVAR-MINI** | an "Up next" `ytd-compact-video-renderer` card | the user hovers the thumbnail | a compact **mini** Salvar control is revealed (smaller than the home-feed button); clicking it opens the same category picker |
| **SALVAR-TOAST** | a category chosen | `SAVE_VIDEO` resolves `ok: true` | a transient toast like "Salvo em <category> ✨" appears and auto-dismisses; it never blocks the page |
| **SALVAR-TOAST-FAIL** | a category chosen | `SAVE_VIDEO` resolves `ok: false` | no success toast is shown and the button does not flip to `✓ Salvo` |
| **SALVAR-BADGE** | a not-yet-saved (unwatched) video | the user saves it | the toolbar badge's unwatched count increases by one, without opening the popup/new-tab |
| **SALVAR-BADGE-RESAVE** | a video already stored | the user re-saves it into another category (a move) | the badge count is unchanged (no new unwatched entry) |
| **SALVAR-NOEXPAND** | any feed/search/sidebar card | the button is injected over the thumbnail | YouTube's own thumbnail/layout is **not** resized — injecting MUST NOT force `position` onto a host that breaks the native image sizing (regression: forcing `#thumbnail` relative ballooned search-result thumbnails) |

## Out of scope / non-goals

- No change to `SAVE_VIDEO`, the `MyTubeStore` reducer, or the storage schema.
- No change to the category-picker behavior (create-and-save, re-save moves, Escape).
- No new badge logic — badge bump is verified, not re-implemented.
- Home-feed card button styling left unchanged (quirky affordance scoped to the
  watch pill + mini sidebar) unless the human asks otherwise.
- Accent is mirrored as a literal in the injected style block (the content script
  can't import `theme-tokens.css`); it does not follow a runtime theme switch.

## Manual acceptance (not unit-tested)

- [ ] **SALVAR-THEME** — On a `/watch` page the pill is the MyTube accent color; `✓ Salvo` is still distinguishable.
- [ ] **SALVAR-ROTATE** — Hovering the watch pill rotates the `+`; clicking still opens the dropdown.
- [ ] **SALVAR-MINI** — Hovering an "Up next" thumbnail reveals the smaller mini control; clicking opens the picker.
- [ ] **SALVAR-TOAST** — A successful save shows "Salvo em <category> ✨", which auto-dismisses and doesn't block clicks.
- [ ] **SALVAR-TOAST-FAIL** — A failed save shows no success toast and no `✓ Salvo` flip.
- [ ] **SALVAR-BADGE** — Saving a new video bumps the toolbar badge with the popup/new-tab closed.
- [ ] **SALVAR-BADGE-RESAVE** — Re-saving (moving) a stored video leaves the badge count unchanged.
- [ ] **SALVAR-NOEXPAND** — On the search results page, injected buttons do **not** enlarge/expand the video thumbnails (toggle the extension to compare).
- [ ] Cross-context re-sync still works: saving from the new-tab page updates an already-injected button's state.
