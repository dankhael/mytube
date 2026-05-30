# Spec: Video metadata backfill

**Status:** Approved (implemented)

Fixes saved videos showing "Sem título" / "Canal desconhecido" when DOM scraping
fails on a YouTube surface. Missing fields are filled from YouTube's public oEmbed
endpoint (no API key) — on save and as a one-shot backfill of existing entries.

- **Contract:** `enrichOnSave` / `backfillMetadata` in `background/service-worker.ts`,
  `MyTubeStore.applyMetadata` in `src/storage.ts`, helpers in `src/metadata.ts`.
- **Tests:** [src/metadata.test.ts](../src/metadata.test.ts),
  [src/storage.test.ts](../src/storage.test.ts).

## Acceptance criteria

| ID | Given | When | Then |
|---|---|---|---|
| **META-1** | a video missing title or channel (empty or the placeholder) | `needsEnrichment(v)` | returns `true` |
| **META-2** | a video with real title and channel | `needsEnrichment(v)` | returns `false` |
| **META-3** | saved videos, some with placeholder metadata | `applyMetadata([...])` | only the listed ids get their title/channel replaced; others untouched |

## Manual acceptance (network / DOM — not unit-tested)

- [ ] Saving a card whose title didn't scrape stores the real title (oEmbed on save).
- [ ] Opening the new tab backfills previously-broken entries; cards update live.
- [ ] Private/region-locked videos (oEmbed 401) keep their placeholders, no crash.
