# Spec: Security hardening (findings S1–S9)

- **Status:** Approved (implemented — SEC-1..SEC-19 green 2026-06-10; manual
  acceptance below still to be checked by hand)
- **Owner:** dankhael
- **Contract:** `Message` union + `StorageData` in [src/types.ts](../src/types.ts);
  new pure modules `src/validate-message.ts` and `src/sanitize-storage.ts`;
  `fetchVideoMetadata` in [src/metadata.ts](../src/metadata.ts).
- **Tests:** `src/validate-message.test.ts`, `src/sanitize-storage.test.ts`,
  [src/metadata.test.ts](../src/metadata.test.ts).
- **Change:** [openspec/changes/harden-extension-security](../openspec/changes/harden-extension-security/proposal.md)
  (closes findings S1–S9 of [docs/security-memory-review.md](../docs/security-memory-review.md)).

## Why

MyTube's trust boundaries are compile-time only: the service worker accepts any
`Message` shape from a content script running inside youtube.com, and stored
sync snapshots are cast unchecked. This spec makes the contract true at runtime —
at the `handle()` choke point and on every snapshot read — plus bounds the
oEmbed fetch. Zero user-visible behavior change.

## Acceptance criteria

Pure functions in `src/validate-message.ts` (`isYoutubeVideoId`,
`canonicalThumbnail`, `isIconKey`, `clampText`, `validateIncomingMessage`),
`src/sanitize-storage.ts` (`sanitizeStorageData`), and the timeout in
`src/metadata.ts`. Clamp length is 300 characters (real YouTube titles are
≤ 100; clamp — never reject — so saves can't fail on length).

| ID | Given | When | Then |
|---|---|---|---|
| **SEC-1** | the id `dQw4w9WgXcQ` (11 chars of `[\w-]`) | `isYoutubeVideoId(id)` | returns `true` |
| **SEC-2** | `''`, a 10-char id, a 12-char id, `'<script>abc'`, `'aaaa?bbbbbb'`, a non-string | `isYoutubeVideoId(value)` | returns `false` for every one |
| **SEC-3** | a valid id and a candidate exactly `https://i.ytimg.com/vi/<id>/mqdefault.jpg` | `canonicalThumbnail(id, candidate)` | returns the candidate unchanged |
| **SEC-4** | a valid id and any other candidate (another host, another video's ytimg URL, `''`) | `canonicalThumbnail(id, candidate)` | returns `https://i.ytimg.com/vi/<id>/mqdefault.jpg` derived from the id |
| **SEC-5** | every member of `ALL_ICONS` | `isIconKey(key)` | returns `true` |
| **SEC-6** | `'skull'`, `''`, `undefined`, `42` | `isIconKey(value)` | returns `false` for every one |
| **SEC-7** | a 400-char string; a 300-char string | `clampText(value)` | returns the first 300 chars; returns the 300-char string unchanged |
| **SEC-8** | a `SAVE_VIDEO` whose `video.id` fails the shape | `validateIncomingMessage(msg)` | returns `{ ok: false, error }` with the offending id and the expected shape `/^[\w-]{11}$/` named in `error` |
| **SEC-9** | `DELETE_VIDEO`, `MOVE_VIDEO`, `MARK_WATCHED`, each with a malformed `id` | `validateIncomingMessage(msg)` | each is rejected as in SEC-8 |
| **SEC-10** | a `SAVE_VIDEO` exactly as the content script sends today (valid id, canonical thumbnail, short texts) | `validateIncomingMessage(msg)` | returns `{ ok: true, message }` with `message` deep-equal to the input |
| **SEC-11** | a `SAVE_VIDEO` with a valid id and a non-canonical `thumbnail` | `validateIncomingMessage(msg)` | ok; `message.video.thumbnail` is the canonical URL for that id |
| **SEC-12** | `ADD_CATEGORY` / `UPDATE_CATEGORY` with `icon: 'skull'` (outside the closed set) | `validateIncomingMessage(msg)` | ok; `icon` is `undefined` in the validated message |
| **SEC-13** | a `SAVE_VIDEO` with 400-char `title`, `channelName` and `category`, and an `ADD_CATEGORY` with a 400-char `name` | `validateIncomingMessage(msg)` | ok; each storage-bound text field is truncated to 300 chars |
| **SEC-14** | a well-formed `StorageData` snapshot | `sanitizeStorageData(raw)` | returns a byte-identical result (`JSON.stringify` equal — no field reordering or dropping) |
| **SEC-15** | `undefined`, `null`, `42`, `{}`, `{ videos: 'nope' }` | `sanitizeStorageData(raw)` | returns a valid `StorageData` built from the existing defaults; never throws |
| **SEC-16** | a snapshot whose `videos` mixes valid videos with malformed entries (`null`, missing `id`, numeric `title`) | `sanitizeStorageData(raw)` | keeps the valid videos in order and drops only the malformed entries |
| **SEC-17** | a snapshot category carrying `icon: 'skull'` | `sanitizeStorageData(raw)` | the category is kept with `icon` unset (same fallback as a missing icon) |
| **SEC-18** | a fake `fetch` that rejects with a `TimeoutError` (what `AbortSignal.timeout` raises) | `fetchVideoMetadata(id)` | resolves `null` (existing best-effort failure path) |
| **SEC-19** | a fake `fetch` resolving a normal oEmbed payload | `fetchVideoMetadata(id)` | returns the metadata as before, and the fetch options carried an `AbortSignal` |

## Out of scope / non-goals

- Storage sharding, per-item quota, write-failure UI, and mutation serialization —
  owned by the `fix-memory-and-storage-robustness` change (R1/R2/R3).
- Sanitizing `title`/`channelName` *content* beyond shape/length — they remain
  arbitrary strings rendered via `textContent`/React.
- Id-validating lookup-only fields (`REORDER_*` order arrays, `DELETE_CATEGORY`
  name, `UPDATE_CATEGORY.oldName`) — unknown values already no-op in the reducer.
- No new `Message` or `MessageResponse` variants; invalid input rejects with the
  existing `{ ok: false, error }` shape.

## Manual acceptance (not unit-tested)

Manifest, CSP, fonts, popup DOM and end-to-end wiring — verified by hand and by
the Playwright e2e smoke (`npm run test:e2e`).

- [ ] **S1**: built manifest has `"permissions": ["storage"]` only; a fresh
      install shows no "Read your browsing history" warning; both popup
      `chrome.tabs.create` paths (open video, open home) still work.
- [ ] **S2 (wiring)**: a watch page with a malformed `v` param (e.g. `?v=abc`)
      gets no "+ Salvar" pill and sends no message; a bad-id message sent from
      the service-worker console answers `{ ok: false, error }` and writes
      nothing to storage.
- [ ] **S6 (wiring)**: setting the `mytube` sync key to garbage from the SW
      console does not throw in the badge listener (`newValue` guard) and every
      surface recovers with sanitized defaults.
- [ ] **S3**: popup "N unwatched" label renders identical markup with the bold
      count built via DOM APIs (also locked by `popup/render.test.ts` /
      `popup-shell.test.ts`); SVG tiles render only for keys passing `isIconKey`.
- [ ] **S4**: new tab and popup issue zero requests to `fonts.googleapis.com` /
      `fonts.gstatic.com`; Bricolage Grotesque, Plus Jakarta Sans and JetBrains
      Mono render from bundled woff2, including offline.
- [ ] **S5**: under the explicit `extension_pages` CSP, thumbnails load from
      `i.ytimg.com`, fonts render, the oEmbed backfill still works, and an
      extension-page `<img>` pointed at any other host is blocked.
- [ ] **S7**: `npm audit` reports 0 fixable findings; `npm test` and
      `npm run test:e2e` green; the PostToolUse hook (`scripts/test-hook.mjs`)
      still runs.
- [ ] **S9**: `use_dynamic_url: true` evaluated on the upgraded crxjs — enabled
      with a green e2e, or the limitation recorded in the change notes.
