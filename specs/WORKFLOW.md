# MyTube — development workflow (worked guide)

This is the hands-on companion to [README.md](./README.md) and the rules in
[../CLAUDE.md](../CLAUDE.md). It shows the **concrete ways to actually run the
workflow** — from a one-line CSS fix to a structural change spanning several specs —
with formalized steps and short examples.

One idea underpins all of it:

> **A feature is specified in exactly one place: `specs/<feature>.spec.md`.** Small
> work skips specs entirely. OpenSpec is retired ([../openspec/README.md](../openspec/README.md));
> the living "what the app does today" map is [CAPABILITIES.md](./CAPABILITIES.md).

---

## 0. Pick your path (30-second decision)

| Your change | Tier | Path | Spec file? | Handshake? |
|---|---|---|---|---|
| Typo, copy/i18n string, CSS nudge, dep bump | 0 | [A](#path-a--trivial-change-tier-0) | No | No |
| Bug fix (logic) | 0 | [B](#path-b--bug-fix-with-a-regression-test-tier-0) | No | No |
| New behavior / criteria, you write the spec | 1 | [C](#path-c--feature-you-draft-the-spec-from-the-template) | Yes | Yes |
| New behavior, you want the agent to draft the spec | 1 | [D](#path-d--feature-the-agent-drafts-the-spec-from-your-requirements) | Yes | Yes |
| Big / structural change touching many areas | 1 | [E](#path-e--big-or-structural-change) | Yes (maybe several) | Yes |
| Changing an already-Approved criterion | 1 | [F](#path-f--changing-an-approved-criterion) | Edit existing | Re-approve |

**Tier 0** = no spec, no handshake. **Tier 1** = one spec file, human approves the
criteria before any code. When unsure, ask: _"can a unit test assert the new
behavior, and is it a behavior change rather than a fix?"_ If yes → Tier 1.

The two automated gates that run no matter which path you take:

- **Vitest gate** (`scripts/test-hook.mjs`, PostToolUse): after any `.ts/.tsx`
  edit the suite must be green. You can't finish on red.
- **Capability-map gate** (`scripts/capabilities-map-hook.mjs`, Stop): if you
  changed a `specs/*.spec.md` but not [CAPABILITIES.md](./CAPABILITIES.md), you
  can't finish until the map is updated.

---

## Path A — trivial change (Tier 0)

_One-line fixes, copy/i18n strings, CSS/DOM nudges, dependency bumps — nothing a
unit test can meaningfully assert._

1. Make the change.
2. If it touches user-facing copy, route it through the i18n catalog
   ([src/i18n.ts](../src/i18n.ts)), not a hardcoded string.
3. For a DOM/CSS tweak, sanity-check it by hand (the **Manual acceptance** idea —
   load the unpacked extension; see [README.md](./README.md) test layers).
4. Done. No spec, no handshake.

> **Example.** "The home's 'Pegando poeira' heading is too tight." → adjust the
> Tailwind class, eyeball it in the new tab, ship.

---

## Path B — bug fix with a regression test (Tier 0)

_A logic bug in the reducer, a helper, or a component — something testable._

1. **Reproduce as a failing test first.** Add an `it(...)` that encodes the bug
   next to the existing tests (e.g. [src/storage.test.ts](../src/storage.test.ts)).
   It doesn't need a spec ID — it's a regression test, not a new criterion.
2. Watch it go red (`npm run test:watch`).
3. Fix the code until green.
4. Done — the Vitest gate confirms green on save.

> **Example.** "Renaming a category to an existing name silently merges them." →
> `it('rename to an existing name is rejected', …)` → fix `MyTubeStore.renameCategory`
> → green. No spec file; the test is the durable artifact.

> If the "bug" turns out to be **missing intended behavior** (no one ever specced
> it), you're really on Path C/D — write the criterion, don't smuggle new behavior
> in as a fix.

---

## Path C — feature: you draft the spec from the template

_You know the behavior you want and prefer to write it yourself._

1. **Copy the template.**
   `cp specs/_TEMPLATE.spec.md specs/<feature>.spec.md` (kebab-case name).
2. **Fill it in** with `Status: Draft`:
   - `## Why` — the user problem, not the implementation.
   - **Contract** — which `Message` variant / `StorageData` field in
     [src/types.ts](../src/types.ts) this touches.
   - **Acceptance criteria** — a table of `PREFIX-N` IDs (pick a short, unique
     prefix, e.g. `AVAT`). Each row must be **observable** (a test can assert it).
   - `## Decisions` — design rationale worth keeping (replaces the old OpenSpec
     `design.md`). Omit for simple features.
   - `## Manual acceptance` — DOM/UI behavior no unit test can assert.
3. **Stop and get it Approved.** A human reviews/edits the criteria and flips
   `Status: Approved`. **Only a human sets Approved.** Do not write code yet.
4. **Encode the contract** in `src/types.ts` if a new message/field is needed.
5. **Implement criterion by criterion.** For each ID write the failing test first:
   `it('AVAT-1: …', …)`, then code until green. Inject fakes
   (`FakeStorageBackend`) — no Chrome runtime in unit tests.
6. **Update [CAPABILITIES.md](./CAPABILITIES.md)** — add/adjust the capability's
   bullet and its spec reference in the table. (The Stop hook enforces this.)
7. Done — every ID has a matching `it('<ID>: …')`; grep an ID to see spec ↔ test.

> **Tip.** For a clean separation of concerns, draft the spec in one session and
> implement in a fresh one, so the implementer works only from the Approved text.

---

## Path D — feature: the agent drafts the spec from your requirements

_You have a rough idea; you want the agent to turn it into criteria._

1. **Describe the requirement** in plain language to the agent, e.g.:
   > "Add an interface-language setting: English by default, Brazilian Portuguese
   > as an option in Settings. All UI copy should come from one catalog."
2. **Agent drafts** `specs/<feature>.spec.md` from the template with
   `Status: Draft` — Why, contract, `PREFIX-N` criteria, decisions, manual checks —
   and **stops**. It must not write code against a Draft.
3. **You review the criteria.** This is the real checkpoint: edit wording, add
   missing cases, cut gold-plating, then flip `Status: Approved` yourself. The
   author of success can't also be its only judge — that's why a human approves.
4. **Agent implements** against the Approved spec: failing `it('<ID>: …')` per
   criterion → code → green.
5. **Agent updates [CAPABILITIES.md](./CAPABILITIES.md).**
6. Done.

> This is exactly how [i18n-language.spec.md](./i18n-language.spec.md) (`I18N-*`)
> was produced: requirement → drafted criteria → human Approved → tests → code.

---

## Path E — big or structural change

_Touches several capabilities, the storage layout, or carries real design risk
(e.g. the storage-robustness shard migration, the security hardening pass)._

1. **Scope it in `## Why` + `## Decisions`.** Because there's no separate
   proposal/design doc anymore, the spec file carries the rationale: the problem,
   the approach, alternatives rejected, and constraints (quotas, YouTube DOM).
   Be explicit in `## Out of scope` so the work doesn't sprawl.
2. **One spec per coherent area, if needed.** A single change may warrant more
   than one spec file when it spans clearly distinct capabilities — but each file
   still gets its own IDs and its own Approval. Prefer one file unless it grows
   past ~20 criteria or two unrelated concerns.
3. **Handshake per spec file.** Draft → human Approves each.
4. **Define seams and fakes up front** in the criteria (this is what makes a big
   change testable): name the new interface and the named fake that exercises it,
   e.g. "tests inject `FakeSyncArea` (8,192-byte per-item quota + op log)."
   See [storage-robustness.spec.md](./storage-robustness.spec.md) (`ROB-1..17`).
5. **Implement in dependency order**, failing test per ID, keeping the suite green
   between IDs. Land low-risk pieces first (e.g. quota math) before the risky
   migration.
6. **Behavior that can't be unit-tested** (real-profile migration, content-script
   teardown on extension reload) goes on the **Manual acceptance** checklist — and
   gets checked by hand against the loaded extension before you call it done.
7. **Update [CAPABILITIES.md](./CAPABILITIES.md)** for every capability the change
   touched (the table row and each affected bullet).

> **Example skeleton** — see the real one in
> [storage-robustness.spec.md](./storage-robustness.spec.md): a prose paragraph
> naming new modules/seams/fakes, then a 17-row ID table, then explicit non-goals,
> then a manual-acceptance list for the migration and content-script behavior.

---

## Path F — changing an Approved criterion

_The behavior an Approved criterion describes needs to change._

1. **Do not silently edit the Approved criterion** to make a new/red test pass.
   The Approved text is a contract.
2. **Propose the edit** as its own change to the criterion (a diff to the row,
   with a note on why), and get a human to re-Approve it.
3. Only then update the matching `it('<ID>: …')` and the code.
4. Update [CAPABILITIES.md](./CAPABILITIES.md) if the observable behavior changed.

> Keep IDs stable. If a criterion is genuinely replaced, prefer adding a new ID and
> retiring the old one over silently repurposing the number — grep history stays honest.

---

## Quick reference

**Spec status flow:** `Draft` → _(human reviews)_ → `Approved` → _(implement)_.
Only a human sets `Approved`.

**ID ↔ test convention:** every criterion `PREFIX-N` has one `it('PREFIX-N: …')`.
A criterion with no matching test name is a visible coverage gap — grep the ID.

**Contract first:** new behavior that persists data changes the `Message` union /
`StorageData` in [src/types.ts](../src/types.ts) before the test. All persistence
flows through `MyTubeStore` over an injected `StorageBackend`.

**Test layers:** reducer + components → `npm test` (Vitest); built-extension smoke
→ `npm run test:e2e` (Playwright). DOM-reading content script → Manual acceptance.

**Always end by updating [CAPABILITIES.md](./CAPABILITIES.md)** when a spec changed.
The Stop hook will remind you.
