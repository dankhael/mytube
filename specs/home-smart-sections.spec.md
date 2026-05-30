# Spec: Smart sections on the home — "Recentemente adicionados" & "Pegando poeira"

- **Status:** Approved  <!-- Draft → Approved (only a human sets Approved) -->
- **Owner:** dankhael
- **Contract:** purely **derived** from existing `StorageData.videos` (`addedAt`,
  `watched`) on the new-tab page. No new message, storage field or permission.
- **Tests:** pure selectors `selectRecentlyAdded` / `selectGatheringDust` (Node) +
  a jsdom `App` test asserting the section headers render/hide.

## Why

The whole point of MyTube is to stop saved videos from rotting like the native Watch
Later. Two cross-cutting sections on **Minha Home** make that explicit: surface what
you **just added**, and nudge you about what's **gathering dust** (saved a while ago,
still unwatched).

## Scope

- **Only** on the Start Page / Minha Home tab (the new-tab page). Not in the popup.
- These are **derived views**, not categories: no rename/emoji/delete, no drag-and-drop
  ordering (their order is computed). Per-video actions (open, move, mark watched,
  remove) still work and re-derive the sections.

## Acceptance criteria

| ID | Given | When | Then |
|---|---|---|---|
| **SMART-1** | saved videos | the home loads | a **"🆕 Recentemente adicionados"** section renders showing videos by `addedAt` **descending** |
| **SMART-2** | unwatched videos that are "old" (see Decisions §2) | the home loads | a **"🕸️ Pegando poeira"** section renders showing the **oldest unwatched** videos by `addedAt` **ascending** |
| **SMART-3** | a smart section | rendered | each video uses the same card UI as categories (thumbnail / title / channel, hover-play, open-on-click, context menu) but **without** the category drag handle / category menu |
| **SMART-4** | a section with more than the cap (see §3) | rendered | it caps and shows a **"+X"** expander, like category sections |
| **SMART-5** | watched videos | always | are **excluded from both** smart sections, independent of the "ocultar assistidos" toggle — no point recommending something already watched |
| **SMART-6** | no videos qualify (all recent / all watched / empty) | the home loads | the section is **hidden entirely** (no empty placeholder) |
| **SMART-7** | a video is marked watched / removed / moved | the action completes | the smart sections **re-derive** (e.g. marking watched drops it from "Pegando poeira") |
| **SMART-8** | a video qualifies for a smart section **and** belongs to a category | the home loads | it appears in **both** — smart sections are cross-cutting views, not moves/duplicates in storage |

## Out of scope / non-goals

- Reordering, renaming or deleting smart sections; they are computed.
- A setting to hide/show them (could tie into the config modal later).
- Drag-and-drop into/out of a smart section.

## Manual acceptance (not unit-tested)

- [x] Sections sit in the agreed position and don't visually clash with categories.
- [x] "Pegando poeira" genuinely nudges (oldest unwatched on top), and empties out as
      you watch/clear things.
- [x] Marking a dust video as watched makes it leave the section without a reload.

## Decisions (resolved by owner)

1. **Placement & order:** "Recentemente adicionados" at the **top**, then the
   categories, then "Pegando poeira" at the **bottom** (closing nudge).
2. **"Pegando poeira" definition:** only **unwatched** videos older than a **21-day**
   threshold (oldest first); hidden if none qualify.
3. **Cap per section:** **4** preview cards with a **"+X" expander**, like categories.
4. **Watched:** **always excluded** from both sections (overrides the hide-watched
   toggle for these views).
5. **"Recent" bound:** by **count only** — the latest N videos by `addedAt`, no age
   filter. (Implementation: pool capped at `SMART_LIMIT = 12`; preview 4 + expander.)
