<!--
The handshake (see CLAUDE.md → "Workflow"):
  1. Agent drafts this file with Status: Draft.
  2. Human reviews/edits the criteria and flips Status to Approved.
  3. ONLY THEN may the agent implement (test per criterion → code → green).
Do not implement against a Draft. Do not edit Approved criteria without the human.
-->

# Spec: Import videos from a YouTube playlist

- **Status:** Approved  <!-- Draft → Approved (only a human sets Approved) -->
- **Owner:** dankhael
- **Contract:** new `IMPORT_VIDEOS` variant in the `Message` union + a
  `MyTubeStore.importVideos` reducer method — see [src/types.ts](../src/types.ts),
  [src/storage.ts](../src/storage.ts), [src/validate-message.ts](../src/validate-message.ts).
- **Tests:** reducer in [src/storage.test.ts](../src/storage.test.ts); message
  gating in [src/validate-message.test.ts](../src/validate-message.test.ts). The
  content-script scrape/inject behavior is **Manual acceptance** (YouTube DOM).

## Why

People already curate videos in YouTube playlists — Watch Later above all. Today
the only way into MyTube is saving one card at a time. A user on a playlist page
should be able to pull the whole list into a MyTube category in one action,
without re-saving each video by hand.

## Decisions baked into this draft (edit before approving)

> **D1 — Scrape, don't call an API.** Watch Later (`list=WL`) is not exposed by
> the YouTube Data API *at all*, and every other playlist would need OAuth + an API
> key + new host permissions — a direct violation of the least-privilege manifest
> (`security-hardening`: `storage` + `youtube.com` only, no third-party fetches).
> So import reads the rows already rendered into the playlist page's DOM via the
> existing content script. _Alt rejected: YouTube Data API (breaks the security
> model; can't read Watch Later anyway)._
>
> **D2 — Entry point: a button on the playlist page.** Injected into the playlist
> header, next to where the scrape runs. The popup/home tab can't read YouTube's
> DOM, so they can't do the work; the on-page button is the most discoverable
> trigger (chosen over a popup trigger).
>
> **D3 — Any playlist, not just Watch Later.** The affordance shows on any
> `youtube.com/playlist?list=…` page (WL, Liked `LL`, and user/created playlists) —
> identical scrape logic.
>
> **D4 — Pick a target category first.** Reuse the existing category dropdown
> (incl. "+ Nova categoria"); the whole playlist imports into the one chosen
> category. _Alt rejected: auto-create a category named after the playlist
> (category sprawl)._
>
> **D5 — Batch commit, not N saves.** A single `IMPORT_VIDEOS` message stores the
> whole list in one read-modify-write (one `backend.write`). Looping `SAVE_VIDEO`
> would fire N messages, N commits, churn the sync quota, and serialize through the
> mutex one-by-one. _Alt rejected: reuse `SAVE_VIDEO` per row._
>
> **D6 — Re-import moves, never duplicates.** A row whose id is already saved is
> moved to the chosen category (consistent with `SAVE-3`), not added twice.

## Acceptance criteria

Stable IDs (`IMPORT-N`). Each row becomes one `it('<ID>: …')`. Reducer + gating
rows are unit-tested; `IMPORT-DOM-N` rows are **Manual acceptance** (YouTube DOM).

| ID | Given | When | Then |
|---|---|---|---|
| **IMPORT-1** | an empty store | `importVideos([v1, v2, v3], 'Música')` | all three are stored with `category: 'Música'`, an `addedAt`, and `watched: false`, in a **single** `backend.write` |
| **IMPORT-2** | a store whose categories don't include `'Música'` | `importVideos([v1], 'Música')` | the `'Música'` category is created (once) and `v1` lands in it |
| **IMPORT-3** | `v1` already saved in category `'A'` | `importVideos([v1], 'B')` | `v1` is **moved** to `'B'` (its `category` updates), not duplicated — only one entry for that id remains, and `addedAt`/`watched` are preserved |
| **IMPORT-4** | an empty store | `importVideos([v1, v2, v3], 'C')` | the imported videos appear at the **front** of `videos` in the given array order (`v1` before `v2` before `v3`) |
| **IMPORT-5** | an import payload containing the same id twice | `importVideos([v1, v1dup], 'C')` | exactly **one** entry is stored for that id (later occurrence's fields win) |
| **IMPORT-6** | any store | `importVideos([], 'C')` | it is a no-op: the returned snapshot's `videos`/`categories` are unchanged and no spurious category is created |
| **IMPORT-7** | an `IMPORT_VIDEOS` message with a mix of valid and badly-shaped (`id` not 11 chars) entries | it passes `validateIncomingMessage` | invalid entries are **dropped**; valid ones survive — one garbage row never fails the whole import |
| **IMPORT-8** | a valid `IMPORT_VIDEOS` entry | it passes validation | its `thumbnail` is canonicalized to the `mqdefault` URL, `title`/`channelName` are clamped to `MAX_TEXT_LENGTH`, and `channelThumbnail` is kept only if it's an allowlisted avatar host (same gating as `SAVE_VIDEO`) |
| **IMPORT-9** | an `IMPORT_VIDEOS` message whose every entry is invalid | it passes validation | it resolves to an empty import (a safe no-op), not a rejection of the whole message |

## Manual acceptance (not unit-tested)

Content-script DOM — verify by hand on YouTube.

- [ ] **IMPORT-DOM-1** — On a `youtube.com/playlist?list=…` page, an "Importar para MyTube" button appears in the playlist header.
- [ ] **IMPORT-DOM-2** — The button is **not** shown on non-playlist pages (home, watch, search, channel).
- [ ] **IMPORT-DOM-3** — Clicking it opens the existing category picker (themed dropdown), including "+ Nova categoria".
- [ ] **IMPORT-DOM-4** — Choosing a category scrapes the loaded playlist rows and imports them; a toast reports how many were imported (e.g. "47 vídeos importados").
- [ ] **IMPORT-DOM-5** — Before scraping, the script best-effort auto-scrolls to load more rows; a very large playlist may import only the rows YouTube has rendered (documented limitation — see Out of scope).
- [ ] **IMPORT-DOM-6** — Works on Watch Later (`list=WL`), Liked videos (`list=LL`), and a normal created playlist.
- [ ] **IMPORT-DOM-7** — Each scraped row yields a real id, title, channel, and `mqdefault` thumbnail (no `MISSING_*` placeholders for rows whose data is present in the DOM).
- [ ] **IMPORT-DOM-8** — After import, the imported videos show on the new-tab home in the chosen category; revisiting their cards on YouTube shows the `✓ Salvo` state.
- [ ] No regression: the per-card "+ Salvar" button, the watch pill, the toast, and the badge still work.

## Out of scope / non-goals

- **No** OAuth, **no** YouTube Data API, **no** new manifest permissions or hosts.
- **No** background/automatic playlist sync — import is a one-shot manual action;
  later changes to the YouTube playlist are not mirrored.
- **No** writing back to YouTube (not removing videos from the playlist, not
  un-Watch-Later-ing them).
- **No** guaranteed completeness for huge playlists beyond best-effort auto-scroll
  (IMPORT-DOM-5). Reliable pagination of thousands of rows is a follow-up.
- **No** popup/home-tab entry point in this spec (D2). Could be added later as a
  convenience that focuses/links to the playlist page.
- **No** import of playlists the signed-in user can't see (private playlists of
  others) — we only read what the page renders.
