<!--
The handshake (see CLAUDE.md → "Workflow"):
  1. Agent drafts this file with Status: Draft.
  2. Human reviews/edits the criteria and flips Status to Approved.
  3. ONLY THEN may the agent implement (test per criterion → code → green).
Do not implement against a Draft. Do not edit Approved criteria without the human.
-->

# Spec: Recovering a blocked library

- **Status:** Approved. The owner approved slice 1 and authorized Codex to approve
  the revised slice 2 criteria on 2026-11-04. RECOVER-1..4 are implemented;
  RECOVER-5..11 are approved but not implemented.
- **Owner:** dankhael
- **Contract:** new `Message` variants in [src/types.ts](../src/types.ts), one per step.
  Slice 1: `EXPORT_SYNC_KEYS`, `PREVIEW_SYNC_RECOVERY`. Apply arrives with slice 2.
- **Builds on:** the fail-closed decision in
  [browser-foundation](./browser-foundation.spec.md), which requires this flow to have its
  own criteria, a backup of the original keys, a preview and explicit confirmation.
- **Tests:** `src/sync-recovery.test.ts`, `newtab/components/RecoveryTools.test.tsx`;
  home in `newtab/App.test.tsx`; real Chrome in `e2e/smoke.spec.ts`.

## Why

When a declared chunk never arrives or never matches its fingerprint, reads and writes stay
blocked and Retry only re-reads. That protects the data, but the owner of the library has no
way out and can't even copy what is there. A review also showed the block can be reached
without any sync fault: a lone surrogate made a confirmed save unreadable. That cause is
fixed, and fingerprints never shipped in a store build, so no published library is blocked
today. The question is what happens the first time one is, after this ships.

## Acceptance criteria

**Slice 1: read-only, cannot lose data.**

| ID | Given | When | Then |
|---|---|---|---|
| **RECOVER-1** | a blocked library | the user exports | they get a file with every MyTube key, the legacy `mytube` key included as well as `mytube:*`, each key and value unaltered from what storage returned, and no stored key changes |
| **RECOVER-2** | a blocked library | the home shows its load error | export is offered next to Retry; a library that loads doesn't offer it |
| **RECOVER-3** | chunks that are intact, mismatching, malformed and missing | previewing | each chunk is reported with its state and video count, plus the videos verified (intact chunks), the videos present but not verified (mismatching chunks) and the declared chunks unavailable (malformed or missing); no key changes |
| **RECOVER-4** | a mismatching chunk holding U+FFFD | previewing | it is flagged as possibly rewritten text, as information only; it changes no state and enables no repair by itself |

**Slice 2: writes to storage.**

| ID | Given | When | Then |
|---|---|---|---|
| **RECOVER-5** | a preview | the user tries to repair | repair remains unavailable until this flow has exported the same snapshot the preview read (matching snapshot ID) and the user has confirmed that the backup file was saved |
| **RECOVER-6** | a preview with verified videos and unverified or unavailable chunks | the user confirms | the confirmation names the verified videos to keep, the present but unverified videos to exclude, and the missing or malformed chunks whose video counts are unknown; dismissing it writes nothing |
| **RECOVER-7** | a confirmed preview, and the MyTube keys visible to this device differ from the previewed snapshot | applying | compare every MyTube key with the snapshot ID immediately before writing; reject with no write and request a new preview if anything differs |
| **RECOVER-8** | a confirmed, current preview with usable metadata and at least one verified video | applying | a separate repair write restores only videos from intact chunks, preserves categories and settings from the usable metadata, and uses the normal write's normalization, chunk packing, fingerprint rule and quota check; the library loads afterwards, and mismatching chunks are excluded from the new committed snapshot while the backup retains them |
| **RECOVER-9** | an apply whose storage `set` fails after preflight | the write fails | report that the stored state is uncertain, never retry automatically, keep the previously exported backup available, and require a fresh read and preview before another attempt |
| **RECOVER-10** | a blocked library with no user action, however many reads have failed | time passes | nothing is repaired, discarded or rewritten automatically |
| **RECOVER-11** | a preview with no verified videos and with unverified or unavailable chunks | the user considers repair | repair is unavailable; starting over with an empty library requires its own spec |

## Decisions

- **A mismatching hash is never accepted on its own.** It can mean rewritten text, a torn
  sync or a chunk that simply hasn't arrived yet, and the extension can't tell them apart.
  Only a person with the preview and a backup in hand decides (RECOVER-6, RECOVER-10).
- **RECOVER-3 reworded, approved by the owner 2026-11-04.** It said "total recoverable" and
  counted mismatching chunks as unavailable; the two decisions below replaced that.
- **Verified and present are separate numbers.** Only intact chunks are verified, and that
  is all a repair may keep by default. Mismatching chunks are counted apart as present but
  not verified, so "0 verified" can't suggest a backup holding videos is empty. With no
  usable metadata nothing can be verified, so stored chunks all report as mismatching.
- **Slice 2 excludes mismatching content.** The backup preserves it, but this repair writes
  only intact chunks. Offering a way to keep mismatching videos would require a per-video
  preview and a separate explicit confirmation.
- **Export and preview identify the same snapshot.** Each returns an ID derived from all
  MyTube keys and values, including the legacy key and stray chunks. A matching ID and the
  user's confirmation that the backup was saved are both required before repair. The worker
  recomputes the ID from storage immediately before writing (RECOVER-5, RECOVER-7).
- **A repair has its own guarded write.** `SyncStorageBackend.write()` rejects a blocked
  snapshot before writing; the repair must bypass that check only after the backup, preview,
  confirmation and current-snapshot checks. It reuses normal normalization, packing,
  fingerprint and quota rules. Near the quota, first-time hashes may wait under HEADROOM.
- **A failed `set` has an uncertain outcome.** Chrome quota failures tested so far were
  atomic, but `SyncArea` does not promise atomicity for every failure. The exported file
  remains available; the extension must inspect storage again before offering another repair.
- **Zero verified videos is not an empty-library repair.** Missing or malformed chunks have
  unknown video counts, and mismatching chunks can still hold videos. RECOVER-11 prevents a
  confirmation that would silently clear them.
- **Recovery reads skip `SyncStorageBackend.read()`.** That read is what fails, and it can
  also write (legacy migration and removal), which would break RECOVER-1.
- **Slices ship separately.** Slice 1 can't lose data and already removes the worst case,
  being locked out of your own library. Slice 2 overwrites storage and is scheduled after
  the browser foundation refactor PR.
- **Export is a local file.** Nothing leaves the machine, so `docs/PRIVACY.md` and the
  manifest permissions stay as they are.
- **The fail-closed behavior stays.** This adds a way out; it doesn't weaken the block.
- **RECOVER-7 is a best-effort check, not a transaction.** It catches changes observed
  before the repair. Browser sync has no compare-and-swap across devices, so another device
  can still write after the check, and the repair can overwrite that. The export is what
  protects the user in that window.

## Out of scope / non-goals

- Importing a backup file (restoring an export on another profile). Worth its own spec.
- Merging snapshots from two devices.
- Rebuilding lost metadata from oEmbed.
- Recovery UI in the popup or on YouTube; both point to the home.

## Manual acceptance (not unit-tested)

- [x] With a tampered chunk in real Chrome, the export file holds the tampered value unaltered
  (automated: `RECOVER-1` in `e2e/smoke.spec.ts`).
- [ ] Two synced profiles: a preview taken on one is rejected after the other writes (RECOVER-7).
