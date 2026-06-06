## 1. Spec handshake (human-owned)

- [x] 1.1 Draft `specs/salvar-home-and-suggestions.spec.md` from this change: themed home/search overlay button (`HOME-THEME`), mini Salvar on the current watch-suggestions renderer (`SUGGEST-MINI`), and extraction works for the lockup renderer (`SUGGEST-EXTRACT`)
- [x] 1.2 Put the DOM/CSS behaviors on the **Manual acceptance** table, per `specs/README.md`
- [x] 1.3 Get a human to review and flip `Status: Approved` before any code (CLAUDE.md handshake) — do NOT implement against Draft
- [x] 1.4 Confirm `quirky-salvar-button` is archived (or sequence this after it) so both changes don't fold conflicting deltas into the same requirement — _PR #3 merged (commit 8a3d18b in master); this branch is stacked on it_

## 2. Confirm the live sidebar renderer

- [x] 2.1 On a `/watch` page, probe `#secondary, ytd-watch-next-secondary-results-renderer` for the repeated child tag the suggestions actually use; record the exact selector — _confirmed: `yt-lockup-view-model` in `#secondary div#contents` (×20); not nested in home cards_
- [x] 2.2 Verify `extractCard` resolves id/title/channel/thumbnail for that renderer; extend the lockup fallbacks if any field comes back as `MISSING_*` (`SUGGEST-EXTRACT`) — _id/title/thumbnail already resolved; added `.ytContentMetadataViewModelMetadataText` (camelCase) for the channel — YouTube's lockup dropped the kebab BEM class_

## 3. Inject the mini Salvar on suggestions

- [x] 3.1 Add the confirmed sidebar renderer tag to `CARD_SELECTORS` — _added `yt-lockup-view-model` + a nested-card guard in `injectButton` to prevent double-injection_
- [x] 3.2 Change the mini detection in `injectButton` from `card.matches('ytd-compact-video-renderer')` to a sidebar-ancestor check (`card.closest('#secondary, ytd-watch-next-secondary-results-renderer')`) so the lockup renderer isn't shrunk on the home feed
- [ ] 3.3 Manually verify hovering a watch-page suggestion reveals the mini control and clicking it opens the category picker (`SUGGEST-MINI`)

## 4. Theme the home/search overlay button

- [x] 4.1 Apply the accent background + `--mytube-accent-ink` text to the base `.mytube-btn`, keeping a shadow/border for legibility over thumbnails — _shadow scoped to `:not(.mytube-watch-btn)` so the watch pill is unchanged_
- [x] 4.2 Show the corner sparkle and enable the `+` rotate-on-hover for the base `.mytube-btn` (not just watch/mini)
- [x] 4.3 Keep the `.mytube-saved` state visually distinct on the themed overlay — _dark bg + accent text/border vs. the bright accent unsaved_
- [ ] 4.4 Manually verify the home-feed (and search) button matches the watch pill's look and stays legible over bright and dark thumbnails (`HOME-THEME`) — _human, on YouTube_

## 5. Regression & smoke

- [x] 5.1 Run `npm test` — reducer/component specs stay green (no contract change expected) — _75 passed; `tsc --noEmit` clean; build clean_
- [ ] 5.2 Run `npm run test:e2e` smoke to confirm the built extension still loads cleanly
- [ ] 5.3 Re-verify no thumbnail expansion regression (`SALVAR-NOEXPAND`) and that the watch pill/toast/badge still work
