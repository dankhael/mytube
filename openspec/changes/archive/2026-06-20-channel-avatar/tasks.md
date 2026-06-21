## 1. Contract (types + shared allowlist)

- [x] 1.1 Add optional `channelThumbnail?: string` to `Video` in `src/types.ts`
- [x] 1.2 Add a shared `AVATAR_HOSTS` constant + `isAllowedAvatarUrl(value): boolean` helper (https-only, host in `{yt3.ggpht.com, yt3.googleusercontent.com, lh3.googleusercontent.com}`) so validation, sanitize, and the manifest reference one list

## 2. Worker-boundary validation (AVATAR-2, AVATAR-3)

- [x] 2.1 Write failing `src/validate-message.test.ts` cases: allowlisted `channelThumbnail` kept; non-allowlisted host / `http:` / non-string dropped to `undefined` while the rest of the save succeeds
- [x] 2.2 Extend `validatedSaveVideo` in `src/validate-message.ts` to gate `video.channelThumbnail` via `isAllowedAvatarUrl`; green

## 3. Sanitize-on-read (AVATAR-1, AVATAR-4)

- [x] 3.1 Write failing `src/sanitize-storage.test.ts` cases: stored video with bad-host / non-string `channelThumbnail` reads back with the field absent; well-formed snapshot still passes through byte-identical
- [x] 3.2 Extend `isStoredVideo` / video sanitizing in `src/sanitize-storage.ts` to drop an invalid `channelThumbnail`; green

## 4. Capture at save time (content script)

- [x] 4.1 Read the channel avatar `<img>` URL in `extractCard` (feed/search/sidebar selectors) and set it on `CardData.channelThumbnail`
- [x] 4.2 Read the channel avatar URL in `extractWatchPage` for the open `/watch` video
- [x] 4.3 Include `channelThumbnail` in the `SAVE_VIDEO` payload built in `openDropdown` / `saveTo`

## 5. Render on the home card (AVATAR-5, AVATAR-6, AVATAR-7)

- [x] 5.1 Write failing `newtab/components/VideoCard.test.tsx`: renders `<img>` (src+alt) when `channelThumbnail` present; renders initial when absent; `onError` falls back to the initial
- [x] 5.2 Update `VideoCardView` to render the avatar image with an `onError` → initial fallback; add the `.avatar-img` styling; green

## 6. CSP + manifest

- [x] 6.1 Extend `img-src` in `manifest.config.ts` with the three avatar hosts (reuse `AVATAR_HOSTS`); update the CSP comment

## 7. Verify

- [x] 7.1 Run `npm test` (reducer + components) green
- [ ] 7.2 Walk the Manual acceptance checklist in `specs/channel-avatar.spec.md` against the built extension (home card, watch page, no-avatar fallback, expired-URL fallback)
