<!--
The handshake (see CLAUDE.md → "Workflow"):
  1. Agent drafts this file with Status: Draft.
  2. Human reviews/edits the criteria and flips Status to Approved.
  3. ONLY THEN may the agent implement (test per criterion → code → green).
Do not implement against a Draft. Do not edit Approved criteria without the human.
-->

# Spec: Deleting empty categories (1.0.2)

- **Status:** Draft  <!-- Draft → Approved (only a human sets Approved) -->
- **Owner:** dankhael
- **Contract:** no new `Message` variant — `DELETE_CATEGORY` and the
  `MyTubeStore.deleteCategory` reducer ([src/storage.ts](../src/storage.ts));
  home rendering in [newtab/App.tsx](../newtab/App.tsx).
- **Tests:** reducer in [src/storage.test.ts](../src/storage.test.ts); home in
  [newtab/App.test.tsx](../newtab/App.test.tsx).

## Why

A category created while the library has **no videos** can't be deleted: the home
shows only the welcome screen when `videos.length === 0` (UI-1), so the new
category's section — the only place with its ⋯ menu — never renders. Reproduced
on a fresh profile (1.0.1): "+ Categoria" → "Vazia" is stored but invisible; the
user had to save a video into it before the section (and Delete) appeared.

While tracing it, a second defect in the reducer: `deleteCategory(name, false)`
**always** re-adds `Uncategorized` when it's missing, even with nothing to move.
So deleting an empty category resurrects a previously deleted "Sem categoria",
and deleting an empty "Sem categoria" itself is a no-op — it's removed and
immediately re-added, so it can never be deleted.

## Acceptance criteria

| ID | Given | When | Then |
|---|---|---|---|
| **CATDEL-1** | a store with **no videos** and any categories | the home loads | the welcome screen is shown **and** every category renders as a section below it, each with its ⋯ menu (rename / delete) |
| **CATDEL-2** | a store with no videos and a category `Vazia` | the user deletes `Vazia` from its ⋯ menu and confirms | `DELETE_CATEGORY` is sent and the section disappears |
| **CATDEL-3** | a store with no videos | the home loads | the chip row is still **not** rendered (CHIP-4 unchanged) and the smart sections stay hidden (SMART-6 unchanged) |
| **CATDEL-4** | categories `[A, B]` (no `Uncategorized`) and no videos in `A` | `deleteCategory('A', false)` | categories become `[B]` — `Uncategorized` is **not** created when there are no videos to move |
| **CATDEL-5** | `Uncategorized` present with **no** videos | `deleteCategory('Uncategorized', false)` | `Uncategorized` is removed and stays removed |
| **CATDEL-6** | `Uncategorized` holding videos | `deleteCategory('Uncategorized', false)` | nothing changes — the category and its videos are kept (there is nowhere to move them) |
| **CATDEL-7** | `Uncategorized` holding N videos | the user picks Delete in its ⋯ menu | a **single** confirm asks to delete the category and its N videos; OK sends `DELETE_CATEGORY` with `deleteVideos: true`, Cancel sends nothing (the two-way "keep = move to Uncategorized" dialog doesn't apply to the bucket itself) |
| **CATDEL-8** | a category `X` holding videos and no `Uncategorized` | `deleteCategory('X', false)` | unchanged behavior: `Uncategorized` is (re)created and `X`'s videos move into it |

## Decisions

> **D1 — Show the sections under the welcome screen (rather than hiding the
> "+ Categoria" button while empty).** Creating categories before saving anything
> is a legitimate setup step; hiding the button would block it, and keeping it
> while hiding the result is what caused this bug. On a fresh install the three
> defaults then show as dashed "Nothing here yet — click + Salvar…" sections,
> which double as onboarding. _Alt: welcome screen only while the categories are
> the untouched defaults, full sections otherwise — fewer empty boxes on first
> run, but a second "is the home empty?" rule to keep in sync._ UI-1 and SMOKE-1
> still hold (the welcome screen is shown).
>
> **D2 — Only create `Uncategorized` when something actually moves into it.**
> It's a destination for orphans, not a mandatory category.

## Out of scope / non-goals

- Changing the two-way dialog for ordinary categories with videos (OK = delete
  videos too, Cancel = keep them in `Uncategorized`). Note it has no "abort"
  option; worth a separate look, not part of this fix.
- An undo for category deletion.
- The popup (it has no category delete).

## Manual acceptance (not unit-tested)

- [ ] Fresh sandbox profile: the home shows the welcome screen with the default sections below it.
- [ ] "+ Categoria" → "Vazia": its section appears immediately; delete it from ⋯ → gone, no video needed.
- [ ] Delete an empty "Sem categoria": it stays gone after a reload, and deleting another empty category doesn't bring it back.
