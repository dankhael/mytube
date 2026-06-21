# OpenSpec — FROZEN (read-only history)

As of 2026-06-21 this directory is **retired**. It is kept as history, not as a
live workflow.

- **Do not** run `/opsx:propose`, `/opsx:archive`, or any `opsx:*` skill against it.
- **Do not** add new `changes/` or edit the `specs/<capability>/` baselines.
- New behavior is specified in **one** place: `specs/<feature>.spec.md` (see
  [../specs/README.md](../specs/README.md) and the tiered workflow in
  [../CLAUDE.md](../CLAUDE.md)).

Why: maintaining OpenSpec changes *and* `specs/*.spec.md` meant writing the same
acceptance criteria twice in two notations (Requirement/Scenario here, the ID
table there), with IDs that never reconciled 1:1. The product specs carry the
stable-ID ↔ test-name traceability that's wired into the test suite, so they win.

The live "what the app does today" map now lives in
[../specs/CAPABILITIES.md](../specs/CAPABILITIES.md). The `specs/<capability>/spec.md`
files here are a frozen snapshot of "what the app did as of mid-2026" — fine to read
for historical detail, just not authoritative for anything new.
