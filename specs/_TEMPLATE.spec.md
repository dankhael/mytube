<!--
Copy this file to specs/<feature>.spec.md and fill it in.
The handshake (see CLAUDE.md → "Spec handshake"):
  1. Agent drafts this file with Status: Draft.
  2. Human reviews/edits the criteria and flips Status to Approved.
  3. ONLY THEN may the agent implement (test per criterion → code → green).
Do not implement against a Draft. Do not edit Approved criteria without the human.
-->

# Spec: <feature name>

- **Status:** Draft  <!-- Draft → Approved (only a human sets Approved) -->
- **Owner:** <human who approves the criteria>
- **Contract:** <link to the `Message` variant / schema in `src/types.ts` this touches>
- **Tests:** <where the executable specs live, e.g. `src/storage.test.ts`>

## Why

<1–3 sentences: the user problem this solves. Not the implementation.>

## Acceptance criteria

Stable IDs (`<PREFIX>-N`). Each row becomes one `it('<ID>: …')`. Keep them
**observable** — describe what a test can assert, not "works correctly".

| ID | Given | When | Then |
|---|---|---|---|
| **XXX-1** | <starting state> | <action / message> | <observable result> |
| **XXX-2** |  |  |  |

## Decisions

<Design rationale worth keeping: the WHY behind a non-obvious approach, an
alternative rejected and why, a constraint from YouTube's DOM / Chrome quotas.
Omit for small features — this replaces the old separate OpenSpec design.md.>

## Out of scope / non-goals

- <what this spec deliberately does NOT cover, so the agent doesn't gold-plate>

## Manual acceptance (not unit-tested)

For DOM/content-script or anything not worth automating. Check by hand.

- [ ] <observable behavior to verify manually>
