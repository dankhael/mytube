## ADDED Requirements

### Requirement: Stored snapshot is sanitized on read

Every read of the `mytube` snapshot SHALL pass through a pure
`sanitizeStorageData(raw: unknown): StorageData` that validates field shapes,
drops malformed entries, and applies the existing defaults — in
`MyTubeStore.getData()` and in every `storage.onChanged` listener before the new
value is used. `chrome.storage.sync` is written by every synced device,
including other versions of this extension, so the cast can never be trusted.
Sanitization MUST NOT write back to storage; the stored bytes stay untouched
until the next legitimate mutation. Well-formed data MUST pass through
byte-identical.

#### Scenario: Well-formed snapshot is untouched
- **WHEN** a stored snapshot already matches the `StorageData` shape
- **THEN** `sanitizeStorageData` returns it byte-identical (deep-equal, no field reordering or dropping)

#### Scenario: Malformed snapshot does not crash the badge listener
- **WHEN** `changes.mytube.newValue` is missing, not an object, or lacks a `videos` array
- **THEN** the service worker's badge listener returns early or receives sanitized defaults instead of throwing

#### Scenario: Malformed entries are dropped, valid ones kept
- **WHEN** a snapshot's `videos` array mixes valid video objects with entries of the wrong shape
- **THEN** the sanitized result keeps the valid videos and drops only the malformed entries

#### Scenario: Unknown category icon is sanitized on read
- **WHEN** a stored category carries an `icon` outside the closed icon set
- **THEN** the sanitized category treats the icon as unset and the UI renders the same fallback as a missing icon
