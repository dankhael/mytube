## Context

The home card's avatar slot renders `video.channelName.trim().charAt(0)` — a
single letter ([newtab/components/VideoCard.tsx](../../../newtab/components/VideoCard.tsx)).
The data model carries no channel photo. Three project constraints shape the
design:

1. **No deterministic avatar URL.** `thumbnail` is canonicalized to
   `i.ytimg.com/vi/<id>/mqdefault.jpg` ([src/validate-message.ts](../../../src/validate-message.ts)),
   but channel avatars live at opaque Google host paths with no `videoId` mapping,
   and oEmbed ([src/metadata.ts](../../../src/metadata.ts)) doesn't return one.
2. **The content script runs inside youtube.com** and is the trust boundary's
   untrusted side; the worker validates every `SAVE_VIDEO` (SEC-2).
3. **Extension-pages CSP** currently allows images only from `'self'`,
   `https://i.ytimg.com`, and `data:` ([manifest.config.ts](../../../manifest.config.ts)).

## Goals / Non-Goals

**Goals:**
- Show the real channel photo on the home card when it's available.
- Keep today's initial-letter avatar as the universal fallback (missing /
  invalid / image load error) — never a broken-image icon.
- No new permissions, no new worker network calls, no schema migration.

**Non-Goals:**
- Backfilling avatars for already-saved videos (no keyless source exists).
- Avatars anywhere but the home card (popup, etc.).
- Proxying/caching avatar bytes ourselves.

## Decisions

### D1 — Capture from the DOM at save time, store the URL
The content script reads the channel avatar `<img>` out of the card / watch DOM
in `extractCard` / `extractWatchPage` and ships it on the `SAVE_VIDEO` payload.
**Why:** it's the only source — there's no `videoId → avatar` URL and oEmbed has
none. **Alternative rejected:** resolve channelId → avatar via an API → needs a
key/permission and a worker fetch (a non-goal). Capture is best-effort: a card
with no avatar in the DOM saves fine with the field empty.

### D2 — Host allowlist, not canonicalization
The avatar URL is opaque, so it can't be rewritten to one canonical form like the
thumbnail is. Instead `validateIncomingMessage` keeps it only if it parses as
`https:` with host in `{ yt3.ggpht.com, yt3.googleusercontent.com,
lh3.googleusercontent.com }`, else drops it to `undefined`. **Why:** an arbitrary
stored URL is a tracking-pixel / exfiltration vector (the SEC-4 rationale); the
allowlist is the minimal equivalent for a non-canonicalizable value. The same
predicate gates `channelThumbnail` in `sanitizeStorageData` on read, so a value
synced from another version can't smuggle a bad host past the worker.

### D3 — Optional, defaulted-on-read field
`Video.channelThumbnail?: string`. `isStoredVideo` accepts `undefined` or a
valid string; the top-level spread in `sanitizeStorageData` keeps byte-identical
pass-through for well-formed snapshots (SEC-14). **Why:** additive and
migration-free — old videos simply lack the field and hit the fallback.

### D4 — Extend CSP `img-src` with the avatar hosts
Add `https://yt3.ggpht.com https://yt3.googleusercontent.com
https://lh3.googleusercontent.com` to `img-src`. **Why:** the `<img>` is a
direct cross-origin image load from a privileged page; without this the browser
blocks it. Scoped to `img-src` only — no `connect-src`/`script` exposure.

### D5 — Render with an `onError` fallback
`VideoCardView` shows `<img class="avatar-img" src={channelThumbnail}>` when the
(sanitized) field is present, else the existing `.avatar` initial. An `onError`
handler flips to the initial if the image 404s (expired URL on an old save).
**Why:** the stored URL can rot; the card must degrade, not show a broken image.

## Risks / Trade-offs

- **Avatar URLs expire** (Google rotates them) → `onError` fallback (D5); the
  field is cosmetic, never load-bearing.
- **YouTube DOM shifts** and the avatar selector stops matching → capture
  silently no-ops and the card shows the initial; covered by Manual acceptance,
  consistent with the rest of the content script.
- **CSP widening** lets the new-tab page load images from three more Google
  hosts → bounded to `img-src` (images only, no script/connect), and the worker
  + sanitizer still gate which URLs ever reach an `<img>`.
- **Mixed allowlists** (worker host set vs. CSP host set) drifting apart →
  keep the host list in one shared constant referenced by both validation and
  the manifest where practical.
