## Context

All YouTube-page UI lives in a single content script,
[content/content.ts](../../../content/content.ts), which injects buttons and a
self-contained `<style id="mytube-styles">` block. The script cannot import the
extension's CSS (`styles/theme-tokens.css` is bundled for the new-tab/popup
surfaces, not injected into youtube.com), and it must coexist with YouTube's own
CSS and frequent SPA DOM churn — hence the `MutationObserver` + per-card
`try/catch` guards already in place.

Today the watch pill is hardcoded grey (`#272727`) with a red hover, the sidebar
(`ytd-compact-video-renderer`) reuses the generic floating card button, and a
successful save only flips the button text to "✓ Salvo" for 2s. The badge
(unwatched count) is recomputed by `background/service-worker.ts` `updateBadge`,
which already fires on every `chrome.storage.sync` change — so saving bumps it
without any new wiring.

## Goals / Non-Goals

**Goals:**
- Make the save control feel on-brand (accent theme) and quirky (sparkle + a `+`
  that rotates on hover) without touching the save/dropdown logic.
- Give the dense "Up next" sidebar its own compact, hover-revealed mini control.
- Confirm saves with a transient, non-blocking toast.
- Keep everything CSS-driven where possible; no new dependencies.

**Non-Goals:**
- No change to the `SAVE_VIDEO` message, the `MyTubeStore` reducer, or the
  storage schema in `src/types.ts`.
- No change to the category-picker dropdown behavior (create-and-save, re-save
  moves, Escape closes).
- No new badge logic — badge bump is verified, not re-implemented.
- No unit tests for DOM injection (stays on Manual acceptance per `specs/README.md`).

## Decisions

**1. Mirror accent tokens as literals in the injected style block.**
The content script can't `@import` `theme-tokens.css`. Rather than ship a second
build step, declare the needed accent values as CSS custom properties at the top
of the injected `<style>` (e.g. `--mytube-accent: oklch(0.815 0.125 290)`),
matching the current `--accent-h: 290` knob. Trade-off: the accent is pinned at
inject time and won't follow a runtime theme change, which is acceptable — the
new-tab theme knob is a build/design-time choice today, not a user setting on
youtube.com. Documented inline with a comment pointing back to `theme-tokens.css`.

*Alternative considered:* read the token via `getComputedStyle` — rejected, the
tokens aren't present in youtube.com's document.

**2. Structure the pill label as discrete glyphs.**
Replace the flat `textContent = '+ Salvar'` with child nodes: an **SVG** 4-point
sparkle (a real shape, not the `✨` emoji — built with `createElementNS` since
YouTube enforces Trusted Types and forbids `innerHTML`), a `+` in its own span,
and the "Salvar" text. The sparkle is **absolutely positioned** at the pill's
top-right corner so it reads as a decorative "extra" and never widens the pill or
disturbs the action-bar row height. Only the `+` span (and the corner sparkle)
carries the `transform: rotate()` transition on `:hover`. This keeps the rotation
isolated and lets `setSavedState` swap to "✓ Salvo" by toggling a class rather
than clobbering the structured markup.

*Refactor note:* `setSavedState` currently sets `btn.textContent` directly; it
must move to setting/clearing inner structure or a `data-state` attribute so the
glyph markup survives the saved/unsaved flips and the cross-context re-sync in
`refreshSavedIds`.

**3. Mini sidebar variant via a CSS class, same injection path.**
`injectButton` already runs for `ytd-compact-video-renderer`. Detect that
selector at inject time and add a `mytube-btn--mini` modifier class; all sizing
and the hover-reveal live in CSS. No second code path — one button factory,
class-driven appearance.

**4. Toast as a single fixed-position element, reused.**
A lazily-created `.mytube-toast` element appended to `document.documentElement`,
positioned `fixed` bottom-right with a high z-index and `pointer-events: none` so
it never blocks the page. `showToast(text)` sets the text, adds a visible class,
and arms a timeout to remove it; re-firing resets the timer. Called only on the
`res.ok` branch of `saveTo`, so a failed save shows nothing.

## Risks / Trade-offs

- **YouTube CSS specificity / dark-theme clashes** → scope every rule under the
  `.mytube-*` classes already used; use `oklch` accent literals so colors are
  predictable regardless of YouTube's theme.
- **Toast `pointer-events`/z-index colliding with YouTube overlays** → keep it
  `pointer-events: none`, bottom-right, and short-lived; it's purely informational
  (the source of truth is the button state + storage).
- **Structured glyph markup vs. `refreshSavedIds` re-sync** → the re-sync path
  toggles state on existing buttons; switching `setSavedState` to class/attribute
  toggling (Decision 2) keeps it compatible. Manual acceptance must verify a
  cross-context edit (save on new-tab) still updates an injected button.
- **Accent pinned at inject time** (Decision 1) → acceptable for now; revisit if a
  user-facing runtime theme switch is added.

## Migration Plan

Pure content-script + CSS change; no data migration. Ships in the next extension
build. Rollback is reverting `content/content.ts`. Verified via the Manual
acceptance checklist in `specs/save-video.spec.md` (extended by this change) and a
quick `npm run test:e2e` smoke that the extension still loads.

## Open Questions

- Toast copy/duration: proposed "Salvo em <category> ✨" at ~2.5s — confirm during
  human spec approval.
- Whether the home-feed card button should also adopt the sparkle/rotate treatment
  or stay as-is (proposal scopes the quirky affordance to the watch pill + mini
  sidebar; home-feed card styling left unchanged unless the human asks).
