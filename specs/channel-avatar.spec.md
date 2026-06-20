<!--
The handshake (CLAUDE.md → "Spec handshake"):
  1. Agent drafts this file with Status: Draft.
  2. Human reviews/edits the criteria and flips Status to Approved.
  3. ONLY THEN may the agent implement (test per criterion → code → green).
-->

# Spec: Channel avatar on the home page

- **Status:** Approved  <!-- Draft → Approved (only a human sets Approved) -->
- **Owner:** dankhael
- **Contract:** extend `Video` in `src/types.ts` with an optional
  `channelThumbnail?: string` (avatar URL). Optional + defaulted-on-read so
  existing saved videos (no avatar) and unknown/garbage values fall back to the
  current initial-letter avatar — no schema migration. Reuses the existing
  `SAVE_VIDEO` message; the content script populates the new field when the
  YouTube DOM exposes the channel photo.
- **Tests:**
  - `src/validate-message.test.ts` — `SAVE_VIDEO` keeps an allowlisted avatar
    host and drops any other URL to `undefined` (mirrors `canonicalThumbnail`).
  - `src/sanitize-storage.test.ts` — a stored video with a bad-host / non-string
    `channelThumbnail` reads back with the field absent (falls back to initial).
  - `newtab/components/VideoCard.test.tsx` (new) — renders the photo when present,
    the initial when absent, and falls back to the initial on image load error.

## Why

The home-page video card already has an avatar slot, but it only shows the first
letter of the channel name (`VideoCard.tsx` → `.avatar`). Showing the real
channel photo makes the saved-video grid scannable and recognizable at a glance,
matching what users see on YouTube itself.

## Where the avatar comes from (constraint, read before approving)

YouTube has **no deterministic per-channel avatar URL keyed by videoId**, and the
oEmbed fallback (`src/metadata.ts`) does not return one — so unlike `thumbnail`
(canonicalized to `i.ytimg.com/vi/<id>/mqdefault.jpg`) the avatar can only be
**captured from the YouTube DOM at save time**. Avatars are served from opaque
Google hosts (`yt3.ggpht.com`, `yt3.googleusercontent.com`, `lh3.googleusercontent.com`).
Because the URL is opaque it can't be canonicalized; instead the worker
**allowlists the host** (SEC-4 style: a non-allowlisted URL is an exfiltration /
tracking-pixel vector and is dropped, never stored). Capture is best-effort: when
the DOM doesn't expose an avatar (many home/search lockups don't), the field stays
empty and the card keeps today's initial-letter avatar.

## Acceptance criteria

Stable IDs (`AVATAR-N`). Each row becomes one `it('AVATAR-N: …')`.

| ID | Given | When | Then |
|---|---|---|---|
| **AVATAR-1** | the `Video` schema | a saved video has no `channelThumbnail` | the field is optional and the app reads it as `undefined` (no migration, existing videos unaffected) |
| **AVATAR-2** | a `SAVE_VIDEO` whose `video.channelThumbnail` points at an allowlisted host (`yt3.ggpht.com`, `yt3.googleusercontent.com`, `lh3.googleusercontent.com`, `https` only) | `validateIncomingMessage` runs | the URL is preserved on the stored video |
| **AVATAR-3** | a `SAVE_VIDEO` whose `channelThumbnail` is a non-allowlisted host, `http`, or non-string | `validateIncomingMessage` runs | the field is dropped to `undefined` (the save still succeeds with the rest of the payload) |
| **AVATAR-4** | a stored snapshot whose video has a bad-host / non-string `channelThumbnail` (synced from another version or hand-edited) | `sanitizeStorageData` runs on read | that video reads back with `channelThumbnail` absent; all other fields pass through byte-identical (SEC-14) |
| **AVATAR-5** | a video with a valid `channelThumbnail` | `VideoCardView` renders | the avatar slot shows an `<img>` with `src` = the URL and `alt` = the channel name |
| **AVATAR-6** | a video with no (or dropped) `channelThumbnail` | `VideoCardView` renders | the avatar slot shows the existing initial-letter fallback (today's behavior, unchanged) |
| **AVATAR-7** | a rendered avatar `<img>` | the image fails to load (`onError`, e.g. 404 / expired URL) | the card falls back to the initial-letter avatar instead of a broken image |

## Out of scope / non-goals

- **Backfilling avatars for already-saved videos.** oEmbed (the only keyless
  lookup we have) returns no avatar, so old saves keep the initial-letter avatar.
- Fetching, caching, or proxying avatar images ourselves (no new network calls
  from the worker; the `<img>` loads the captured URL directly).
- Showing the avatar anywhere other than the home-page card (no popup, no smart
  sections beyond what reuses `VideoCardView`).
- A new permission or host_permission — the `<img>` is a plain cross-origin image
  load, not a `fetch`.
- The DOM-scraping selectors that read the avatar out of YouTube's shifting
  markup live on **Manual acceptance** (the content script isn't unit-tested,
  same as the rest of `extractCard`/`extractWatchPage`).

## Manual acceptance (not unit-tested)

- [ ] Saving a video from a YouTube **home/search card** that shows a channel
      avatar stores the photo; it appears on the MyTube home card.
- [ ] Saving from a **/watch page** stores the channel photo for that video.
- [ ] Saving a card with **no** avatar in the DOM still works and shows the
      initial-letter fallback (no broken image, no console error).
- [ ] An expired/blocked avatar URL on an old save degrades to the initial,
      not a broken-image icon (AVATAR-7 in the live page).

## Decisions needed from owner (before Approved)

1. **Capture source confirmed?** Avatar is scraped from the YouTube DOM at save
   time (no deterministic URL exists). Existing saves are **not** backfilled.
2. **Host allowlist** — `yt3.ggpht.com`, `yt3.googleusercontent.com`,
   `lh3.googleusercontent.com` (https only). Add/remove any?
3. **Fallback** — keep the initial-letter avatar for missing/invalid/errored
   images (vs. a generic silhouette icon)?
