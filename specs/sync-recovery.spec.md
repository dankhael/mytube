<!--
The handshake (see CLAUDE.md → "Workflow"):
  1. Agent drafts this file with Status: Draft.
  2. Human reviews/edits the criteria and flips Status to Approved.
  3. ONLY THEN may the agent implement (test per criterion → code → green).
Do not implement against a Draft. Do not edit Approved criteria without the human.
-->

# Spec: Recovering a blocked library

- **Status:** Approved by the owner 2026-11-04 (not implemented yet).
- **Owner:** dankhael
- **Contract:** new `Message` variants in [src/types.ts](../src/types.ts), one per step:
  export, preview and apply. Names are settled at implementation.
- **Builds on:** the fail-closed decision in
  [browser-foundation](./browser-foundation.spec.md), which requires this flow to have its
  own criteria, a backup of the original keys, a preview and explicit confirmation.
- **Tests:** new `src/sync-recovery.test.ts`; home in `newtab/App.test.tsx`.

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
| **RECOVER-3** | chunks that are intact, mismatching, malformed and missing | previewing | each chunk is reported with its state and video count, plus the total recoverable and the total of declared chunks unavailable; no key changes |
| **RECOVER-4** | a mismatching chunk holding U+FFFD | previewing | it is flagged as possibly rewritten text, as information only; it changes no state and enables no repair by itself |

**Slice 2: writes to storage.**

| ID | Given | When | Then |
|---|---|---|---|
| **RECOVER-5** | a preview, and no export in this flow | the user tries to repair | repair is unavailable until the export is done |
| **RECOVER-6** | a preview with mismatching or missing chunks | the user confirms | the confirmation names how many videos are kept and how many chunks are lost; dismissing it writes nothing |
| **RECOVER-7** | a confirmed preview, and storage that this device can see changed since it was taken | applying | rejected with no write, asking for a new preview |
| **RECOVER-8** | a confirmed, current preview | applying | recoverable videos are written through the normal path with fresh fingerprints and pass the quota check; the library loads afterwards |
| **RECOVER-9** | an apply that fails at `set` | it fails | the original keys are untouched and the library stays blocked, not partially repaired |
| **RECOVER-10** | a blocked library with no user action, however many reads have failed | time passes | nothing is repaired, discarded or rewritten automatically |

## Decisions

- **A mismatching hash is never accepted on its own.** It can mean rewritten text, a torn
  sync or a chunk that simply hasn't arrived yet, and the extension can't tell them apart.
  Only a person with the preview and a backup in hand decides (RECOVER-6, RECOVER-10).
- **Slices ship separately.** Slice 1 can't lose data and already removes the worst case,
  being locked out of your own library. Slice 2 overwrites storage, so it earns its own review.
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

- [ ] With a tampered chunk in real Chrome, the export file holds the tampered value unaltered.
- [ ] Two synced profiles: a preview taken on one is rejected after the other writes (RECOVER-7).
