# Specs — MyTube

Spec-driven development for this project works in linked layers:

| Layer | Artifact | Source of truth for |
|---|---|---|
| **Capability baseline** | `openspec/specs/<capability>/spec.md` | _what capabilities exist today_ (the map); deltas go through OpenSpec changes |
| **Product spec** | `specs/*.spec.md` (this folder) + [mytube-extension-prompt.md](../mytube-extension-prompt.md) | granular, human-Approved acceptance criteria with stable IDs |
| **Contract spec** | the `Message` union + `StorageData` schema in [src/types.ts](../src/types.ts) | the typed interface every mutation goes through |
| **Executable spec** | [src/storage.test.ts](../src/storage.test.ts) (Vitest) | proof the reducer matches the criteria |

> **OpenSpec sits above the handshake, not in place of it.** `openspec/specs/`
> answers "what does the app do today"; `specs/*.spec.md` + the handshake (see
> `CLAUDE.md`) is still where granular criteria get human-Approved and bound to
> tests. Don't describe new behavior by editing a baseline directly — open an
> OpenSpec change (`/opsx:propose` → `/opsx:archive`).

## Traceability

Every acceptance criterion has a stable **ID** (e.g. `SAVE-3`). The matching test
names the ID in its `it(...)` title:

```ts
it('SAVE-3: re-saving a video moves it instead of duplicating', ...)
```

So you can grep an ID across the repo to see spec ↔ contract ↔ test in one shot,
and a criterion with no matching test name is a visible coverage gap.

## Workflow per feature

Start with an OpenSpec change (`/opsx:propose`), then copy
[`_TEMPLATE.spec.md`](./_TEMPLATE.spec.md) and follow the **Spec handshake**
(a human approves the criteria before any code is written — see `CLAUDE.md`).

0. Open an OpenSpec change for the work (`/opsx:propose`). Then draft
   `specs/<feature>.spec.md` from the template with `Status: Draft`; get it
   reviewed and flipped to `Status: Approved` by a human. On archive
   (`/opsx:archive`), the change's delta folds into the `openspec/specs/` baseline.
1. Encode the contract in `src/types.ts` (a new `Message` variant or schema field).
2. Write the failing test referencing the IDs (`src/storage.test.ts` or
   `newtab/*.test.tsx`).
3. Implement (`src/storage.ts` reducer / the component) until green.
4. For DOM/UI behavior that can't be unit-tested (content script), add a row to the
   **Manual acceptance** table instead.

Never edit an `Approved` criterion just to turn a red test green — propose it as its
own spec diff and get sign-off.

## Why the reducer is the test target

All persistence flows through `MyTubeStore` over an injected `StorageBackend`
([src/storage-backend.ts](../src/storage-backend.ts)). Tests inject
`FakeStorageBackend` ([test/fake-storage.ts](../test/fake-storage.ts)) — no Chrome
runtime required, so the executable specs are fast and deterministic (F.I.R.S.T).

## Test layers

| Layer | Tool | Files | Command |
|---|---|---|---|
| Reducer (pure logic) | Vitest (Node) | `src/storage.test.ts` | `npm test` |
| New-tab components | Vitest + Testing Library (jsdom) | `newtab/*.test.tsx` | `npm test` |
| Extension load (smoke) | Playwright (headed Chromium) | `e2e/*.spec.ts` | `npm run test:e2e` |

`npm test` runs the reducer + component specs (fast, no browser). `npm run test:e2e`
builds `dist/` and loads it as an unpacked extension — it needs
`npx playwright install chromium` once and a headed browser, so it's kept out of the
PostToolUse hook gate.

The DOM-reading **content script** stays on the **Manual acceptance** checklists —
mocking YouTube's shifting DOM isn't worth it. Everything reachable from the new-tab
page or the built extension is now automatable.

Run: `npm test` (watch: `npm run test:watch`) · `npm run test:e2e` for the smoke.
