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
- New feature loop: change (OpenSpec) → spec → contract (types) → failing test →
  implement → green. DOM/content-script and React UI use the **Manual acceptance**
  checklists in the spec files instead of unit tests. See `specs/README.md`.

## Spec handshake (who owns what)

The agent may draft and execute specs, but a human owns the criteria. This is the
one boundary that keeps SDD honest — the author of success can't also be its only
judge. Start from `specs/_TEMPLATE.spec.md`.

1. **Draft** — agent writes `specs/<feature>.spec.md` with `Status: Draft` from the
   human's feature description. Stop here and ask for approval. Do NOT write code.
2. **Approve** — the human reviews/edits the acceptance criteria and flips
   `Status: Approved`. Only a human sets Approved.
3. **Implement** — only against an `Approved` spec: for each ID, write the failing
   `it('<ID>: …')`, then implement until green.
4. **Changing criteria** — never silently edit an `Approved` criterion to make a red
   test pass. Propose the change as its own spec diff and get human sign-off.

Rules of thumb: keep criteria **observable** (a test can assert them); if a behavior
can't be unit-tested (YouTube DOM), it belongs in **Manual acceptance**, not faked in
a test. For a clean separation, draft the spec in one session and implement in a fresh
one so the implementer works only from the approved text.

## OpenSpec layer (capability baseline + change tracking)

OpenSpec sits *above* the handshake, not in place of it. The two layers divide
cleanly — keep one source of truth per concern:

- `openspec/specs/<capability>/spec.md` — the durable **capability baseline**:
  "what the system does today," in Requirement/Scenario form. Source of truth for
  the capability map.
- `openspec/changes/<name>/` — a **proposed change**: `/opsx:propose` drafts it,
  `/opsx:archive` folds its delta back into the baseline.
- `specs/*.spec.md` + the handshake above — the **implementation layer**: granular,
  human-Approved, test-bound criteria with stable IDs. **Unchanged** — the human
  still owns Approved.

Per-feature flow: `/opsx:propose` a change → refine its delta into granular
`specs/<feature>.spec.md` criteria (handshake applies) → failing test per ID →
green → `/opsx:archive`. **Never edit an `openspec/specs/` baseline directly to
describe new behavior — that change goes through an OpenSpec change.** The baselines
carry `TODO` notes where legacy criteria IDs aren't yet reconciled 1:1; reconcile a
capability's TODOs the first time it gets a change.

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