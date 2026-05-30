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

## Spec-driven development

- Specs live in `specs/*.spec.md` with stable acceptance-criteria IDs (e.g.
  `SAVE-3`). The matching Vitest test names the ID in its `it(...)` title.
- The `Message` union + `StorageData` schema in `src/types.ts` are the contract.
- All persistence flows through the `MyTubeStore` reducer over an injected
  `StorageBackend`; tests inject `FakeStorageBackend` (no Chrome runtime).
- New feature loop: spec → contract (types) → failing test → implement → green.
  DOM/content-script and React UI use the **Manual acceptance** checklists in the
  spec files instead of unit tests. See `specs/README.md`.

## Tests

- Tests run with a single command: `npm test` (watch: `npm run test:watch`).
  This covers the reducer (Vitest/Node) and new-tab components (Vitest +
  Testing Library/jsdom).
- E2E smoke that loads the built extension: `npm run test:e2e` (Playwright,
  headed Chromium; needs `npx playwright install chromium` once). Kept out of
  the edit-time hook because it's slow and needs a browser.
- A PostToolUse hook (`.claude/settings.json` → `scripts/test-hook.mjs`) runs
  `vitest run` after any source edit and blocks on red. Don't finish on a red gate.
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