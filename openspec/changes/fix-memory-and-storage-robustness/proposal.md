## Why

The 2026-06-09 security & memory review ([docs/security-memory-review.md](../../../docs/security-memory-review.md))
found four resource-leak modes (M1–M4) and three data-integrity gaps (R1–R3).
The worst is **R1**: the whole library lives under one `chrome.storage.sync` key,
so the real write ceiling is the 8,192-byte *per-item* quota — saves start
silently failing around ~30–35 videos, long before the UI's 80%-of-100KB banner
would ever warn. Meanwhile `backfillMetadata` re-fetches permanently-dead videos
on every `GET_ALL` forever (M1), orphaned content scripts throw on every click
after an extension reload (M4), and interleaved mutations can silently lose
writes (R2). This change fixes all seven findings.

## What Changes

- **M1** — Session-scoped failure cache in `backfillMetadata`: a video whose
  oEmbed lookup fails is skipped for the rest of the service worker's lifetime
  (retried after the next SW restart — same eventual consistency as today).
- **M2** — Gate the content script's `scheduleScan()` on `document.hidden`;
  re-scan once on `visibilitychange` back to visible. Hidden YouTube tabs stop
  burning CPU/GC on scan work nobody can see.
- **M3** — Re-extract `CardData` at click time (inject-time data kept only as
  fallback), so recycled YouTube renderer nodes can no longer save the *old*
  video bound to a reused card.
- **M4** — Detect the orphaned-context throw in the content script's
  `sendMessage` wrapper and run a `teardown()` that disconnects the observer,
  removes injected UI, and detaches listeners. Healthy sessions never hit it.
- **R1** — **BREAKING (persisted layout only)**: shard `StorageData` across
  multiple sync keys (e.g. `mytube:meta` + `mytube:videos:<n>`) behind the
  existing `StorageBackend` interface, so the effective ceiling becomes the
  102,400-byte total instead of 8 KB. The `StorageData` contract, reducer, and
  all UI are unchanged; existing single-key data is migrated on first read.
  Plus two zero-risk fixes that land first: quota-banner math warns on
  `min(total, per-item)` headroom, and a regression test that a backend write
  rejection propagates as `{ ok: false }`.
- **R2** — Serialize mutations inside `MyTubeStore` with a promise-chain mutex
  so each read-modify-write happens after the previous commit; interleaved
  messages can no longer drop updates.
- **R3** — Stop swallowing failed mutations in the new tab: `apply()` logs the
  structured `{ ok: false, error }` to the console (observable in DevTools) and
  surfaces a non-blocking error toast so the user knows the save/delete didn't
  persist.

## Capabilities

### New Capabilities

<!-- none — every finding lands inside an existing capability -->

### Modified Capabilities
- `persistence-sync`: storage layout shards across multiple sync keys with
  migration from the legacy single key (R1); mutations are serialized so
  concurrent read-modify-write cannot lose updates (R2); the quota warning
  fires against the *binding* limit, and write failures propagate as
  `{ ok: false }` instead of vanishing. Also reconciles this baseline's open
  TODO about write-failure behavior.
- `metadata-enrichment`: backfill SHALL NOT re-fetch a video whose enrichment
  already failed in the current service-worker session (M1).
- `save-from-youtube`: the content script pauses scanning on hidden tabs and
  catches up on visibility (M2); a click saves the video *currently* bound to
  the card, not a stale inject-time snapshot (M3); an orphaned script after an
  extension reload tears itself down instead of throwing on every interaction (M4).
- `curated-home`: a failed mutation is observable — logged with its structured
  error and surfaced to the user as a toast — instead of silently dropped (R3).

## Impact

- **Storage backend**: [src/storage-backend.ts](../../../src/storage-backend.ts)
  — sharded read/write + legacy-key migration (the biggest piece; hidden from the
  reducer and every test by the `StorageBackend` interface).
- **Store**: [src/storage.ts](../../../src/storage.ts) — `enqueue()` promise-chain
  mutex wrapping every public mutation.
- **Service worker**: [background/service-worker.ts](../../../background/service-worker.ts)
  — `enrichmentFailed` session set in the backfill loop.
- **Content script**: [content/content.ts](../../../content/content.ts) —
  visibility gate in `scheduleScan`, click-time re-extract in `injectButton`,
  `teardown()` path in the `sendMessage` wrapper.
- **New tab**: [newtab/api.ts](../../../newtab/api.ts),
  [newtab/App.tsx](../../../newtab/App.tsx) — error propagation + toast; quota
  banner math.
- **Specs/tests**: reducer/backend changes get granular `specs/*.spec.md`
  criteria with failing Vitest first (handshake applies). `FakeStorageBackend`
  gains a per-item quota mode to test R1 sharding. Content-script behavior (M2–M4)
  goes on Manual acceptance checklists.
- **Migration risk**: R1 is the only persisted-layout change; one-way migration
  on first read, old key removed only after the sharded write succeeds.
- **Ordering note**: this change and `harden-extension-security` both touch
  `persistence-sync` and the service worker — archive whichever lands second
  against the updated baseline.
