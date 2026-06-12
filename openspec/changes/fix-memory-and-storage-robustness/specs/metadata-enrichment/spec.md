## MODIFIED Requirements

### Requirement: One-shot backfill of existing videos

A guarded `backfillMetadata` pass SHALL repair already-saved incomplete videos in
a single write. It MUST run on `onInstalled`, `onStartup`, and fire-and-forget on
`GET_ALL`, and the `backfilling` flag MUST prevent overlapping runs.

The pass MUST NOT re-fetch a video whose oEmbed lookup already failed during the
current service-worker session: failed ids are remembered in a session-scoped set
and skipped on subsequent passes. The set dies with the service worker, so a
video that later becomes available is retried after the next worker restart —
the same eventual consistency the feature already has.

#### Scenario: Repair stored placeholders
- **WHEN** the backfill pass runs and finds saved videos needing enrichment
- **THEN** it fetches oEmbed for each and applies the recovered title/channel in one `applyMetadata` write

#### Scenario: Nothing to repair
- **WHEN** no saved video needs enrichment
- **THEN** the pass makes no write

#### Scenario: Failed lookups are not retried within a session
- **WHEN** a video's oEmbed lookup failed earlier in the same service-worker session (private, deleted, region-locked)
- **THEN** subsequent backfill passes skip it without a network request

#### Scenario: Failure cache resets with the worker
- **WHEN** the service worker restarts (browser restart, worker eviction)
- **THEN** previously failed videos are eligible for one new lookup attempt
