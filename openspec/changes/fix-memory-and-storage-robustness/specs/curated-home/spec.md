## ADDED Requirements

### Requirement: Failed mutations are surfaced

The home MUST NOT silently drop a mutation that resolves
`{ ok: false, error }` (quota exceeded, validation rejection, sync failure).
The structured error SHALL be logged to the console (structured JSON) and a
non-blocking error toast SHALL tell the user the action did not persist. The
optimistic UI state MUST NOT be left claiming the mutation succeeded.

#### Scenario: Failed save is visible
- **WHEN** a mutation from the home resolves `{ ok: false, error }`
- **THEN** the structured error is logged to the console and an error toast states the action was not saved

#### Scenario: Successful mutations show no error
- **WHEN** a mutation resolves `{ ok: true }`
- **THEN** no error toast or error log is produced (behavior unchanged)

## MODIFIED Requirements

### Requirement: Storage quota warning

The home SHALL warn the user when stored bytes reach 80% (`WARN_RATIO`) of the
**binding** `chrome.storage.sync` limit — the lower of the 102,400-byte total
quota and any per-item ceiling imposed by the storage layout — so the warning
always fires before writes start failing, not after.

#### Scenario: Warn at 80% of the binding limit
- **WHEN** stored bytes reach 80% of the binding storage limit
- **THEN** a warning banner is shown with the current percentage and advice to remove videos

#### Scenario: Warning precedes write failure
- **WHEN** the storage layout makes a limit lower than the 102,400-byte total binding (e.g. a per-item quota)
- **THEN** the banner threshold is computed against that lower limit
