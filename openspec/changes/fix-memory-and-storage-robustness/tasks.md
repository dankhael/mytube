## 1. Implementation-layer spec (handshake)

- [x] 1.1 Draft `specs/storage-robustness.spec.md` (`Status: Draft`) from
      `specs/_TEMPLATE.spec.md` with stable IDs for the unit-testable criteria:
      sharded read/write under the per-item quota, legacy-key migration
      (including interrupted-migration recovery), mutation serialization,
      write-failure propagation, banner threshold math, backfill failure cache.
      Put M2–M4 content-script behavior and the R3 toast under **Manual
      acceptance**. Stop and request human approval — do not write code against
      a Draft spec.
- [x] 1.2 Reconcile the `TODO` notes in the touched baselines (`persistence-sync`
      — its write-failure TODO is answered by this change —
      `metadata-enrichment`, `save-from-youtube`, `curated-home`) per the
      OpenSpec layer rule.
- [x] 1.3 Resolve the design's open question (shard conflict semantics /
      generation counter in `mytube:meta`) with the human before implementing
      task group 7.

## 2. R1 (zero-risk part) — Banner math + write-failure regression

- [x] 2.1 Failing test: quota-warning threshold helper warns against
      `min(total, per-item)` headroom (pure function, Vitest).
- [x] 2.2 Implement the helper and wire it into the new-tab banner
      (`newtab/App.tsx`); green.
- [x] 2.3 Regression test: a `StorageBackend.write` rejection propagates out of
      the store and `handle()` responds `{ ok: false, error }` (extend
      `FakeStorageBackend` with a rejecting mode).

## 3. M1 — Backfill failure cache

- [x] 3.1 Failing test: a video whose `fetchVideoMetadata` returned `null` is
      not fetched again on the next backfill pass; a new worker "session"
      (fresh module state) retries it.
- [x] 3.2 Implement the session-scoped `enrichmentFailed` set in
      `background/service-worker.ts`; green. *(Extracted to `src/backfill.ts`
      with injected store/fetch per the approved spec — the worker keeps one
      module-scope runner instance.)*

## 4. R2 — Mutation serialization

- [x] 4.1 Failing test: two un-awaited mutations against a `FakeStorageBackend`
      with artificially delayed reads both land in the final snapshot; a
      rejected write rejects its caller but the next mutation still runs.
- [x] 4.2 Implement the private `enqueue()` promise-chain mutex in
      `src/storage.ts` wrapping every public mutation; green.

## 5. R3 — Surface failed mutations in the home

- [x] 5.1 Change `newtab/api.ts` / `newtab/App.tsx` so `{ ok: false, error }`
      is logged as structured JSON (`console.error`) instead of mapped to
      `null` silently.
- [x] 5.2 Add a non-blocking error toast component (Testing Library test: a
      failed mutation renders the toast; a successful one does not).

## 6. M4 + M2 + M3 — Content-script hygiene (manual acceptance)

- [x] 6.1 M4: rework the `sendMessage` wrapper in `content/content.ts` to catch
      the synchronous context-invalidated throw, resolve `{ ok: false }`, and
      call `teardown()` (disconnect observer, remove `.mytube-wrapper` /
      `.mytube-dropdown` / toast, detach document listeners). `lastError` maps
      to `{ ok: false }` without teardown.
- [x] 6.2 M2: gate `scheduleScan()` on `document.hidden`; add the
      `visibilitychange` catch-up scan.
- [x] 6.3 M3: re-extract `CardData` at click time in `injectButton`
      (try/catch → fallback to inject-time data).
- [ ] 6.4 Manual acceptance pass: reload the extension with a YouTube tab open
      (no console errors, UI removed); background a tab during feed scrolling
      and re-focus (buttons appear); navigate back/forward through feeds and
      save a recycled card (correct video saved).

## 7. R1 (layout) — Sharded storage backend

- [x] 7.1 Extend `FakeStorageBackend` with a per-item-quota mode that rejects
      any single key over 8,192 bytes (named fake, no inline stubs).
      *(Sharding lives below `StorageBackend`, so the fake is a new
      `FakeSyncArea` at that seam — per the approved spec — not a mode on
      `FakeStorageBackend`.)*
- [x] 7.2 Failing tests against the quota-mode fake: large library round-trips;
      no key exceeds the quota; legacy single-key data migrates
      (write-shards-then-remove order); interrupted migration (shards + legacy
      both present) prefers shards and finishes cleanup; unchanged chunks are
      not rewritten.
- [x] 7.3 Implement sharded `read()`/`write()` + migration in the Chrome
      backend (`src/storage-backend.ts`; split the module if it nears 500
      lines), including the generation marker decided in 1.3; green.
- [x] 7.4 Update `storage.onChanged` consumers (service-worker badge,
      new tab, content script) to react to any `mytube:*` key change by
      re-reading through the backend.
- [ ] 7.5 Manual acceptance: upgrade a profile with a pre-shard library
      (data intact, legacy key removed); save 50+ videos (no write errors);
      verify badge/home/content-script still live-update across surfaces.

## 8. Wrap-up

- [ ] 8.1 Full pass: `npm test`, `npm run test:e2e`, all manual acceptance
      checklists from `specs/storage-robustness.spec.md`.
      *(2026-06-13: automated half done — `npm test` 111/111, e2e smoke green,
      `tsc --noEmit` clean. Manual checklist awaits a human with the loaded
      extension.)*
- [x] 8.2 Mark the implementation spec's criteria green and prepare the change
      for `/opsx:archive` (delta folds into `persistence-sync`,
      `metadata-enrichment`, `save-from-youtube`, `curated-home` baselines).
