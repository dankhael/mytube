# persistence-sync

## Purpose

The storage substrate all surfaces share: a single `mytube` key in
`chrome.storage.sync` holding one `StorageData` blob, mutated only through the
`MyTubeStore` reducer ([src/storage.ts](../../../src/storage.ts)) over an injected
`StorageBackend`. Live updates fan out to every surface via `storage.onChanged`.

<!-- TODO: this capability has NO source spec file — it is net-new prose derived
     from src/storage.ts, src/storage-backend.ts and src/storage.test.ts. It is
     the one capability where requirements were inferred rather than carried
     forward. The QUOTA-1 criterion from specs/watched-quota.spec.md is placed
     here. Review with extra care. -->

## Requirements

### Requirement: Single-key snapshot store via a reducer

Every video or category mutation SHALL go through the `MyTubeStore` reducer, which
reads the whole `StorageData` snapshot, transforms it, and commits it back through
the injected backend.

#### Scenario: Mutations go through the reducer
- **WHEN** any video or category mutation occurs
- **THEN** it reads the current `StorageData`, applies the change, and commits the whole snapshot to the backend

### Requirement: Defensive defaults instead of migrations

`getData` SHALL fill missing or empty fields from defaults so a schema that grew
between versions still reads cleanly without an explicit migration step.

#### Scenario: Missing settings fall back
- **WHEN** stored data predates a settings field
- **THEN** the returned settings merge stored values over `DEFAULT_SETTINGS`

#### Scenario: Empty categories fall back to defaults
- **WHEN** stored data has no categories
- **THEN** the default category set is returned

#### Scenario: No stored data
- **WHEN** nothing has been stored yet
- **THEN** `getData` returns a clone of `DEFAULT_DATA`

### Requirement: Live cross-surface updates

A change to the `mytube` key in `chrome.storage.sync` SHALL update every surface
(content script, home, badge) without a reload.

#### Scenario: Surfaces re-render on storage change
- **WHEN** the `mytube` key changes in `chrome.storage.sync` from any context
- **THEN** the content script, home and badge update from the new value without a reload

### Requirement: Quota visibility

`getBytesInUse` SHALL report current usage against the `chrome.storage.sync`
ceiling (102,400 bytes) so the home can warn near the limit.

#### Scenario: Report bytes in use (QUOTA-1)
- **WHEN** a surface requests current usage
- **THEN** `getBytesInUse` returns the backend's byte count, which the home uses to warn near the limit

<!-- TODO: confirm whether write-failure behavior when the quota is exceeded is a
     guaranteed requirement (e.g. the write rejects and the UI surfaces an error)
     or merely the warning banner. Not specified here to avoid inventing it. -->
