<!--
The handshake (CLAUDE.md → "Spec handshake"):
  1. Agent drafts this file with Status: Draft.
  2. Human reviews/edits the criteria and flips Status to Approved.
  3. ONLY THEN may the agent implement (test per criterion → code → green).
-->

# Spec: Video duration badge on the home card

- **Status:** Approved  <!-- Draft → Approved (only a human sets Approved) -->
- **Owner:** dankhael
- **Contract:** extend `Video` in `src/types.ts` with an optional
  `duration?: string` — the video's clock label as YouTube shows it
  (`"12:34"`, `"1:02:03"`). Optional + gated-on-read so existing saved videos
  (no duration) and unknown/garbage values fall back to today's badge-less
  thumbnail — no schema migration. Reuses the existing `SAVE_VIDEO` /
  `IMPORT_VIDEOS` messages (their payload is `Omit<Video, …>`, so the field
  flows through unchanged); the content script populates it when the YouTube
  DOM exposes the duration overlay.
- **Tests:**
  - `src/validate-message.test.ts` — a `SAVE_VIDEO` whose `duration` is a
    well-shaped clock label is preserved; a malformed / non-string / oversized
    one is dropped to `undefined` (the save still succeeds).
  - `src/sanitize-storage.test.ts` — a stored video with a malformed `duration`
    reads back with the field absent; all other fields pass through
    byte-identical (SEC-14).
  - `newtab/components/VideoCard.test.tsx` — the card renders the duration
    badge with the label text when present, and renders no badge when absent.

## Why

A saved-video grid is easier to plan around when each thumbnail shows how long
the video is — the same corner badge YouTube itself puts on every card. Today
the MyTube home card shows title, channel and watched state but nothing about
length, so the user can't tell a 3-minute clip from a 2-hour stream without
opening it.

## Where the duration comes from (constraint, read before approving)

Like the channel avatar ([channel-avatar.spec.md](./channel-avatar.spec.md)),
duration has **no deterministic source keyed by videoId**: the canonical
thumbnail URL carries no length, and the oEmbed fallback (`src/metadata.ts`)
does not return one. So it can only be **captured from the YouTube DOM at save
time**, from the card's duration overlay
(`ytd-thumbnail-overlay-time-status-renderer` / the newer `.badge-shape` text).
Capture is best-effort: Shorts, live, and upcoming videos show no clock label
(they show "LIVE" / "SHORTS" / a schedule instead), and some lockups omit the
overlay — in all those cases the field stays empty and the card renders exactly
as it does today, with no badge.

Because the value is rendered as **text** (React escapes it — no HTML sink), the
security concern is not injection but storing plausible, bounded data: the
worker keeps `duration` only if it matches a strict clock shape
(`H:MM:SS` / `MM:SS` / `M:SS`) and drops anything else, mirroring the
host-allowlist gate SEC-4/AVATAR-3 apply to the avatar URL.

## Acceptance criteria

Stable IDs (`DUR-N`). Each row becomes one `it('DUR-N: …')`.

| ID | Given | When | Then |
|---|---|---|---|
| **DUR-1** | the `Video` schema | a saved video has no `duration` | the field is optional and reads back as `undefined` (no migration; existing videos unaffected) |
| **DUR-2** | a `SAVE_VIDEO` whose `video.duration` matches a clock shape (`"9:59"`, `"12:34"`, `"1:02:03"`) | `validateIncomingMessage` runs | the label is preserved on the stored video |
| **DUR-3** | a `SAVE_VIDEO` whose `duration` is malformed (`"LIVE"`, `"1:2:3"`, `"12:3"`), non-string, or longer than the clamp bound | `validateIncomingMessage` runs | the field is dropped to `undefined` (the save still succeeds with the rest of the payload) |
| **DUR-4** | an `IMPORT_VIDEOS` batch mixing valid and malformed `duration` values | `validateIncomingMessage` runs | each entry is gated independently — valid labels kept, malformed dropped — with no entry rejected for a bad duration |
| **DUR-5** | a stored snapshot whose video has a malformed / non-string `duration` (synced from another version or hand-edited) | `sanitizeStorageData` runs on read | that video reads back with `duration` absent; all other fields pass through byte-identical (SEC-14) |
| **DUR-6** | a video with a valid `duration` | `VideoCardView` renders | the thumbnail shows a duration badge whose text is the label |
| **DUR-7** | a video with no (or dropped) `duration` | `VideoCardView` renders | no duration badge is in the DOM (today's thumbnail, unchanged) |

## Decisions

- **Store the display string, not seconds.** YouTube already formats the label
  exactly as we want to show it, and a clock label (`12:34`) is language-neutral
  (digits + colons), so there's no i18n reason to parse to seconds and reformat.
  Storing the string keeps the change to one gated field with zero parse/format
  code — the same shape as `channelThumbnail`.
- **Clock-shape gate as the validator.** `isDurationLabel` accepts
  `/^(?:\d{1,3}:)?\d{1,2}:\d{2}$/` (optional hours, then `M:SS` / `MM:SS`),
  which also bounds the length; everything else — `"LIVE"`, empty, non-string,
  a pasted essay — is dropped. This is the `isAllowedAvatarUrl` analogue for a
  non-URL field.
- **Badge placement: bottom-right of `.vthumb`.** The top-left corner is taken
  by the watched tag / unwatched dot and the top-right by the hover actions, so
  bottom-right is the only free corner — and it's where YouTube puts it. The
  existing bottom scrim gradient already darkens that area for legibility.

## Out of scope / non-goals

- **Backfilling duration for already-saved videos.** oEmbed (the only keyless
  lookup we have) returns no duration, so old saves keep the badge-less card.
- Parsing/normalizing the label, or showing it anywhere other than the home
  card (no popup, no smart-section-only surface beyond what reuses
  `VideoCardView`).
- Showing a badge for Shorts / live / upcoming videos — they expose no clock
  label, so they intentionally get no badge.
- Capturing duration on the `/watch` page or the hover-preview overlay is
  best-effort only (those surfaces often omit the overlay); it is not a
  required criterion and is left to Manual acceptance.
- The DOM-scraping selectors that read the overlay out of YouTube's shifting
  markup live on **Manual acceptance** (the content script isn't unit-tested,
  same as the rest of `extractCard`).

## Manual acceptance (not unit-tested)

- [ ] Saving a normal YouTube **feed/search card** stores its duration; the
      label appears bottom-right on the MyTube home card, matching YouTube.
- [ ] Saving a **Short / live / upcoming** video still works and shows no
      duration badge (no `"LIVE"` text, no broken badge).
- [ ] Importing a **playlist** carries each row's duration onto its home card.
- [ ] The badge is legible over light and dark thumbnails and doesn't collide
      with the watched tag (top-left) or the hover actions (top-right).

## Decisions needed from owner (before Approved)

1. **Capture source confirmed?** Duration is scraped from the YouTube card's
   duration overlay at save time (no deterministic URL/API exists). Existing
   saves are **not** backfilled.
2. **Store the label string** (`"12:34"`) rather than seconds — confirm this is
   acceptable (vs. storing an integer and formatting in the UI).
3. **Badge corner** — bottom-right of the thumbnail (YouTube-style). OK, or
   prefer another corner?
4. **/watch + hover-preview capture** — keep as best-effort (Manual acceptance),
   or make watch-page capture a hard criterion too?
