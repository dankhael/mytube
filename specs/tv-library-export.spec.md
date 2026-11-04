<!--
The handshake (see CLAUDE.md → "Workflow"):
  1. Agent drafts this file with Status: Draft.
  2. Human reviews/edits the criteria and flips Status to Approved.
  3. ONLY THEN may the agent implement (test per criterion → code → green).
Do not implement against a Draft. Do not edit Approved criteria without the human.
-->

# Spec: TV library export format

- **Status:** Draft  <!-- Draft → Approved (only a human sets Approved) -->
- **Owner:** dankhael
- **Contract:** new `TvLibrary` / `TvCategory` / `TvVideo` types in
  [src/types.ts](../src/types.ts). No new `Message` variant, no `StorageData` change.
- **Tests:** `src/tv-library.test.ts` (new, next to `src/tv-library.ts`).

## Why

The owner wants to browse their MyTube library on a Samsung Q60B (Tizen 6.5), read-only
at first. The TV cannot run the extension or read `chrome.storage.sync`, so it needs the
library as a versioned JSON document. This spec defines only that document and the pure
function that produces it. It is the first step, so the risky TV side can be validated
against a hand-filled file before the published extension changes.

## Format (v1)

```json
{
  "version": 1,
  "exportedAt": 1793750400000,
  "categories": [
    {
      "name": "Tutorials",
      "videos": [
        {
          "id": "dQw4w9WgXcQ",
          "title": "Never Gonna Give You Up",
          "channelName": "Rick Astley",
          "duration": "3:33",
          "watched": false
        }
      ]
    }
  ]
}
```

## Acceptance criteria

`toTvLibrary(data: StorageData, now: number): TvLibrary`, where `now` is epoch ms.

| ID | Given | When | Then |
|---|---|---|---|
| **TVLIB-1** | a library with categories `[A, B]` | `toTvLibrary(data, now)` | `version` is `1`, `exportedAt` is `now`, and `categories` lists `A` then `B` |
| **TVLIB-2** | a category holding videos `x`, `y` in stored order, each with a duration | `toTvLibrary(data, now)` | its `videos` are `x`, `y` in that order, and each has exactly the keys `id`, `title`, `channelName`, `duration`, `watched` |
| **TVLIB-3** | a video with no `duration` | `toTvLibrary(data, now)` | that video has no `duration` key (not `null`, not `''`) |
| **TVLIB-4** | a library with non-default settings and category icons | `toTvLibrary(data, now)` | the document's keys are exactly `version`, `exportedAt`, `categories`, and each category's keys are exactly `name`, `videos` |
| **TVLIB-5** | `settings.language` is `pt-BR` and categories are `Uncategorized` and `Música` | `toTvLibrary(data, now)` | their names are `Sem categoria` and `Música` (same label rule as `categoryLabel`, DEFCAT-4) |
| **TVLIB-6** | a category with no videos | `toTvLibrary(data, now)` | it is kept, with `videos: []` |
| **TVLIB-7** | a video whose `category` is not in `categories` | `toTvLibrary(data, now)` | the video is not exported, matching `groupVideosByCategory` in the popup |
| **TVLIB-8** | the checked-in `docs/tv/library.sample.json` and its input fixture | the sample is parsed | it deep-equals `toTvLibrary(fixture, sample.exportedAt)`, so the sample can't drift from the format |

## Decisions

- **Categories nest their videos.** One category is one TV shelf, so the TV does no
  grouping. The extension reuses `groupVideosByCategory`, which moves from `popup/groups.ts`
  to `src/` so `src` doesn't import from `popup`.
- **No thumbnail.** It is derived from the id (`i.ytimg.com/vi/<id>/mqdefault.jpg`).
- **Title, channel and duration travel in the document.** The TV then needs no oEmbed
  call, and duration couldn't be recovered from oEmbed anyway. A video still awaiting
  backfill exports its stored placeholder title unchanged.
- **`watched` is included** beyond the fields first proposed. Without it, the TV can't
  dim or hide what the owner has already seen.
- **`exportedAt` is included** so a stale TV can be told apart from a broken one: raw
  Gist responses are cached (`max-age=300`, checked 2026-11-03). `now` is a parameter so
  the function stays pure and repeatable.
- **`name` is the display label.** The TV only shows it. If the TV later writes, a stable
  `key` can be added without breaking v1.
- **Empty categories are kept.** The document mirrors the library; hiding empty shelves
  is the TV's presentation choice.
- **Versioning.** New optional fields keep `version: 1`, and readers ignore unknown keys.
  Removing or redefining a field bumps `version`, and readers refuse a version they don't
  know.

## Out of scope / non-goals

- **Pushing the document anywhere.** Nothing calls `toTvLibrary` yet, so the published
  extension's behavior, permissions and privacy policy don't change. The automatic mirror
  gets its own spec, and must address:
  - `connect-src` in the CSP allows only `www.youtube.com` (`manifest.config.ts`).
  - A new host needs a host permission; `optional_host_permissions` should be evaluated
    so existing installs aren't disabled by a new permission warning.
  - `docs/PRIVACY.md` promises data is "never sent to the developer or to any third-party
    server" and that YouTube oEmbed is the only network request. Both need rewording, plus
    the store disclosure.
  - Any token belongs in `chrome.storage.local`, never `sync`.
- **The TV module.** TizenBrew modules are standalone npm/GitHub packages, so it lives in
  its own repository.
- **TV writes** (mark watched, remove, move).
- **Choosing the host** (Gist vs self-hosted).

## Manual acceptance (not unit-tested)

Gate before starting the mirror spec. Checked on the real Q60B, with the sample in a Gist:

- [ ] A `mods` module on `youtube.com/tv` fetches the Gist and logs its `version`.
- [ ] The module renders a shelf using DOM APIs (the page enforces
      `require-trusted-types-for 'script'`, so string `innerHTML` is expected to fail).
- [ ] Selecting a video opens it in YouTube TV's own player.
