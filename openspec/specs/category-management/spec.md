# category-management

## Purpose

Let the user organize saved videos into named categories: create, rename, delete,
reorder, and assign each an icon. The reducer
([src/storage.ts](../../../src/storage.ts)) owns the mutations; icon mapping rules
live in [src/category-icon.ts](../../../src/category-icon.ts). Consolidates
`specs/categories.spec.md` (CAT-*) and the icon-mapping portion of
`specs/home-icon-tiles.spec.md` (HICON-8).

<!-- TODO: reconcile scenario IDs against specs/categories.spec.md (CAT-1..4) and
     the HICON-8 mapping criterion. Scenarios below are derived from the code. -->

## Requirements

### Requirement: Default categories on first use

On first use with no stored data, MyTube SHALL seed a default set of categories.

#### Scenario: Fresh install seeds categories
- **WHEN** there is no stored data
- **THEN** the data defaults to `Tutoriais`, `Entretenimento` and `Sem categoria` (the uncategorized bucket)

### Requirement: Create a category

Creating a category SHALL append it with the given icon (and a `📁` default emoji
for back-compat); a name that already exists MUST NOT create a duplicate.

#### Scenario: Add a new category
- **WHEN** the user adds a category with a name that does not already exist
- **THEN** it is appended to the category list with the given icon

#### Scenario: Adding a duplicate name is a no-op
- **WHEN** the user adds a category whose name already exists
- **THEN** the category list is unchanged

### Requirement: Rename a category and cascade to videos

Renaming a category MUST reassign every video whose `category` matched the old
name to the new name.

#### Scenario: Rename moves its videos
- **WHEN** the user renames a category
- **THEN** the category is updated and every video in it is reassigned to the new name

### Requirement: Delete a category with a choice about its videos

Deleting a category SHALL let the user either keep its videos (moving them to
`Sem categoria`) or delete them too.

#### Scenario: Delete and keep videos
- **WHEN** the user deletes a category and chooses to keep its videos
- **THEN** the category is removed and its videos are moved to `Sem categoria` (recreated if it was missing)

#### Scenario: Delete videos too
- **WHEN** the user deletes a category and chooses to also delete its videos
- **THEN** the category and all videos in it are removed

<!-- The home (curated-home) drives this with a two-step window.confirm:
     OK = delete category and its N videos; Cancel = keep videos. -->

### Requirement: Reorder categories

Reordering SHALL persist the requested order, and any category not named in the
request MUST be kept at the end.

#### Scenario: Apply a new order
- **WHEN** the user reorders categories (drag and drop on the home)
- **THEN** the stored order matches the requested order, and unnamed categories are kept at the end

### Requirement: Category icon assignment

Each category SHALL have an icon. When none is set, the icon MUST be auto-derived
from the lowercased name by first-matching-substring rules (specific → broad),
with `bookmark` as the neutral fallback; an explicitly chosen icon MUST take
precedence.

#### Scenario: Auto-map by name (HICON-8)
- **WHEN** a category has no explicit icon and its name contains a known keyword (e.g. "game" → gamepad, "tutori"/"curso" → book, "music" → music)
- **THEN** `resolveCategoryIcon` returns the mapped icon

#### Scenario: Unknown name falls back
- **WHEN** a category name matches no rule and has no explicit icon
- **THEN** the icon resolves to `bookmark`

#### Scenario: Explicit choice wins
- **WHEN** the user picks an icon for a category
- **THEN** that icon is stored and used instead of the auto-mapping
