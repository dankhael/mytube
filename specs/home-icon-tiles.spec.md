# Spec: Category icon tiles + icon picker (start page)

- **Status:** Approved  <!-- Draft → Approved (only a human sets Approved) -->
- **Owner:** dankhael
- **Contract:** This now changes the **schema + messages** (Decision §1 chose a user
  icon picker, not just auto-mapping):
  - `Category` gains an optional **`icon?: IconKey`** in `src/types.ts`. The legacy
    `emoji` field stays (no migration; existing data keeps working).
  - `ADD_CATEGORY` / `UPDATE_CATEGORY` messages carry the chosen `icon`.
  - The pure `categoryIcon(name) → IconKey` mapping moves to a **shared module**
    (`src/category-icon.ts`) so home + popup share one source of truth.
  - **Icon resolution order:** explicit `category.icon` → else auto-map
    `categoryIcon(category.name)` → else default (`bookmark`). Used by both surfaces.
- **Tests:** reducer specs in `src/storage.test.ts` (persist/update `icon`, legacy
  data without `icon` still loads); `popup/category-icon.test.ts` against the shared
  module + a `resolveCategoryIcon` unit; a `newtab` jsdom test that the tile renders
  the resolved icon and that the modal shows an icon picker (not the emoji grid).

## Why

The popup shows clean monochrome icon tiles (PUI-2); the start page still shows raw
emoji. Beyond matching, users should be able to **choose** a category's icon from the
same set instead of an emoji — so the tile is intentional and consistent across the
home and the popup.

## Acceptance criteria

Stable IDs (`HICON-N`). The mapping itself (known names, fallback, case-insensitive)
is already locked by **PUI-9**.

| ID | Given | When | Then |
|---|---|---|---|
| **HICON-1** | a category | the home renders its tile | `.cat-ico` contains a **monochrome `<svg>`** (the resolved icon), **not** the emoji character |
| **HICON-2** | a category with **zero** videos | the home renders its empty state | the same resolved icon is shown there too — not the emoji |
| **HICON-3** | a category with **no explicit `icon`** | it is resolved | it falls back to the shared auto-map `categoryIcon(name)`; an unknown name → **default bookmark** (never blank, never emoji) |
| **HICON-4** | a category with an **explicit `icon`** | it renders on home **and** popup | that chosen icon is shown on both surfaces (overrides the auto-map) |
| **HICON-5** | the add/edit category modal | it opens | it shows an **icon picker** over the monochrome set (the "Ícone" emoji grid is gone); the current/selected icon is highlighted |
| **HICON-6** | the icon picker | the user picks an icon and saves | the category persists with that `icon` (`ADD_CATEGORY` on create, `UPDATE_CATEGORY` on edit) and the tile updates |
| **HICON-7** | **legacy** stored categories (no `icon` key) | the store loads them | they render via the auto-map without error or migration; saving them later can set an `icon` |
| **HICON-8** | the mapping | home and popup both need it | both resolve via the **shared** `categoryIcon` / resolver — one mapping, no duplicated rules |

## Out of scope / non-goals

- Removing the `emoji` field from the schema (kept as legacy; not displayed).
- Custom/uploaded icons or colors per category — only the fixed monochrome set.
- Changing the auto-map rules or the icon set's *mapping* behavior (PUI-9).
- Reordering/observability of smart sections (no per-category tile there).

## Decisions (resolved by owner)

1. **Icon picker.** Replace the emoji picker with an **icon picker** over the
   monochrome set; categories store a chosen `icon`, falling back to the name-based
   auto-map when unset. (Chosen over "auto-map only".)

2. **Set size.** Extend the monochrome set to ~12–16: add things like dumbbell, 
   utensils,   palette, rocket, flask, newspaper, trophy) so the picker has enough variety. (Mapping/fallback unchanged.)

## Manual acceptance (not unit-tested)

- [ ] Home tiles show crisp monochrome icons matching the popup; size/color clean.
- [ ] Empty-category state shows the icon, not the emoji.
- [ ] Creating a category lets me pick an icon; it shows on the tile and in the popup.
- [ ] Editing a category lets me change the icon; the change persists after reload.
- [ ] A category created before this change still shows a sensible (auto-mapped) icon.
