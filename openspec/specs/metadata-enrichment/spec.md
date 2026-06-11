# metadata-enrichment

## Purpose

Backfill a saved video's title and channel name from YouTube's keyless public
oEmbed endpoint when DOM scraping failed (new "lockup" layouts, lazy renders).
Implemented in [src/metadata.ts](../../../src/metadata.ts) and driven by the
service worker. Consolidates `specs/metadata.spec.md` (META-*).

<!-- Scenario IDs reconciled against specs/metadata.spec.md (META-1..3) by the
     harden-extension-security change, 2026-06-10. -->

## Requirements

### Requirement: Detect incompletely-scraped videos

A video MUST be treated as needing enrichment when its title or channel is absent
or still equals a scraping placeholder (`Sem título` / `Canal desconhecido`).

#### Scenario: Placeholder is treated as missing (META-1)
- **WHEN** a video's title is empty or equals `Sem título`, or its channel is empty or equals `Canal desconhecido`
- **THEN** `needsEnrichment` reports it as needing enrichment

#### Scenario: Complete video is left alone (META-2)
- **WHEN** a video already has a non-placeholder title and channel
- **THEN** it is not selected for enrichment

### Requirement: Enrich on save (best effort)

When a `SAVE_VIDEO` arrives for a video that needs enrichment, the worker SHALL
fetch oEmbed by id and fill the missing fields before storing; a failed lookup
MUST NOT block the save.

#### Scenario: Fill missing fields before storing
- **WHEN** a `SAVE_VIDEO` arrives for a video that needs enrichment
- **THEN** the worker fetches oEmbed by id and fills title/channel before storing

#### Scenario: Lookup failure does not block the save
- **WHEN** the oEmbed lookup fails (network error, private/region-locked video answering non-OK)
- **THEN** the video is stored with whatever fields it already had and the save still succeeds

### Requirement: One-shot backfill of existing videos

A guarded `backfillMetadata` pass SHALL repair already-saved incomplete videos in
a single write. It MUST run on `onInstalled`, `onStartup`, and fire-and-forget on
`GET_ALL`, and the `backfilling` flag MUST prevent overlapping runs.

#### Scenario: Repair stored placeholders (META-3)
- **WHEN** the backfill pass runs and finds saved videos needing enrichment
- **THEN** it fetches oEmbed for each and applies the recovered title/channel in one `applyMetadata` write

#### Scenario: Nothing to repair
- **WHEN** no saved video needs enrichment
- **THEN** the pass makes no write

<!-- TODO(owned by fix-memory-and-storage-robustness, M1): offline/failed-lookup
     retry behavior is undocumented (inconsistency I3). That change specifies the
     session-scoped failure cache and the retry-after-SW-restart model; reconcile
     this note when it archives. -->
