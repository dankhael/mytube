## REMOVED Requirements

### Requirement: Single-key snapshot store via a reducer

**Reason**: The single `mytube` key makes `chrome.storage.sync`'s 8,192-byte
per-item quota the real write ceiling — saves start throwing around ~30–35
videos (finding R1). Replaced by the sharded snapshot store below; the
reducer-only mutation rule is carried forward unchanged.

**Migration**: On first read after upgrade, the backend migrates the legacy
`mytube` key into the sharded layout (write shards, then remove the legacy
key). No action from the user; the `StorageData` contract and reducer API are
unchanged.

## ADDED Requirements

### Requirement: Sharded snapshot store via a reducer

Every video or category mutation SHALL go through the `MyTubeStore` reducer,
which reads the whole `StorageData` snapshot, transforms it, and commits it
back through the injected backend. The Chrome backend SHALL persist the
snapshot sharded across multiple `chrome.storage.sync` keys — a `mytube:meta`
key (categories, settings, schema marker) plus `mytube:videos:<n>` chunk keys —
with every key kept under the 8,192-byte per-item quota, so the effective
ceiling is the 102,400-byte total. The sharding MUST be invisible above the
`StorageBackend` interface: `read()` returns one `StorageData`, `write()`
accepts one.

#### Scenario: Mutations go through the reducer
- **WHEN** any video or category mutation occurs
- **THEN** it reads the current `StorageData`, applies the change, and commits the whole snapshot to the backend

#### Scenario: Library larger than 8 KB persists
- **WHEN** the serialized library exceeds 8,192 bytes (e.g. 50+ saved videos)
- **THEN** the write succeeds, with no single sync key exceeding the per-item quota

#### Scenario: Legacy single-key data is migrated
- **WHEN** the backend reads and finds the legacy `mytube` key
- **THEN** it returns that data, persists it in the sharded layout, and removes the legacy key only after the sharded write succeeded

#### Scenario: Interrupted migration loses nothing
- **WHEN** a previous migration wrote the shards but failed before removing the legacy key
- **THEN** the next read prefers the sharded layout (schema marker) and retries the legacy-key removal

### Requirement: Serialized mutations

`MyTubeStore` SHALL serialize its mutations so each read-modify-write begins
only after the previous commit finished; two interleaving mutations MUST NOT
lose either update. A failed mutation MUST reject its caller's promise without
blocking subsequent mutations.

#### Scenario: Concurrent mutations both apply
- **WHEN** two mutations are issued without awaiting each other (e.g. a `SAVE_VIDEO` while a reorder commits)
- **THEN** both changes are present in the final stored snapshot

#### Scenario: A failed write does not wedge the queue
- **WHEN** a mutation's backend write rejects
- **THEN** that mutation's promise rejects and the next queued mutation still runs

### Requirement: Write failures propagate

A backend write rejection (quota exceeded, sync error) SHALL propagate out of
the store and surface to the message sender as `{ ok: false, error }` — it MUST
NOT be silently swallowed at any layer.

#### Scenario: Quota rejection reaches the caller
- **WHEN** the backend's write rejects
- **THEN** the mutation resolves `{ ok: false, error }` with the failure reason, and the stored snapshot is unchanged

## MODIFIED Requirements

### Requirement: Quota visibility

`getBytesInUse` SHALL report current usage against the binding
`chrome.storage.sync` limit so the home can warn before writes start failing.
The binding limit is the lower of the 102,400-byte total quota and any
per-item constraint imposed by the storage layout; with the sharded layout the
total quota binds, but the headroom computation MUST remain correct if the
layout changes.

#### Scenario: Report bytes in use (QUOTA-1)
- **WHEN** a surface requests current usage
- **THEN** `getBytesInUse` returns the backend's byte count, which the home uses to warn near the limit

#### Scenario: Warning fires before writes fail
- **WHEN** stored usage approaches the binding limit (total or per-item, whichever is lower)
- **THEN** the warning threshold is computed against that binding limit, so the banner shows before a write would be rejected
