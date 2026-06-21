# Specs — MyTube

A feature is specified in **one file**: `specs/<feature>.spec.md`. The supporting
layers are the typed contract and the tests:

| Layer | Artifact | Source of truth for |
|---|---|---|
| **Feature spec** | `specs/*.spec.md` (this folder) + [mytube-extension-prompt.md](../mytube-extension-prompt.md) | the WHY, human-Approved acceptance criteria with stable IDs, decisions, manual-acceptance checks |
| **Contract spec** | the `Message` union + `StorageData` schema in [src/types.ts](../src/types.ts) | the typed interface every mutation goes through |
| **Executable spec** | [src/storage.test.ts](../src/storage.test.ts) (Vitest) | proof the reducer matches the criteria |

> **The living capability map is [`CAPABILITIES.md`](./CAPABILITIES.md)** — a
> one-line-per-capability digest of "what the app does today," indexing the
> authoritative spec IDs. Update its bullet in the same PR that lands a feature.
>
> **OpenSpec is retired.** `openspec/` is frozen, read-only history (it predates
> `CAPABILITIES.md`). Don't run `/opsx:propose`/`/opsx:archive` or edit baselines.
>
> **Trivial work skips this folder.** One-line fixes, copy/i18n tweaks, CSS/DOM
> nudges, and dep bumps need no spec (a bug fix still gets a regression test). See
> the tiered workflow in `CLAUDE.md`.

## Traceability

Every acceptance criterion has a stable **ID** (e.g. `SAVE-3`). The matching test
names the ID in its `it(...)` title:

```ts
it('SAVE-3: re-saving a video moves it instead of duplicating', ...)
```

So you can grep an ID across the repo to see spec ↔ contract ↔ test in one shot,
and a criterion with no matching test name is a visible coverage gap.

## Workflow per feature

> **New here?** [`WORKFLOW.md`](./WORKFLOW.md) is the didactic, worked guide — it
> walks every entry path (trivial fix, bug fix, you-draft, agent-drafts, big
> structural change, changing an Approved criterion) with formalized steps.

Copy [`_TEMPLATE.spec.md`](./_TEMPLATE.spec.md) and follow the **Spec handshake**
(a human approves the criteria before any code is written — see `CLAUDE.md`).

0. Draft `specs/<feature>.spec.md` from the template with `Status: Draft`; get it
   reviewed and flipped to `Status: Approved` by a human. Do NOT write code first.
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
