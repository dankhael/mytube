# Spec: Memory & storage robustness (findings M1–M4, R1–R3)

- **Status:** Approved (implemented — ROB-1..ROB-17 green 2026-06-13; manual
  acceptance below still to be checked by hand)
- **Owner:** dankhael
- **Contract:** `StorageBackend` in [src/storage-backend.ts](../src/storage-backend.ts)
  (interface unchanged; the Chrome implementation shards internally over a new
  injectable `SyncArea` seam); `MyTubeStore` in [src/storage.ts](../src/storage.ts)
  (public API unchanged, mutations serialized); new `src/backfill.ts` (extracted
  from the service worker for testability); new `newtab/quota.ts` helper.
  `StorageData` and the `Message` union are untouched.
- **Tests:** `newtab/quota.test.ts`, `src/backfill.test.ts`,
  `src/storage-backend.test.ts`, extensions to
  [src/storage.test.ts](../src/storage.test.ts) and
  [newtab/App.test.tsx](../newtab/App.test.tsx).
- **Change:** [openspec/changes/fix-memory-and-storage-robustness](../openspec/changes/fix-memory-and-storage-robustness/proposal.md)
  (closes findings M1–M4, R1–R3 of [docs/security-memory-review.md](../docs/security-memory-review.md)).

## Why

The whole library lives under one `chrome.storage.sync` key, so the real write
ceiling is the 8,192-byte per-item quota — saves start failing silently around
~30–35 videos while the banner watches the irrelevant 100 KB total, and the
`{ ok: false }` is swallowed by the new tab. Meanwhile the backfill re-fetches
permanently-dead videos forever, hidden tabs burn scan work, recycled YouTube
nodes can save the wrong video, and orphaned content scripts throw on every
click after an extension reload.

## Acceptance criteria

New modules and seams: `newtab/quota.ts` (`bindingQuotaLimit`,
`shouldWarnQuota`), `src/backfill.ts` (`createBackfillRunner({ store,
fetchMetadata })` — one instance per service-worker session), a private
`enqueue()` mutex in `MyTubeStore`, and a sharded Chrome backend over a
`SyncArea` interface (`get`/`set`/`remove`, defaulting to a thin
`chrome.storage.sync` wrapper). Tests inject named fakes: `FakeStorageBackend`
(gains a rejecting mode) and a new `FakeSyncArea` (8,192-byte per-item quota +
operation log). Shard layout: `mytube:meta` carries `{ generation, chunkCount }`
plus categories/settings; `mytube:videos:<n>` chunks target ~6 KB serialized
(decided in design §1; generation counter decided in 1.3).

| ID | Given | When | Then |
|---|---|---|---|
| **ROB-1** | limits `{ totalBytes: 102_400, perItemBytes: 8_192 }`; limits `{ totalBytes: 102_400 }` | `bindingQuotaLimit(limits)` | returns `8_192` (the lower bound); returns `102_400` when no per-item bound exists |
| **ROB-2** | the 0.8 `WARN_RATIO` | `shouldWarnQuota(bytes, limit)` | `(6_554, 8_192)` → `true`; `(6_553, 8_192)` → `false`; `(81_920, 102_400)` → `true` |
| **ROB-3** | a `FakeStorageBackend` in rejecting mode holding a prior snapshot | any mutation (e.g. `saveVideo`) | the mutation's promise rejects with the backend's error and the stored snapshot is unchanged |
| **ROB-4** | saved videos needing enrichment, a fake `fetchMetadata` resolving some and `null`-ing others | `runner.run()` | one `applyMetadata` write fills the recovered titles/channels; `null` lookups produce no update |
| **ROB-5** | a runner whose earlier `run()` got `null` for an id | a second `run()` on the same runner | that id is not fetched again (fake's call log shows no new call) |
| **ROB-6** | a fresh `createBackfillRunner` instance (new worker session) | `run()` | a previously-failed id is fetched once more |
| **ROB-7** | a `run()` still in flight (fake fetch gated on a promise) | a second `run()` is invoked | no second pass starts — the fake's fetch count is unchanged by the overlapping call |
| **ROB-8** | a `FakeStorageBackend` with artificially delayed reads | two mutations issued without awaiting each other | both changes are present in the final stored snapshot |
| **ROB-9** | a backend whose next write rejects | a mutation fails, then another mutation is issued | the first rejects its caller; the second still runs and commits |
| **ROB-10** | the home with a `send` fake answering `{ ok: false, error }` | a mutation (e.g. delete) is triggered | `console.error` receives structured JSON naming the action and error, and a non-blocking error toast is rendered |
| **ROB-11** | the home with a `send` fake answering `{ ok: true, data }` | the same mutation is triggered | no error toast renders and `console.error` is not called |
| **ROB-12** | a `FakeSyncArea` with the 8,192-byte per-item quota and a snapshot serializing > 8,192 bytes (50+ videos) | `write()` then `read()` | the round-trip returns a deep-equal snapshot and no single stored value exceeds 8,192 serialized bytes |
| **ROB-13** | a `FakeSyncArea` holding only the legacy single `mytube` key | the first `read()` | it returns the legacy data; the op log shows the shard `set`s succeed **before** the legacy `remove`; the next `read()` assembles from shards |
| **ROB-14** | both layouts present (shards with schema marker + legacy key — an interrupted migration) | `read()` | the sharded data wins and the legacy-key removal is retried |
| **ROB-15** | a stored sharded snapshot | `write()` of an identical snapshot | the op log shows no `set` for unchanged chunk keys |
| **ROB-16** | `mytube:meta` declaring `{ generation, chunkCount }` plus a stray chunk key beyond `chunkCount` (older generation) | `read()` | the snapshot is assembled from exactly the declared chunks; the stray is ignored and nothing is written during the read |
| **ROB-17** | a stored snapshot using N chunks | `write()` of a smaller snapshot needing fewer chunks | the now-stale chunk keys are removed in that same write |

## Out of scope / non-goals

- Message validation, CSP, sanitization — landed in `harden-extension-security`.
- `chrome.storage.local` fallback or library pagination — out of scope until
  users actually hit the 100 KB total.
- A persistent (stored) retry policy for failed enrichment — session-scoped is
  the decision (design §7); no schema change.
- Scoping MutationObserver queries to record subtrees (review defers it).
- The reducer API, `StorageData`, the `Message` union, and existing reducer
  tests — all must pass unmodified.

## Manual acceptance (not unit-tested)

Content-script behavior (M2–M4), real-profile migration, and cross-surface
wiring — checked by hand with the loaded extension.

- [ ] **R3**: force a failed save (e.g. fill the quota) — the toast appears,
      the structured error is in the console, and the UI does not pretend the
      action persisted.
- [ ] **M4**: reload the extension while a YouTube tab with injected buttons is
      open, then interact — no unhandled rejection in the console, observer
      disconnected, all MyTube UI removed. A transient service-worker restart
      (`lastError`) does not tear down.
- [ ] **M2**: background a YouTube tab during feed scrolling — no scan work
      while hidden; refocus — newly added cards get their buttons.
- [ ] **M3**: navigate back/forward so YouTube recycles renderer nodes, then
      save a recycled card — the currently-shown video is saved.
- [ ] **R1 migration**: upgrade a profile with a pre-shard library — data
      intact, legacy `mytube` key removed; save 50+ videos with no write
      errors.
- [ ] **R1 fan-out**: after sharding, badge, home, and content-script saved
      state still live-update when storage changes from another surface
      (`onChanged` consumers re-read via the backend on any `mytube:*` change).
