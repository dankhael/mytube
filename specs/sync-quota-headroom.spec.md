<!--
The handshake (see CLAUDE.md → "Workflow"):
  1. Agent drafts this file with Status: Draft.
  2. Human reviews/edits the criteria and flips Status to Approved.
  3. ONLY THEN may the agent implement (test per criterion → code → green).
Do not implement against a Draft. Do not edit Approved criteria without the human.
-->

# Spec: Freeing space in a nearly full library

- **Status:** Draft  <!-- Draft → Approved (only a human sets Approved) -->
- **Owner:** dankhael
- **Contract:** no new `Message` variant, no `StorageData` change. Layout only:
  `writeSharded` in [src/storage-backend.ts](../src/storage-backend.ts).
- **Amends:** `ARCH-5` in [browser-foundation](./browser-foundation.spec.md) ("add
  fingerprints on write"). Approving this spec approves that exception; `ARCH-6` is unchanged.
- **Tests:** `src/storage-backend.test.ts`; `e2e/smoke.spec.ts` for HEADROOM-6.

## Why

The first write after upgrading adds `chunkHashes` to the metadata, about 67 bytes per
chunk. In a library within roughly 1.1 KB of the 102,400-byte quota, that growth outweighs
what deleting one video frees, so the preflight rejects the delete. Every small mutation
fails, including the deletes the quota banner asks for; only removing a large category
works. Measured with real chunk packing and hash-less metadata (18 chunks, about 360
videos): 1,261 bytes free still passes, 952 bytes free rejects with `102603 bytes exceeds
102400`.

## Acceptance criteria

| ID | Given | When | Then |
|---|---|---|---|
| **HEADROOM-1** | a library with no `chunkHashes` whose write fits only without them | deleting one video | the write succeeds, the video is gone, and the metadata still has no `chunkHashes` |
| **HEADROOM-2** | a library left without `chunkHashes` by HEADROOM-1 | a later write that fits with them | `chunkHashes` are added (ARCH-5 resumes) |
| **HEADROOM-3** | a library that already has `chunkHashes` | any write | `chunkHashes` are kept; a write that doesn't fit is rejected, never written without them |
| **HEADROOM-4** | a library with no `chunkHashes` | a write that exceeds the quota even without them | rejected before any `set`/`remove`, storage unchanged (ARCH-6) |
| **HEADROOM-5** | a write that shrinks the chunk count | the `set` succeeds and the stale-chunk `remove` fails | the write **resolves as a success**, because the new snapshot is already committed; it stays readable, stale chunks are ignored (ROB-16), and the next write retries their removal |
| **HEADROOM-6** | real Chrome and a hash-less fixture with real chunk packing, 358 videos and about 950 bytes free, whose write without hashes measures under the quota **with stale keys counted** (the test asserts that size first) | deleting one video from the home | the delete is acknowledged and survives a reload |

## Decisions

- **Skip the fingerprints instead of reordering the write.** Deleting keys first would
  free space, but an interruption between the two steps would leave a torn snapshot, which
  is exactly the state the integrity check blocks forever. The write stays one `set`,
  followed by removing stale keys, so the old snapshot survives until the new one exists.
- **Cost, stated plainly:** a library at this edge has no mixed-sync detection until it
  frees space. That is the same protection it had on 1.0.x, so nothing regresses.
- **Only for libraries that never had hashes.** Dropping them from a fingerprinted library
  would quietly weaken a guarantee it already has (HEADROOM-3).
- **Rejected: shorter hashes.** They narrow the zone without removing it, and they change
  the format for libraries already written.
- **This covers the first time hashes are added, not every repack near the quota.** Chrome
  applies its quota to `set` before stale keys go, so a repack that drops a chunk near the
  limit can still be rejected, with or without hashes. It stays rejected on purpose, with
  the library intact and an error shown; removing a category gets out of it.
- **A failed cleanup is not a failed write.** Once `set` resolves, the new snapshot is the
  library. Reporting a failure there would tell the user a delete didn't happen when it did,
  and the UI would re-read and show it gone anyway (HEADROOM-5).

## Out of scope / non-goals

- Raising capacity or moving videos to another storage area.
- Changing the quota banner's thresholds or copy.
