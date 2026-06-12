# MyTube — Security & Memory Review

**Date:** 2026-06-09
**Scope:** all shipped source (`manifest.config.ts`, `background/`, `content/`, `newtab/`, `popup/`, `src/`) plus the built `dist/manifest.json` and the npm dependency tree.
**Constraint:** every proposed fix below preserves current user-visible functionality. Items that would change stored layout or observable behavior are explicitly marked and routed through the OpenSpec/spec-handshake flow instead of being folded into a hardening pass.

Severity scale: **High** = exploitable or data-loss path today · **Medium** = real surface, needs a second factor to bite · **Low** = hardening / defense-in-depth · **Info** = worth knowing, upstream-constrained.

| ID | Severity | Area | Finding |
|----|----------|------|---------|
| S1 | Medium | Manifest | `tabs` + `activeTab` permissions are requested but never needed |
| S2 | Medium | Messaging | No runtime validation at the service-worker message boundary; watch-page video id and `thumbnail` URL accepted unvalidated |
| S3 | Low | Popup | `innerHTML` sinks in a privileged extension page |
| S4 | Low | New tab / popup | Google Fonts fetched remotely on every new tab (privacy) |
| S5 | Low | Manifest | No explicit CSP for extension pages (default allows any `https:` image/connect) |
| S6 | Low | Storage | Stored snapshot trusted on read; malformed sync data can crash the badge listener |
| S7 | Medium | Supply chain | 7 vulnerable dev-dependencies (1 critical), fixes available; prod deps clean |
| S8 | Low | Service worker | oEmbed `fetch` has no timeout/abort |
| S9 | Info | Manifest (built) | Content-script chunks are `web_accessible_resources` with `use_dynamic_url: false` → extension fingerprintable from youtube.com |
| M1 | Medium | Service worker | `backfillMetadata` re-fetches permanently-failed videos on every `GET_ALL`, forever |
| M2 | Low | Content script | Full-document rescan on every mutation burst; never pauses on hidden tabs |
| M3 | Low | Content script | Per-card click closures capture `CardData` at inject time; YouTube recycles renderer nodes |
| M4 | Medium | Content script | Orphaned script after extension reload keeps observer + listeners alive and throws on every interaction |
| R1 | High | Storage | Whole library stored under one `chrome.storage.sync` key → real ceiling is the 8 KB per-item quota, not 100 KB |
| R2 | Medium | Storage | Read-modify-write mutations can interleave and lose updates |
| R3 | Low | UX/robustness | Failed mutations are silently dropped in the new tab UI |

---

## 1. Security findings

### S1 — Drop the unused `tabs` and `activeTab` permissions (Medium)

**Where:** [manifest.config.ts:9](manifest.config.ts#L9)

The manifest requests `['storage', 'tabs', 'activeTab']`. The only tabs API the
extension calls is `chrome.tabs.create` ([popup/popup.ts:18](popup/popup.ts#L18),
[popup/popup.ts:49](popup/popup.ts#L49)), which requires **no permission at all**.
Nothing uses `activeTab` (no `executeScript`, no capture, no tab URL reads).

**Risk:** `tabs` grants read access to the URL/title of *every* tab and triggers the
"Read your browsing history" install warning. It widens the blast radius of any
future bug and invites Chrome Web Store review friction — for zero benefit.

**Fix (no functional change):**

```ts
permissions: ['storage'],
```

Re-run the e2e smoke after the change; both `chrome.tabs.create` calls keep working.

### S2 — Validate messages at the service-worker boundary (Medium)

**Where:** [background/service-worker.ts:75-126](background/service-worker.ts#L75-L126),
[content/content.ts:63-66](content/content.ts#L63-L66)

`handle()` trusts every field of the incoming `Message`. The compile-time `Message`
union is not a runtime guarantee: the content script runs inside youtube.com and
builds payloads from page-controlled DOM, and two inputs are notably unvalidated:

- `extractCard` checks the video id against `/[?&]v=([\w-]{11})/`, but
  `extractWatchPage` takes `v` **straight from the URL** with no shape check
  ([content/content.ts:65](content/content.ts#L65)). An arbitrary string can flow
  into storage and later into `chrome.tabs.create(watchUrl(id))`, `window.open`,
  and the `i.ytimg.com` thumbnail URL.
- `SAVE_VIDEO` accepts **any string** as `video.thumbnail`, which is later rendered
  as `<img src>` in two privileged pages ([popup/render.ts:86](popup/render.ts#L86),
  [newtab/components/VideoCard.tsx:62](newtab/components/VideoCard.tsx#L62)). Today the
  content script always sends `https://i.ytimg.com/vi/<id>/mqdefault.jpg`, but the
  contract doesn't enforce it — a stray URL becomes a tracking pixel inside the
  new-tab page.
- `ADD_CATEGORY`/`UPDATE_CATEGORY` accept any string as `icon`; unknown keys reach
  the popup's `PATHS[key]` lookup (degrades to the literal text "undefined" — not
  exploitable, but unvalidated).

**Risk:** none of this escalates to XSS today (React escapes; the popup uses
`textContent` for titles). It is a missing defense-in-depth layer: a single future
rendering change (e.g. an `innerHTML` somewhere) turns "unvalidated stored string"
into a privileged-page injection.

**Fix (no functional change):** add a small `src/validate-message.ts` module applied
at the top of `handle()`:

```ts
const VIDEO_ID = /^[\w-]{11}$/

export function isYoutubeVideoId(id: string): boolean {
  return VIDEO_ID.test(id)
}

// Thumbnail must be the canonical i.ytimg.com URL; otherwise derive it from the
// id — identical to what the content script already sends, so behavior is unchanged.
export function canonicalThumbnail(id: string, candidate: string): string {
  const expected = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`
  return candidate === expected ? candidate : expected
}
```

- Reject `SAVE_VIDEO` / `DELETE_VIDEO` / `MOVE_VIDEO` / `MARK_WATCHED` whose `id`
  fails `isYoutubeVideoId` (return the existing `{ ok: false, error }` shape with the
  offending value in the message, per CLAUDE.md exception style).
- Normalize `thumbnail` through `canonicalThumbnail` — observationally identical for
  every payload the extension generates today.
- Validate `icon` against `ALL_ICONS` (treat unknown as unset — same render output).
- Clamp `title`/`channelName`/category `name` length (e.g. 300 chars) to protect the
  sync quota; real YouTube titles are ≤ 100 chars, so no behavioral change.
- In `extractWatchPage`, apply the same `VIDEO_ID` test the card path already uses.

Each guard is a pure function → unit-testable per the project's SDD loop.

### S3 — Remove `innerHTML` from the popup's dynamic paths (Low)

**Where:** [popup/popup.ts:33](popup/popup.ts#L33), [popup/render.ts:39](popup/render.ts#L39),
[popup/render.ts:22](popup/render.ts#L22), [popup/config.ts:63](popup/config.ts#L63)

Four `innerHTML` writes exist in the popup (a privileged extension page). Two are
static literals (safe), and two are computed:

- `total.innerHTML = unwatchedLabel(data).replace(/^(\d+)/, '<b>$1</b>')` — safe
  *today* because the label is `` `${count} unwatched` `` and `count` is a number.
  The moment the label includes a category or channel name, this is XSS in a page
  with extension privileges.
- `ico.innerHTML = categorySvg(category)` — safe because `PATHS` is a closed
  `Record<IconKey, string>`, but `category.icon` arrives from storage unvalidated
  (see S2).

**Fix (no functional change):** build the same DOM imperatively:

```ts
// popup.ts — same rendered markup, no HTML parsing of a computed string
const count = document.createElement('b')
count.textContent = String(unwatchedCount(data))
total.replaceChildren(count, document.createTextNode(' unwatched'))
```

For the SVG tiles, keep the closed map but gate the key: `isIconKey(category.icon)`
(shares the validator from S2). The popup already has jsdom tests
(`popup/render.test.ts`, `popup/popup-shell.test.ts`) to lock the rendered output.

### S4 — Self-host the three web fonts (Low, privacy)

**Where:** [styles/theme-tokens.css:8](styles/theme-tokens.css#L8)

`@import url('https://fonts.googleapis.com/css2?...')` is pulled by **both** the
new-tab page and the popup. Every new tab the user opens sends a request (IP,
user-agent) to Google before the page settles; offline, fonts silently fall back.

**Fix (no functional change):** vendor the three families (`Bricolage Grotesque`,
`Plus Jakarta Sans`, `JetBrains Mono`) as woff2 files under `styles/fonts/` with
local `@font-face` rules. Identical rendering, no third-party request, and it
unlocks a strict `font-src 'self'` CSP (S5). Tools like `google-webfonts-helper`
produce the exact files; the variable-axis ranges in the current URL
(`opsz,wght@12..96,400..800`) are available as variable woff2.

### S5 — Declare an explicit CSP for extension pages (Low)

**Where:** [manifest.config.ts](manifest.config.ts) (no `content_security_policy` key;
confirmed absent in `dist/manifest.json`)

MV3's default CSP (`script-src 'self'; object-src 'self'`) already blocks remote
script, but leaves `img-src`, `connect-src`, `style-src`, `font-src` unrestricted —
any `https:` image or fetch is allowed from the new tab, popup, and service worker.
Combined with S2's "thumbnail is an arbitrary string", that's the gap that lets a
bad URL become a tracking pixel.

**Fix (no functional change):** allow exactly what the extension uses today:

```ts
content_security_policy: {
  extension_pages: [
    "default-src 'self'",
    "img-src 'self' https://i.ytimg.com",          // video thumbnails
    "connect-src https://www.youtube.com",          // oEmbed backfill (service worker)
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "object-src 'none'",
  ].join('; '),
},
```

Notes: `'unsafe-inline'` in `style-src` is required because React/dnd-kit set inline
`style` attributes (drag transforms); after S4, the two font sources collapse to
`'self'`. Verify with the Playwright smoke (`npm run test:e2e`) — a missing source
shows up immediately as broken thumbnails/fonts.

### S6 — Sanitize the stored snapshot on read (Low)

**Where:** [src/storage.ts:12-24](src/storage.ts#L12-L24),
[background/service-worker.ts:69-73](background/service-worker.ts#L69-L73),
[newtab/App.tsx:54-58](newtab/App.tsx#L54-L58)

`getData()` only patches *missing* top-level fields. `chrome.storage.sync` is
written by every device the user syncs — including older/newer versions of this
extension — and both change listeners cast `changes.mytube.newValue as StorageData`
without checking it. A malformed snapshot (interrupted sync, future schema, manual
edit via DevTools) makes `unwatchedCount(d)` throw inside the badge listener
(`d.videos.filter` on `undefined`) and feeds unchecked values into the UI.

**Fix (no functional change):** a pure `sanitizeStorageData(raw: unknown): StorageData`
in `src/` that validates shapes, drops malformed entries, and applies the existing
defaults; call it in `MyTubeStore.getData()` and in both `onChanged` listeners
before use. Well-formed data passes through byte-identical (assert that in a test);
the badge listener also gets a cheap `if (!changes.mytube.newValue) return` guard.
This is also where the S2/S3 `icon` validation naturally lives.

### S7 — Patch the dev-toolchain vulnerabilities (Medium, supply chain)

**Where:** `package.json` devDependencies

`npm audit` (2026-06-09): **0 production** vulnerabilities; **7 dev** findings —
1 critical (`vitest`), 2 high (`rollup`, `@crxjs/vite-plugin`), 4 moderate
(`vite`, `esbuild`, `vite-node`, `@vitest/mocker`). All report `fixAvailable: true`.
These don't ship in `dist/`, but they execute on the build machine and in the
PostToolUse test hook, so a compromised toolchain can poison the artifact.

**Fix (no functional change):** `npm audit fix`, then bump `vite`/`vitest` majors as
needed and re-run `npm test` + `npm run test:e2e`. `@crxjs/vite-plugin` is pinned to
a beta (`2.0.0-beta.28`); move to the latest stable 2.x — also relevant to S9.

### S8 — Add a timeout to the oEmbed fetch (Low)

**Where:** [src/metadata.ts:27](src/metadata.ts#L27)

`fetch(url)` has no abort signal. A hung response stalls the sequential
`backfillMetadata` loop and keeps the service worker alive (battery/memory) until
the browser's own socket timeout fires.

**Fix (no functional change):**

```ts
const res = await fetch(url, { signal: AbortSignal.timeout(8_000) })
```

The existing `try/catch → null` already handles the `TimeoutError` path, so callers
see exactly the current "best effort, keep what we have" behavior.

### S9 — Content-script chunks are fingerprintable (Info)

**Where:** `dist/manifest.json` (generated by `@crxjs/vite-plugin`)

The build emits `web_accessible_resources` for `assets/content.ts-*.js` and
`assets/metadata-*.js` with `"use_dynamic_url": false`, matched to
`https://www.youtube.com/*`. Any script running on youtube.com (including
third-party embeds there) can probe `chrome-extension://<id>/assets/…` to detect
that the user runs MyTube.

**Why it's only Info:** the exposure is limited to youtube.com origins, the chunks
contain no secrets, and crxjs sets `use_dynamic_url: false` deliberately (a
Chromium bug used to break dynamic-URL imports for content scripts). **Proposed
action:** when upgrading crxjs for S7, check whether the current release supports
`use_dynamic_url: true` cleanly; if so, enable it and re-run the e2e smoke. Don't
hand-edit `dist/`.

---

## 2. Memory findings

### M1 — `backfillMetadata` re-fetches permanently-failed videos forever (Medium)

**Where:** [background/service-worker.ts:26-49](background/service-worker.ts#L26-L49),
triggered from [background/service-worker.ts:87](background/service-worker.ts#L87)

Every `GET_ALL` (every new tab, every popup open, every YouTube tab's content-script
init) fires `backfillMetadata()`. Videos whose oEmbed lookup *permanently* fails —
private, deleted, region-locked videos answer 401 → `fetchVideoMetadata` returns
`null` → they're never updated → they still match `needsEnrichment` on the next
pass. With a handful of dead saved videos, the extension issues N network requests
on **every new tab open, indefinitely**, and each pass keeps the service worker
alive for the duration of the sequential fetch loop.

**Fix (no functional change):** remember failures for the service worker's lifetime:

```ts
// Session-scoped: a video that later becomes public is retried after the next
// SW restart, which is the same eventual-consistency the feature already has.
const enrichmentFailed = new Set<string>()

// in the loop:
if (enrichmentFailed.has(v.id)) continue
const meta = await fetchVideoMetadata(v.id)
if (!meta) { enrichmentFailed.add(v.id); continue }
```

No schema change, no behavioral change for enrichable videos. The `backfilling`
flag already prevents concurrent passes; this stops the *repeated* passes from
re-doing dead work.

### M2 — MutationObserver rescans the whole document on every burst (Low)

**Where:** [content/content.ts:557-558](content/content.ts#L557-L558),
[content/content.ts:375-390](content/content.ts#L375-L390)

The observer watches `document.body` with `subtree: true`. YouTube mutates
constantly (progress bars, hover previews, live chat), so `scan()` — four
`querySelectorAll` passes over the full document plus `injectWatchButton()` — runs
on effectively every frame that had a mutation. The rAF coalescing
(`scheduleScan`) is good, but each pass allocates fresh `NodeList`s/arrays → steady
GC churn on tabs users keep open for hours, including **background** tabs.

**Fix (no functional change):** gate on visibility; hidden tabs don't need buttons:

```ts
function scheduleScan() {
  if (scanScheduled || document.hidden) return
  // ...existing rAF body...
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) scheduleScan() // catch up on whatever changed while hidden
})
```

`requestAnimationFrame` doesn't fire in hidden tabs anyway, so today's code just
accumulates a parked callback; this makes the idle path explicit and adds the
catch-up rescan, preserving the exact visible behavior. (Scoping queries to
observer-record subtrees would cut more CPU but touches injection logic — keep it
as a separate, spec'd change if scans ever show up in a profile.)

### M3 — Click closures capture `CardData` at inject time (Low)

**Where:** [content/content.ts:264-293](content/content.ts#L264-L293)

`injectButton` extracts `CardData` once and captures it in the button's click
listener. Two consequences on a long-lived YouTube SPA session:

- Memory: hundreds of cards each retain id/title/channel/thumbnail strings for the
  life of the node — small individually, but it's the kind of per-node baggage that
  adds up alongside M2's churn.
- Staleness hazard: YouTube *recycles* renderer elements (continuations, grid
  refreshes, back/forward navigation). The `data-mytube` guard stays on the node
  while its contents are rebound to a different video; the closure then saves the
  **old** video.

**Fix (no functional change for non-recycled cards, removes the stale hazard):**
re-extract at click time and keep the inject-time result only as a fallback:

```ts
btn.addEventListener('click', (e) => {
  e.preventDefault(); e.stopPropagation()
  const fresh = (() => { try { return extractCard(card) } catch { return null } })()
  const current = fresh ?? data!
  // ...existing open/close logic with `current`...
})
```

The saved-state pass ([content/content.ts:392-409](content/content.ts#L392-L409))
already re-derives ids from the live DOM, so this aligns the click path with the
sync path.

### M4 — Orphaned content script after extension reload/update (Medium)

**Where:** [content/content.ts:83-93](content/content.ts#L83-L93),
[content/content.ts:550-567](content/content.ts#L550-L567)

When the extension is reloaded (update, dev iteration), already-injected content
scripts are orphaned: `chrome.runtime.sendMessage` then **throws synchronously**
("Extension context invalidated") instead of setting `lastError`. In the current
`sendMessage` wrapper the throw happens inside the Promise executor → the promise
rejects → every button click produces an unhandled rejection, and the
MutationObserver, the global click listener, and the storage listener keep running
useless work in every open YouTube tab until the user reloads it.

**Fix (no functional change in healthy operation):**

```ts
function sendMessage(message: Message): Promise<MessageResponse> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (response: MessageResponse) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message || 'unknown' })
          return
        }
        resolve(response)
      })
    } catch (e) {
      teardown() // context gone: stop observing, drop UI, detach listeners
      resolve({ ok: false, error: e instanceof Error ? e.message : String(e) })
    }
  })
}
```

where `teardown()` disconnects the observer, removes `.mytube-wrapper`,
`.mytube-dropdown`, the toast, and the document click listener. Healthy sessions
never hit it; broken sessions stop leaking work and stop throwing.

### Reviewed and fine (no action)

- [newtab/App.tsx:52-62](newtab/App.tsx#L52-L62) — the `storage.onChanged` listener
  is correctly removed on unmount; `useCallback` deps are stable.
- [newtab/components/VideoCard.tsx:37-44](newtab/components/VideoCard.tsx#L37-L44) and
  [CategorySection.tsx:48-55](newtab/components/CategorySection.tsx#L48-L55) — menu
  `mousedown` listeners are added only while open and cleaned up properly.
- [popup/config.ts:36-45](popup/config.ts#L36-L45) — the modal removes its `keydown`
  listener in `destroy()`; the full-screen backdrop prevents stacking.
- [popup/sound.ts](popup/sound.ts) — one lazy `AudioContext` for the popup's short
  lifetime; oscillator nodes are stopped and collectable.
- [content/content.ts:160-173](content/content.ts#L160-L173) — the toast reuses a
  single element and resets one timer; dropdown nodes are removed (listeners go
  with them).
- `savedIds` map is bounded by the storage quota; per-page listeners die with the page.

---

## 3. Adjacent robustness findings (data integrity, not strictly memory/security)

### R1 — The real sync ceiling is 8 KB, not 100 KB (High)

**Where:** [src/storage-backend.ts:24-26](src/storage-backend.ts#L24-L26),
[newtab/App.tsx:27](newtab/App.tsx#L27)

The whole `StorageData` lives under the single `mytube` key. `chrome.storage.sync`
enforces `QUOTA_BYTES_PER_ITEM` = **8,192 bytes per key** — separate from the
102,400-byte total the new-tab banner tracks. At ~200–250 bytes per saved video,
writes start throwing around **~30–35 videos**, long before the 80% banner at
~82 KB would ever show. The thrown error is caught by `handle()` and surfaced as
`{ ok: false }`, which the UI ignores (R3) — so saves silently stop working.

**Proposed direction:** this cannot be fixed invisibly inside a hardening pass —
sharding the value across keys (e.g. `mytube:meta` + `mytube:videos:<n>`) changes
the persisted layout, though not the `StorageData` contract or any user-visible
behavior (the `StorageBackend` interface hides it from the reducer and every test).
Route it through an OpenSpec change. Two things *are* zero-risk today:
- fix the banner math to warn on `min(total, per-item)` headroom so the warning
  fires before writes fail;
- add a regression test that a `write` rejection propagates as `{ ok: false }`.

### R2 — Concurrent mutations can lose updates (Medium)

**Where:** [src/storage.ts:30-33](src/storage.ts#L30-L33) and every mutation method

Each mutation is read → transform → write of the full snapshot. Two messages
interleaving (a `SAVE_VIDEO` from a YouTube tab while the new tab reorders, or
`applyMetadata` committing mid-backfill) means last-write-wins and the first
mutation vanishes. The service worker is single-threaded, but every `await` is an
interleaving point.

**Fix (no functional change):** serialize commits inside `MyTubeStore` with a
promise-chain mutex so each mutation's read happens after the previous write:

```ts
private chain: Promise<unknown> = Promise.resolve()

private enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = this.chain.then(task, task)
  this.chain = next.catch(() => undefined) // keep the chain alive after a failure
  return next
}
```

Wrap each public mutation body in `this.enqueue(...)`. Sequential callers (all of
today's tests and UI flows) observe identical behavior.

### R3 — Failed mutations are silently swallowed in the new tab (Low)

**Where:** [newtab/api.ts:18-22](newtab/api.ts#L18-L22),
[newtab/App.tsx:64-70](newtab/App.tsx#L64-L70)

`mutate()` maps any `{ ok: false, error }` to `null`, and `apply()` treats `null`
as "do nothing". A quota failure (R1) or validation rejection (S2) leaves the user
believing a delete/save happened until the next reload. Minimal non-breaking step:
`console.error` the structured error in `apply()` so failures are at least
observable in DevTools; surfacing a toast is a small UX change to spec separately.

---

## 4. What's already solid

- Content script builds DOM with `createElement`/`createElementNS` and
  `textContent` — compatible with YouTube's Trusted Types enforcement and free of
  injection sinks for page-controlled strings (titles, channel names).
- New tab is React with no `dangerouslySetInnerHTML`; popup renders all
  user-controlled strings via `textContent`.
- `window.open(..., 'noopener')` on the new tab; popup navigates via
  `chrome.tabs.create`.
- `host_permissions` limited to `https://www.youtube.com/*`; no
  `externally_connectable`, so web pages cannot message the service worker.
- Storage is wrapped behind `StorageBackend` (made R1's fix containable), and the
  message contract is a typed discriminated union — S2 only has to make the types
  true at runtime.
- Production npm dependencies: zero known vulnerabilities.
- oEmbed fetch already encodes the target URL (`encodeURIComponent`) and fails
  closed (`null`).

## 5. Suggested order (impact ÷ effort)

| # | Item | Effort | Why first |
|---|------|--------|-----------|
| 1 | S1 drop `tabs`/`activeTab` | one line | Largest privilege cut for least work |
| 2 | R1 banner math + write-failure test, then spec the sharding | small / spec'd | Prevents imminent silent data loss |
| 3 | M1 failure cache in backfill | ~10 lines | Stops permanent background network churn |
| 4 | S2+S6 validation/sanitize module (+ S3 icon gate) | 1 module + tests | One boundary closes three findings |
| 5 | M4 orphan teardown + S8 fetch timeout | small | Cleans up the two "stuck worker/tab" modes |
| 6 | R2 mutation queue | small | Pure-logic, fully unit-testable |
| 7 | S3 popup `innerHTML` → DOM building | small | Mechanical, locked by existing jsdom tests |
| 8 | S7 dev-dep upgrades, then S9 `use_dynamic_url` check | medium | Toolchain bumps; verify with `npm test` + e2e |
| 9 | S4 self-host fonts → S5 strict CSP | medium | CSP lands cleanly once fonts are local |
| 10 | M2 visibility gate, M3 click-time re-extract | small | Long-session hygiene |

Per the project's spec handshake: items 4, 6, and 7 introduce new functions →
each gets a spec ID and a failing Vitest first; items 1, 3, 5 are
configuration/hardening with existing manual-acceptance coverage (e2e smoke).
Item 2's sharding is the only one that needs an OpenSpec change proposal.
