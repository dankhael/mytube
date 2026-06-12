## Context

Findings M1–M4 and R1–R3 of
[docs/security-memory-review.md](../../../docs/security-memory-review.md). The
binding constraint is `chrome.storage.sync`'s `QUOTA_BYTES_PER_ITEM` (8,192
bytes per key): the whole library lives under one `mytube` key, so writes start
throwing at ~30–35 saved videos while the UI banner watches the irrelevant
102,400-byte total — and the resulting `{ ok: false }` is swallowed by the new
tab (R3), so saves fail silently. The leak findings are background churn
(backfill re-fetching dead videos forever, full-document rescans on hidden
tabs) and the orphaned-content-script failure mode after extension reloads.
Constraints: the `StorageData` contract, the `Message` union, and the reducer
API must not change; all storage layout work stays behind the `StorageBackend`
interface so existing reducer tests keep passing unmodified.

## Goals / Non-Goals

**Goals:**
- Make the effective storage ceiling the 102,400-byte total, not 8 KB, with a
  safe one-way migration from the legacy single key.
- No lost updates: serialize read-modify-write mutations.
- No silent failures: a rejected write reaches the user.
- Stop the three runaway-work modes: dead-video re-fetch, hidden-tab scans,
  orphaned scripts.
- Fix the stale-closure save on recycled YouTube renderer nodes.

**Non-Goals:**
- No message validation, CSP, or sanitization work — that is
  `harden-extension-security` (S-findings).
- No `chrome.storage.local` fallback or library-size pagination — out of scope
  until users actually hit the 100 KB total.
- No persistent (stored) failure-retry policy for enrichment — session-scoped
  is enough and avoids a schema change.
- No scoping of MutationObserver queries to record subtrees (the review
  explicitly defers this until scans show up in a profile).

## Decisions

1. **Shard inside `ChromeStorageBackend`, not the store.** The layout becomes
   `mytube:meta` (categories, settings, schema marker) plus `mytube:videos:<n>`
   chunk keys, each kept comfortably under the 8 KB per-item quota (target
   ~6 KB to absorb re-serialization variance). `StorageBackend.read()`
   reassembles a `StorageData`; `write()` splits it. The reducer, the `Message`
   contract, `FakeStorageBackend`, and every reducer test are untouched.
   Alternative considered: one key per video (`mytube:video:<id>`) — rejected:
   ~500 keys hits `MAX_WRITE_OPERATIONS_PER_MINUTE` (120) under drag-reorder
   bursts and complicates atomic reads; chunking keeps writes to a handful of
   `set` calls.
2. **Migration on first read, delete-after-write.** If the legacy `mytube` key
   exists, read it, write the sharded layout, and only then remove the legacy
   key. A crash between write and remove leaves both layouts present; the
   sharded one (with its schema marker) wins on next read and the remove is
   retried. Never the reverse order — data loss is the failure mode being
   fixed, not introduced.
3. **`onChanged` fan-out keyed on the shard prefix.** Listeners currently watch
   `changes.mytube`; they move to "any `mytube:*` key changed → re-read via the
   backend". A multi-key `set` can fire listeners mid-write; re-reading the
   full snapshot through the backend (rather than trusting `newValue`) keeps
   every surface consistent. The new tab already re-renders from full snapshots,
   so behavior is unchanged.
4. **Banner math lands first, independent of sharding.** Until the shard ships,
   the home's warning must track `min(total, per-item)` headroom; after
   sharding, the per-item bound no longer binds and the banner naturally tracks
   the total again. Implemented as a pure helper so the threshold logic is
   unit-tested, and kept in place post-shard as defense in depth.
5. **Promise-chain mutex in `MyTubeStore` (R2).** A private
   `enqueue<T>(task): Promise<T>` chains every public mutation so each
   read-modify-write starts after the previous commit; the chain swallows its
   own rejection (`catch(() => undefined)`) to stay alive after a failed write
   while still rejecting the caller's promise. Alternative considered: locking
   in the backend — rejected, the race is read→transform→write in the store;
   only the store can close it.
6. **R3 = console.error + toast.** `apply()` in the new tab logs the structured
   `{ ok: false, error }` (structured JSON per CLAUDE.md logging rules) and
   shows a non-blocking error toast ("Não foi possível salvar — …"). The
   review's minimal step was log-only; the toast is included because R1 makes
   quota failures *reachable*, and a reachable silent failure is the bug.
7. **M1: session `Set<string>` of failed ids** in the service worker module
   scope. A video that later becomes public is retried after the next SW
   restart — the same eventual consistency the feature already has. No schema
   change.
8. **M2: visibility gate in `scheduleScan` + catch-up on `visibilitychange`.**
   `requestAnimationFrame` already doesn't fire hidden; this makes the idle
   path explicit and adds the catch-up rescan so visible state is identical.
9. **M3: re-extract `CardData` on click, inject-time data as fallback** (wrapped
   in try/catch → null). Aligns the click path with the saved-state sync pass,
   which already re-derives ids from the live DOM.
10. **M4: orphan teardown from the `sendMessage` wrapper.** The synchronous
    "Extension context invalidated" throw is caught in the Promise executor,
    resolves `{ ok: false, error }` (never an unhandled rejection), and calls
    `teardown()`: disconnect the observer, remove `.mytube-wrapper` /
    `.mytube-dropdown` / toast nodes, detach the document click and
    `visibilitychange` listeners. `chrome.runtime.lastError` in the callback is
    mapped to `{ ok: false }` without teardown (transient worker restarts are
    not orphaning).

## Risks / Trade-offs

- [Migration bug corrupts a real library] → delete-after-write ordering; a
  regression test drives the migration against `FakeStorageBackend` extended
  with a per-item quota mode; manual acceptance includes upgrading a profile
  with a pre-shard library.
- [Chunk rebalancing churns sync traffic] → only rewrite chunks whose content
  changed (compare serialized chunk before `set`); `MAX_WRITE_OPERATIONS_PER_MINUTE`
  is 120, a save touches ≤ 2–3 keys.
- [Mutex serializes a slow write behind everything] → writes are small
  (<100 KB) and local-first; the chain adds latency only when mutations
  actually overlap, which is exactly the case being fixed.
- [Toast on transient errors annoys users] → toast only on `{ ok: false }`
  responses, which today occur only for genuine persistence failures; wording
  states the action did not persist.
- [Backend complexity now exceeds "thin wrapper"] → keep sharding in its own
  module (`src/storage-backend.ts` split if it nears the 500-line limit), fully
  covered by Vitest via the fake quota mode.

## Migration Plan

1. Land order: R1 banner math + write-failure regression test (zero risk) →
   M1 → R2 mutex → R3 surfacing → M4 → M2 → M3 → R1 sharding last (largest).
2. Sharded layout ships with a schema marker in `mytube:meta`; first read
   migrates the legacy key (write shards → verify → remove `mytube`).
3. Rollback: reverting the extension version before users accumulate >8 KB
   libraries is safe only if a down-migration is shipped with it; practical
   rollback is forward-fix. The legacy key is left untouched until the sharded
   write has succeeded, so a rollback *during* partial deployment reads the old
   key unchanged.

## Open Questions

- Sync conflict semantics: two devices writing different shard sets
  concurrently can interleave per-key (last-write-wins per key, not per
  snapshot). Today's single key has last-write-wins per whole snapshot. Is the
  per-key interleave acceptable, or should `mytube:meta` carry a generation
  counter so readers can detect and repair torn snapshots? (Recommend: ship
  with a generation counter in `meta`, repair-on-read drops orphan chunks.)

  **Resolved 2026-06-12 (owner, via task 1.3): ship the generation counter.**
  `mytube:meta` carries `{ generation, chunkCount }`; `read()` assembles
  exactly the declared chunks and ignores strays (repair-on-read never writes);
  the next `write()` removes stale chunk keys. Criteria ROB-16/ROB-17 in
  `specs/storage-robustness.spec.md`.
