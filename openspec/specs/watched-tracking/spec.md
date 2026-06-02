# watched-tracking

## Purpose

Track whether each saved video has been watched and surface the count of unwatched
videos on the toolbar badge. Reducer logic in
[src/storage.ts](../../../src/storage.ts); badge in
[background/service-worker.ts](../../../background/service-worker.ts). Consolidates
the watched/badge portion of `specs/watched-quota.spec.md` (WATCH-*, BADGE-1). The
quota portion (QUOTA-1) lives in the `persistence-sync` capability.

<!-- TODO: reconcile scenario IDs against specs/watched-quota.spec.md
     (WATCH-1, WATCH-2, BADGE-1). Scenarios below are derived from the code. -->

## Requirements

### Requirement: Mark a video watched or unwatched

Marking a video watched SHALL set `watched` true and stamp `watchedAt`; marking it
unwatched MUST set `watched` false and clear `watchedAt`.

#### Scenario: Mark watched stamps a timestamp (WATCH-1)
- **WHEN** the user marks a video as watched
- **THEN** the video's `watched` is set true and `watchedAt` is set to the current time

#### Scenario: Mark unwatched clears the timestamp (WATCH-2)
- **WHEN** the user marks a watched video as unwatched
- **THEN** `watched` is set false and `watchedAt` is cleared

### Requirement: Unwatched count drives the toolbar badge

The toolbar badge SHALL show the count of videos with `watched === false` when it
is greater than zero, and MUST be empty when the count is zero.

#### Scenario: Badge shows the unwatched count (BADGE-1)
- **WHEN** the unwatched count is greater than zero
- **THEN** the toolbar badge shows that number on a red background

#### Scenario: Badge clears at zero
- **WHEN** the unwatched count is zero
- **THEN** the badge text is empty

#### Scenario: Badge tracks changes from any surface
- **WHEN** the stored data changes in `chrome.storage.sync` from another context
- **THEN** the badge is recomputed from the new value

<!-- Implementation note (inconsistency I2): only SAVE_VIDEO updates the badge
     directly; all other mutations refresh it via the storage.onChanged listener.
     The observable guarantee is "badge reflects current unwatched count". -->
