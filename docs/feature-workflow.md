# Feature workflow — from idea to merged

How a feature gets built in MyTube, end to end, with the exact commands. It ties
together the two spec layers (see `CLAUDE.md` and `specs/README.md`):

```
OpenSpec layer ── governs CHANGE          /opsx:propose → /opsx:apply → /opsx:archive
  openspec/specs/<cap>/        capability baseline ("what is")
  openspec/changes/<name>/     the proposed delta for THIS feature

Project SDD layer ── governs IMPLEMENTATION   the Draft→Approved handshake
  specs/<feature>.spec.md      granular, human-Approved criteria + IDs
  src/types.ts                 the typed contract (Message / StorageData)
  src/*.test.ts                it('<ID>: …') executable proof
```

Rule of thumb: **OpenSpec wraps the work; the handshake gates the code.** You never
describe new behavior by editing an `openspec/specs/` baseline directly — that lands
there only when the change is archived.

---

## Worked example: "Mark all videos in a category as watched"

A small, reducer-backed feature. It modifies the existing **`watched-tracking`**
capability, so it shows a delta against a baseline and the lazy-TODO reconciliation.

### 0. (Optional) Think it through

```bash
/opsx:explore mark a whole category as watched in one click
```

Explore mode is for thinking only — no code. Skip it for something this small.

### 1. Branch

```bash
git checkout -b feat/mark-category-watched
```

### 2. Propose the change (OpenSpec)

```bash
/opsx:propose mark all videos in a category as watched
```

This scaffolds `openspec/changes/mark-category-watched/`:

```
openspec/changes/mark-category-watched/
├── proposal.md     why + what + scope
├── tasks.md        the work breakdown
└── specs/
    └── watched-tracking/
        └── spec.md  the DELTA (## ADDED / ## MODIFIED Requirements)
```

The delta spec uses delta headers — e.g. a new requirement:

```markdown
## ADDED Requirements

### Requirement: Mark an entire category watched

The user SHALL be able to mark every video in one category as watched in a single
action.

#### Scenario: Bulk-mark a category
- **WHEN** the user marks category C as watched
- **THEN** every video whose category is C has `watched=true` and a `watchedAt` stamp
- **AND** videos in other categories are unchanged
```

Validate the proposal before building:

```bash
openspec validate mark-category-watched --type change --strict
```

**→ Human reviews `proposal.md` and the delta here.** This is the scope gate.

### 3. Draft the granular spec + get it Approved (the handshake)

Copy the template and write the test-bound criteria with stable IDs:

```bash
cp specs/_TEMPLATE.spec.md specs/mark-category-watched.spec.md
```

Give it `Status: Draft` and criteria like `MCW-1`, `MCW-2`. **Stop. A human reviews
and flips `Status: Approved`.** Only a human sets Approved — no code before that.

### 4. Encode the contract

Add the message variant in [src/types.ts](../src/types.ts):

```ts
| { action: 'MARK_CATEGORY_WATCHED'; category: string; watched: boolean }
```

### 5. Write the failing test (one per ID)

In [src/storage.test.ts](../src/storage.test.ts):

```ts
it('MCW-1: marks every video in a category watched, leaving others untouched', async () => {
  // arrange a store with two categories, act, assert
})
```

```bash
npm test        # red — the reducer method doesn't exist yet
```

### 6. Implement until green

Add the reducer method in [src/storage.ts](../src/storage.ts) and handle the new
action in [background/service-worker.ts](../background/service-worker.ts). The
PostToolUse hook runs `vitest run` on every source edit and **blocks on red**, so
keep going until:

```bash
npm test        # green
```

### 7. Wire the UI + manual acceptance

Add the button (e.g. in the category section header on the home). DOM/UI behavior
that can't be unit-tested goes in the **Manual acceptance** table of
`specs/mark-category-watched.spec.md`, not faked in a test. Smoke-load the built
extension if it touches the content script or new tab:

```bash
npm run build
npm run test:e2e      # needs `npx playwright install chromium` once
```

### 8. Mark tasks done (OpenSpec)

```bash
/opsx:apply mark-category-watched      # work through tasks.md, checking items off
```

### 9. Archive — fold the delta into the baseline

```bash
/opsx:archive mark-category-watched
```

This applies the delta to `openspec/specs/watched-tracking/spec.md` and moves the
change into the archive. Now is the moment to **reconcile that capability's
`TODO`s** (the lazy policy): the baseline's `WATCH-*`/`BADGE-*` IDs against the
original `specs/watched-quota.spec.md`, plus the new `MCW-*` you just added.

```bash
openspec validate --specs        # baseline still valid after the merge
```

### 10. Commit and PR

```bash
git add -A
git commit -m "feat(watched): mark all videos in a category as watched (MCW-1..2)"
git push -u origin feat/mark-category-watched
gh pr create --base master --fill
```

---

## Command quick reference

| Step | Command |
|---|---|
| Think (no code) | `/opsx:explore <topic>` |
| Branch | `git checkout -b feat/<name>` |
| Propose change | `/opsx:propose <description>` |
| Validate a change | `openspec validate <name> --type change --strict` |
| Draft granular spec | `cp specs/_TEMPLATE.spec.md specs/<name>.spec.md` → human flips Approved |
| Run unit/component tests | `npm test` (watch: `npm run test:watch`) |
| Smoke-load extension | `npm run build && npm run test:e2e` |
| Mark tasks done | `/opsx:apply <name>` |
| Archive (delta → baseline) | `/opsx:archive <name>` |
| Sync delta without archiving | `/opsx:sync <name>` |
| Validate all baselines | `openspec validate --specs` |
| List / inspect | `openspec list` · `openspec show <id>` |
| Open PR | `gh pr create --base master --fill` |

## Gates you can't skip

1. **Human flips `Status: Approved`** on the granular spec before any code (handshake).
2. **The PostToolUse hook** runs `vitest run` after source edits and blocks on red.
3. **Never edit an `openspec/specs/` baseline directly** to add behavior — it changes
   only via a change that gets archived.
4. **Never edit an `Approved` criterion** to make a red test pass — propose it as its
   own spec diff and get sign-off.
