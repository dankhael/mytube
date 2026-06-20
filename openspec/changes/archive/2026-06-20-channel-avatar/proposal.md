## Why

The home-page video card only shows the first letter of the channel name in its
avatar slot ([newtab/components/VideoCard.tsx](../../../newtab/components/VideoCard.tsx)).
Showing the real channel photo makes the saved-video grid scannable and
recognizable at a glance, matching what users already see on YouTube.

## What Changes

- The content script captures the channel avatar URL from the YouTube DOM at
  **save time** (home/search cards and the `/watch` page). There is no
  deterministic per-`videoId` avatar URL, and oEmbed returns none, so capture is
  best-effort — when the DOM exposes no avatar the field stays empty.
- `Video` gains an optional `channelThumbnail?: string`. Optional and
  defaulted-on-read, so existing saved videos and unknown values fall back to the
  current initial-letter avatar — no schema migration.
- The service worker **allowlists the avatar host** on `SAVE_VIDEO` the same way
  thumbnails are canonicalized today (SEC-4): a URL outside
  `yt3.ggpht.com` / `yt3.googleusercontent.com` / `lh3.googleusercontent.com`
  (https only) is dropped to `undefined`. `sanitizeStorageData` enforces the same
  on read for snapshots synced from other versions.
- **BREAKING (CSP):** the extension-pages `img-src` is extended with the avatar
  hosts so the new-tab `<img>` can load them; today's CSP allows only `'self'`,
  `https://i.ytimg.com`, and `data:`, which would block the avatar.
- `VideoCardView` renders the photo when present and falls back to the
  initial-letter avatar when the field is missing, invalid, or the image errors.

## Capabilities

### New Capabilities

_None — this extends existing capabilities; no new spec directory._

### Modified Capabilities

- `save-from-youtube`: the captured card/watch payload and the `SAVE_VIDEO`
  message gain a validated `channelThumbnail`; capture is best-effort from the DOM.
- `curated-home`: the home card renders the channel photo with an initial-letter
  fallback (missing / invalid / load error).
- `extension-security`: the `SAVE_VIDEO` validation host-allowlists the avatar
  URL, and the extension-pages CSP `img-src` adds the avatar hosts.

## Impact

- **Code:** `src/types.ts` (`Video`), `src/validate-message.ts` (+ test),
  `src/sanitize-storage.ts` (+ test), `content/content.ts` (avatar scraping in
  `extractCard` / `extractWatchPage`), `newtab/components/VideoCard.tsx`
  (+ new `VideoCard.test.tsx`), `manifest.config.ts` (CSP `img-src`).
- **APIs / messages:** `SAVE_VIDEO` payload extended (additive, optional).
- **Permissions:** no new `permissions` / `host_permissions`; only the CSP
  `img-src` list grows. No new network requests from the worker (the `<img>`
  loads the captured URL directly).
- **Data:** additive optional field; old snapshots round-trip unchanged.
