# Spec: Watched state, badge & storage quota

**Status:** Approved (implemented)

Contract: `MARK_WATCHED` in [src/types.ts](../src/types.ts), `unwatchedCount` and
`getBytesInUse` in [src/storage.ts](../src/storage.ts).
Tests: [src/storage.test.ts](../src/storage.test.ts).

## Acceptance criteria

| ID | Given | When | Then |
|---|---|---|---|
| **WATCH-1** | an unwatched video | `MARK_WATCHED` `watched: true` | the video has `watched: true` and a numeric `watchedAt` |
| **WATCH-2** | a watched video | `MARK_WATCHED` `watched: false` | `watched` becomes false and `watchedAt` is cleared (`undefined`) |
| **BADGE-1** | a mix of watched/unwatched videos | call `unwatchedCount` | it returns the count of videos with `watched === false` only |
| **QUOTA-1** | an empty store | save a video, then read `getBytesInUse` | the reported size grows above its empty baseline |

## Manual acceptance (UI — not unit-tested)

- [ ] The toolbar shows the red badge with the unwatched count; it hits 0 → no badge.
- [ ] Watched videos show the dimmed overlay + ✓ and can be hidden via the toggle.
- [ ] When `getBytesInUse` ≥ 80% of 100KB, the new-tab page shows the amber quota warning.
