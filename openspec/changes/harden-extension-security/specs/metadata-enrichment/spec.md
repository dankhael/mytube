## ADDED Requirements

### Requirement: Bounded oEmbed fetch

The oEmbed metadata fetch SHALL carry an abort timeout
(`AbortSignal.timeout(8_000)`) so a hung response cannot stall the sequential
backfill loop or keep the service worker alive past the timeout. A timed-out
fetch MUST follow the existing failure path (resolve `null`, keep whatever
fields the video already has).

#### Scenario: Hung response is aborted
- **WHEN** the oEmbed endpoint does not respond within 8 seconds
- **THEN** the fetch aborts, `fetchVideoMetadata` resolves `null`, and the caller proceeds exactly as for any other failed lookup

#### Scenario: Fast response is unaffected
- **WHEN** the oEmbed endpoint responds normally
- **THEN** metadata is returned as before — the timeout changes nothing on the happy path
