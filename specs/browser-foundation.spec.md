# Spec: Browser integration and storage integrity

- **Status:** Draft (implementation explicitly requested by the user in this session;
  no human Approved status inferred or assigned).
- **Owner:** dankhael
- **Contract:** existing `Message`, `MessageResponse`, `StorageData`, `StorageBackend`.
- **Tests:** `src/messages.test.ts`, `src/storage-backend.test.ts`,
  `newtab/api.test.ts`, `e2e/smoke.spec.ts`.

## Why

Before adding a second browser, correct quota reporting, share message error
handling, isolate browser integration, and reject incomplete sync snapshots.
The user explicitly authorized implementation after reviewing this scope;
this document records that work without changing existing Approved criteria.

## Acceptance criteria

| ID | Given | When | Then |
|---|---|---|---|
| ARCH-1 | Sharded storage | Home queries usage | All keys count against the 102,400-byte total |
| ARCH-2 | Runtime callback error, synchronous throw, or missing/invalid reply | Any surface sends a message | A structured error is returned; only a synchronous runtime throw invokes the orphan callback |
| ARCH-3 | Declared chunk missing or malformed | Reading or mutating | Reject; never return/save a partial library |
| ARCH-4 | Chunks from different snapshots | Reading a fingerprinted snapshot | Reject mismatching content; accept once matching chunks arrive |
| ARCH-5 | Valid legacy shards without fingerprints | Read then mutate | Preserve data, add fingerprints on write, retain unchanged chunk optimization |
| ARCH-6 | Oversized item or total | Write | Reject before any set/remove operation |
| ARCH-7 | Real packaged Chrome extension | Save, reload, edit and delete | State survives reload and reflects each acknowledged mutation |
| ARCH-8 | Initial read or settings save fails | Home/popup handles the response | A retry is offered; failed popup previews restore the last acknowledged preferences |

## Decisions

- One lazy Chrome adapter owns native namespaces. No speculative Firefox detection.
- Shared callback transport preserves `lastError` semantics; no automatic mutation
  retry or timeout that could duplicate a successful write with a lost response.
- SHA-256 fingerprints over canonical JSON in metadata describe the exact ordered video chunks.
  They detect incomplete/mixed sync; they do not authenticate data or merge edits.
- Legacy shards remain readable; missing declared chunks are rejected even there.
  Fingerprints are added on the next write without duplicating the whole library.
- A valid concurrent snapshot can still overwrite another: browser sync has no
  compare-and-swap transaction. This is explicitly not lossless multi-device merge.
- Preflight includes key bytes, metadata, stale keys and the legacy key still
  present during migration. Failure preserves those keys for a later retry.

## Out of scope

Firefox build/runtime support, CRDT/automatic conflict merging, local backup,
export/import, framework migration, and unrelated category-delete changes.

## Manual acceptance

- [ ] Chrome: save from actual YouTube cards/watch/playlist surfaces.
- [ ] Chrome: revoke site access, reload extension, inspect orphan cleanup.
- [ ] Two signed-in profiles: exercise concurrent sync and delayed chunk arrival.
- [ ] Restart browser with the startup reminder enabled.
