## Why

The current "+ Salvar" control is functional but flat: a black pill that fights
YouTube's chrome instead of feeling like part of MyTube, and the suggested-sidebar
("Up next") cards only get the same generic card button as the home feed. Saving
gives no confirmation beyond the in-place "✓ Salvo" flip, so the action feels weak
for what is the app's core verb. We want the save control to read as a small,
delightful "extra" — on-brand with the warm-dark accent theme — and to confirm
saves with a toast, while keeping the existing save/dropdown behavior intact.

## What Changes

- Restyle the watch-page "+ Salvar" pill to use the MyTube accent theme tokens
  (replacing the hardcoded `#272727`/`#ff0000` look) with a quirky affordance: a
  sparkle glyph and a `+` that **rotates on hover** so the control reads as an
  "extra" you add to a video.
- Add a **mini Salvar** affordance that reveals on hover over "Up next"
  (`ytd-compact-video-renderer`) sidebar thumbnails, distinct in size/placement
  from the home-feed card button.
- Fire a **toast notification** in the page on a successful save (e.g. "Salvo em
  <category> ✨"), in addition to the existing in-button "✓ Salvo" flip.
- Confirm that saving **bumps the toolbar badge** (unwatched count) — the badge
  already recomputes on `chrome.storage` change; this change asserts and manually
  verifies that behavior end-to-end from the new control.
- No change to the `SAVE_VIDEO` contract, the reducer, the category picker
  behavior, or re-save/move semantics.

## Capabilities

### New Capabilities
<!-- none — this enhances an existing capability -->

### Modified Capabilities
- `save-from-youtube`: the save control's appearance and feedback change at the
  requirement level — a themed/animated affordance, a hover-revealed mini control
  on the suggested sidebar, and a post-save toast. The badge-bump-on-save behavior
  is made an explicit, verifiable requirement.

## Impact

- **Code**: [content/content.ts](../../../content/content.ts) — button markup,
  injected `<style>` block (theme-token-driven colors, sparkle/`+` rotate
  animation, mini-sidebar variant, toast element + lifecycle).
- **Theme**: reuse accent values from
  [styles/theme-tokens.css](../../../styles/theme-tokens.css); the content script
  can't `@import` the new-tab CSS, so the relevant accent values are mirrored as
  literals (or CSS custom properties) inside the injected style block.
- **Badge**: [background/service-worker.ts](../../../background/service-worker.ts)
  `updateBadge` — already triggered via `storage.onChanged`; no code change
  expected, only verification.
- **Specs/tests**: content-script DOM behavior stays on **Manual acceptance**
  checklists (per `specs/README.md`); no reducer contract change, so existing
  `src/storage.test.ts` save tests remain the executable proof for persistence.
- **No** changes to `src/types.ts`, the `Message` union, or storage schema.
