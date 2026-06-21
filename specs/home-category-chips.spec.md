<!--
Tier-1 feature. Draft → Approved (only a human sets Approved).
Do not implement against a Draft. See CLAUDE.md → Workflow.
-->

# Spec: Home category chips — jump to a category

- **Status:** Approved  <!-- Draft → Approved (only a human sets Approved) -->
- **Owner:** dankhael
- **Contract:** purely **derived** from existing `StorageData.categories` on the
  new-tab page. No new `Message` variant, storage field or permission.
- **Tests:** a jsdom `App` test (`newtab/App.test.tsx`) asserting the chip row
  renders/hides and that clicking a chip scrolls to its section.

## Why

The curated home is one long vertical scroll of category sections. With more than a
handful of categories you have to hunt for the one you want. A horizontal chip row at
the top — styled after YouTube's own category bar (Tudo / Jogos / Música …) — lets you
**jump straight to a category's section** in one click.

## Scope

- **Only** on the new-tab home (`newtab/App.tsx`). Not in the popup, not the content
  script.
- One chip per **user category** in stored order. Smart sections ("Recentemente
  adicionados" / "Pegando poeira") get **no** chip — they are derived views, not
  destinations the user organizes around.
- The chip is **navigation only**: it scrolls/anchors to the existing
  `CategorySection`. It does not filter, expand, rename, or reorder anything.

## Acceptance criteria

| ID | Given | When | Then |
|---|---|---|---|
| **CHIP-1** | `data.categories` has N categories | the home loads | a chip row renders exactly N chips, one per category, in `data.categories` order |
| **CHIP-2** | the chip row | rendered | each chip shows the category **name** (and its `resolveCategoryIcon` icon, matching the section header) |
| **CHIP-3** | a rendered chip | the user clicks it | the matching `CategorySection` is scrolled into view (`scrollIntoView` is invoked on the section node for that category) |
| **CHIP-4** | the home is empty (welcome screen, `data.videos.length === 0`) | the home loads | the chip row is **not** rendered |
| **CHIP-5** | the search `query` is non-empty and a category has **zero** matching videos | the home loads | that category's chip is **hidden** (chips track the same visible-category set the sections show) |
| **CHIP-6** | categories are renamed / added / removed / reordered | the store updates | the chip row **re-derives** to match (no stale chips, same order as the sections) |

## Decisions

1. **Anchor mechanism:** each `CategorySection` exposes a stable scroll target keyed
   by category name (an `id` / `ref`); the chip calls `scrollIntoView({ behavior:
   'smooth', block: 'start' })`. Chosen over URL `#hash` anchors so smart sections
   and the existing layout are untouched and there is no history-stack churn.
2. **No active-chip highlight (v1):** scroll-spy that lights the current chip while
   you scroll is out of scope; keep the first cut to click-to-jump. Revisit if asked.
3. **Sticky vs static:** the row sits under the home header in normal flow for v1
   (matches the SmartSection placement pattern). Stickiness is a CSS-only follow-up
   if desired — not a tested criterion.
4. **Visible set:** chips mirror the **same** category set the page renders. Today the
   home renders every `data.categories` entry (even empty ones), so CHIP-5's hide rule
   only bites under an active search filter. If section-visibility rules change, the
   chip set follows the sections, not a second copy of the logic.

## Out of scope / non-goals

- Filtering the home to a single category (we navigate, not filter).
- A chip for smart sections or an "All / Tudo" reset chip.
- Active-chip scroll-spy highlighting; horizontal-scroll arrows.
- Any new message, storage field, or YouTube-side (content script) change.

## Manual acceptance (not unit-tested)

- [ ] The row visually reads like a category-chip bar (pill shape, horizontal,
      overflows with horizontal scroll rather than wrapping) and matches the home theme.
- [ ] Clicking a chip smooth-scrolls to the right section; the section header is
      visible afterward (not hidden under any sticky header).
- [ ] With one/zero categories the row is unobtrusive (or absent) — no empty bar.
