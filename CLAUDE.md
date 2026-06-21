## Code style

- Functions: 4-20 lines. Split if longer.
- Files: under 500 lines. Split by responsibility.
- One thing per function, one responsibility per module (SRP).
- Names: specific and unique. Avoid `data`, `handler`, `Manager`.
  Prefer names that return <5 grep hits in the codebase.
- Types: explicit. No `any`, no `Dict`, no untyped functions.
- No code duplication. Extract shared logic into a function/module.
- Early returns over nested ifs. Max 2 levels of indentation.
- Exception messages must include the offending value and expected shape.

## Comments

- Keep your own comments. Don't strip them on refactor — they carry
  intent and provenance.
- Write WHY, not WHAT. Skip `// increment counter` above `i++`.
- Docstrings on public functions: intent + one usage example.
- Reference issue numbers / commit SHAs when a line exists because
  of a specific bug or upstream constraint.

## Workflow (tiered by change size)

Pick the tier by the size of the change. Don't pay feature ceremony for a typo.
Worked, step-by-step recipes for every entry path live in `specs/WORKFLOW.md`.

**Tier 0 — trivial**: one-line fixes, copy/i18n tweaks, CSS/DOM nudges, dep bumps.
No spec, no handshake.
- Bug fix with testable logic → write the failing regression test, fix, green.
- Pure DOM/CSS/copy with nothing a unit test can assert → just make the change.

**Tier 1 — feature or behavior change**: new criteria, a new `Message` variant,
reducer logic. One spec file, the handshake, tests bound to IDs.

1. **Draft** — copy `specs/_TEMPLATE.spec.md` → `specs/<feature>.spec.md` with
   `Status: Draft`. Stop and ask for approval. Do NOT write code.
2. **Approve** — the human reviews/edits the criteria and flips `Status: Approved`.
   Only a human sets Approved.
3. **Contract** — if needed, encode it in `src/types.ts` (a `Message` variant or
   `StorageData` field) before the test.
4. **Implement** — for each ID, write the failing `it('<ID>: …')`, then code to green.
5. **Changing criteria** — never silently edit an `Approved` criterion to turn a red
   test green. Propose the edit and get human sign-off first.

The spec file is the **single source per feature**. It holds `## Why`, the
acceptance-criteria table (stable `PREFIX-N` IDs, e.g. `SAVE-3`, one per
`it('<ID>: …')`), `## Decisions` for design rationale worth keeping, and
`## Manual acceptance` for DOM/UI behavior a unit test can't assert.

Rules of thumb: criteria must be **observable** (a test can assert them); behavior
that can't be unit-tested (YouTube DOM, render quirks) goes in **Manual acceptance**,
never faked in a test. Grep an ID to see spec ↔ test in one shot — a criterion with
no matching test name is a visible coverage gap. For a clean separation, draft the
spec in one session and implement in a fresh one.

**Contract & persistence (always):** the `Message` union + `StorageData` schema in
`src/types.ts` are the typed contract. All persistence flows through the `MyTubeStore`
reducer over an injected `StorageBackend`; tests inject `FakeStorageBackend` (no
Chrome runtime).

**Capability map:** `specs/CAPABILITIES.md` is the living "what the app does today"
index — one digest entry per capability pointing at the authoritative spec IDs.
Update the relevant bullet in the same PR that lands a Tier-1 spec.

**OpenSpec is retired.** `openspec/` is frozen, read-only history — do not run
`/opsx:propose` or `/opsx:archive`, add new changes, or edit baselines. Spec new
behavior only in `specs/*.spec.md`.

## Tests

- Tests run with a single command: `npm test` (watch: `npm run test:watch`).
  This covers the reducer (Vitest/Node) and new-tab components (Vitest +
  Testing Library/jsdom).
- E2E smoke that loads the built extension: `npm run test:e2e` (Playwright,
  headed Chromium; needs `npx playwright install chromium` once). Kept out of
  the edit-time hook because it's slow and needs a browser.
- A PostToolUse hook (`.claude/settings.json` → `scripts/test-hook.mjs`) runs
  `vitest run` after any source edit and blocks on red. Don't finish on a red gate.
- A Stop hook (`scripts/capabilities-map-hook.mjs`) blocks finishing when a
  `specs/*.spec.md` changed in the working tree but `specs/CAPABILITIES.md` did
  not — keeping the capability map from drifting. Update the map and continue.
- Every new function gets a test. Bug fixes get a regression test.
- Mock external I/O (API, DB, filesystem) with named fake classes,
  not inline stubs.
- Tests must be F.I.R.S.T: fast, independent, repeatable,
  self-validating, timely.

## Dependencies

- Inject dependencies through constructor/parameter, not global/import.
- Wrap third-party libs behind a thin interface owned by this project.

## Structure

- Follow the framework's convention (Rails, Django, Next.js, etc.).
- Prefer small focused modules over god files.
- Predictable paths: controller/model/view, src/lib/test, etc.

## Formatting

- Use the language default formatter (`cargo fmt`, `gofmt`, `prettier`,
  `black`, `rubocop -A`). Don't discuss style beyond that.

## Logging

- Structured JSON when logging for debugging / observability.
- Plain text only for user-facing CLI output.