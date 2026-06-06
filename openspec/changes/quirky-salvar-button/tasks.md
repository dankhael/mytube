## 1. Spec handshake (human-owned)

- [x] 1.1 Extend `specs/save-video.spec.md` (or add `specs/salvar-button.spec.md`) with Draft criteria mirroring the delta: themed pill (`SALVAR-THEME`), plus-rotates-on-hover (`SALVAR-ROTATE`), mini sidebar control (`SALVAR-MINI`), toast on save (`SALVAR-TOAST`), badge bump (`SALVAR-BADGE`)
- [x] 1.2 Put the DOM/CSS behaviors on the **Manual acceptance** table (not unit tests), per `specs/README.md`
- [x] 1.3 Get a human to review and flip `Status: Approved` before any code (CLAUDE.md handshake) — do NOT implement against Draft

## 2. Accent theming for the watch pill

- [x] 2.1 Add accent CSS custom properties at the top of the injected `<style>` block in [content/content.ts](../../../content/content.ts), mirroring `--accent-h: 290` from `styles/theme-tokens.css`, with a comment linking back to the token source
- [x] 2.2 Restyle `.mytube-watch-btn` (and its `:hover`/`.mytube-saved` states) to use the accent variables instead of hardcoded `#272727`/`#ff0000`
- [ ] 2.3 Manually verify on a `/watch` page the pill renders in the MyTube accent color and the saved state is still distinguishable (`SALVAR-THEME`) — _human, on YouTube_

## 3. Quirky sparkle + rotating plus

- [x] 3.1 Replace the flat `+ Salvar` text with structured spans: sparkle (`✨`), a `+` span, and the "Salvar" label
- [x] 3.2 Refactor `setSavedState` to toggle a class / `data-state` instead of clobbering `textContent`, so the glyph markup survives saved/unsaved flips and the `refreshSavedIds` re-sync
- [x] 3.3 Add a CSS `:hover` rule on the pill that rotates only the `+` span (transform + transition); confirm it does not interfere with click-to-open-dropdown (`SALVAR-ROTATE`) — _CSS `transform` on the span only; click handler is on the button, hit area unchanged_

## 4. Mini Salvar on the Up next sidebar

- [x] 4.1 In `injectButton`, detect `ytd-compact-video-renderer` cards and add a `mytube-btn--mini` modifier class
- [x] 4.2 Add CSS for the mini variant: smaller size, hidden by default, revealed on card hover, positioned to not crowd the dense sidebar
- [ ] 4.3 Manually verify hovering an "Up next" thumbnail reveals the mini control and clicking it opens the same category picker (`SALVAR-MINI`) — _human, on YouTube_

## 5. Toast confirmation

- [x] 5.1 Add a lazily-created `.mytube-toast` element on `document.documentElement` (fixed, bottom-right, high z-index, `pointer-events: none`) plus its CSS
- [x] 5.2 Add a `showToast(text)` helper that sets text, shows the toast, and arms an auto-dismiss timeout (resetting on re-fire)
- [x] 5.3 Call `showToast("Salvo em <category> ✨")` only on the `res.ok` branch of `saveTo`; confirm a failed save shows nothing (`SALVAR-TOAST`) — _call is inside the `if (res.ok)` branch only_

## 6. Badge bump verification

- [x] 6.1 Confirm in [background/service-worker.ts](../../../background/service-worker.ts) that `updateBadge` fires via the `storage.onChanged` listener with no code change needed — _confirmed at service-worker.ts:69-71 (onChanged) and :78-81 (SAVE_VIDEO handler); no change needed_
- [ ] 6.2 Manually verify saving a new (unwatched) video increments the toolbar badge, and a re-save (move) does not double-count (`SALVAR-BADGE`) — _human, on YouTube_

## 7. Regression & smoke

- [x] 7.1 Run `npm test` — reducer/component specs stay green (no contract change expected) — _75 passed; `tsc --noEmit` clean_
- [ ] 7.2 Run `npm run test:e2e` smoke to confirm the built extension still loads cleanly — _`npm run build` verified clean (tsc + vite, content bundle built); headed-Chromium Playwright run left for the human_
- [ ] 7.3 Walk the full Manual acceptance checklist in the approved spec — _human; see specs/salvar-button.spec.md_

## 8. Bugfix: non-destructive injection (SALVAR-NOEXPAND)

- [x] 8.1 Anchor over `ytd-thumbnail` first and only set `position: relative` when the host is `static`, so injecting no longer forces `#thumbnail`'s auto-height `<a>` to be the offset parent (which ballooned search-result thumbnails)
- [ ] 8.2 Manually verify on the search page that thumbnails keep native size with the extension on (`SALVAR-NOEXPAND`) — _human, on YouTube_

## 9. Bugfix: watch-page dropdown was clipped

- [x] 9.1 The category dropdown opened invisibly because moving the pill into `#top-level-buttons-computed` (for alignment) placed it inside YouTube's `overflow:hidden` menu-renderer. Portal the dropdown to `<html>` with `position: fixed`, anchored to the button rect (`positionDropdown`); update the toggle checks and click-outside handler for the portaled menu
- [ ] 9.2 Manually verify clicking the watch pill opens the category menu, picking a category saves + toasts, and clicking outside closes it
