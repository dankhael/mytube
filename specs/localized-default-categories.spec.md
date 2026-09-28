<!--
The handshake (see CLAUDE.md → "Workflow"):
  1. Agent drafts this file with Status: Draft.
  2. Human reviews/edits the criteria and flips Status to Approved.
  3. ONLY THEN may the agent implement (test per criterion → code → green).
Do not implement against a Draft. Do not edit Approved criteria without the human.
-->

# Spec: Default categories in the interface language

- **Status:** Approved  <!-- Draft → Approved (only a human sets Approved) — approved by the owner in the spec-audit review, 2026-09-28, with the recommended options §1(a) and §2 -->
- **Owner:** dankhael
- **Contract:** `DEFAULT_DATA.categories` and `UNCATEGORIZED` in
  [src/types.ts](../src/types.ts); the reducer in [src/storage.ts](../src/storage.ts)
  (which moves orphaned videos into `UNCATEGORIZED` when a category is deleted);
  the first-install language seeding in
  [background/service-worker.ts](../background/service-worker.ts) (`seedLanguageOnInstall`).
- **Tests:** the seeding helper in `src/default-categories.test.ts` (against
  `FakeStorageBackend`); the display label in `src/i18n.test.ts`; the surfaces in
  `popup/render.test.ts`, `newtab/App.smart.test.tsx` and `content/picker-item.test.ts`.

## Why

A first-run user on a Portuguese browser gets a Portuguese interface but three
English categories — "Tutorials", "Entertainment", "Uncategorized" — because
`DEFAULT_DATA` ships fixed English names. The first screen mixes languages. Found
while capturing the pt-BR store screenshots, which had to rename them by hand.

## Acceptance criteria

> Decided: §1(a) seed on first install, §2 display-map `Uncategorized`.

| ID | Given | When | Then |
|---|---|---|---|
| **DEFCAT-1** | a fresh install whose detected language is `pt-BR` | the worker seeds the language | the untouched default categories are renamed to "Tutoriais" and "Entretenimento" (icons and order unchanged) |
| **DEFCAT-2** | a fresh install whose detected language is `en` | install completes | the defaults stay "Tutorials" / "Entertainment" (no rename, no write) |
| **DEFCAT-3** | a library that already has videos (e.g. synced from another device or kept across a reinstall), or defaults the user renamed/reordered/extended | install completes, the extension updates, or the language changes later | no category is renamed — seeding only touches untouched defaults (exactly the shipped list, no videos) on first install |
| **DEFCAT-4** | the stored `UNCATEGORIZED` bucket | its name renders while the language is `pt-BR` — popup row, home section title / chips / Move dialog, the YouTube Save menu and save toast | it shows "Sem categoria" (display-only; the stored key stays `Uncategorized`, and English shows "Uncategorized") |
| **DEFCAT-5** | a category is deleted with "keep videos" | the reducer moves the orphans | they land in the stored `UNCATEGORIZED` bucket exactly as today, whatever the display language |

## Decisions

1. **When to translate "Tutorials" / "Entertainment"** — pick one:
   - **(a) Recommended: seed on first install.** Reuse `seedLanguageOnInstall`:
     when it switches the language to pt-BR and the two defaults are untouched,
     rename them via the reducer. Stored names are then real Portuguese names,
     editable like any other. Changing the language later does *not* rename them
     (they're the user's data by then).
   - (b) Display-map them like `Uncategorized` (DEFCAT-4) — no stored change,
     but then a user-typed category literally named "Tutorials" would also show
     as "Tutoriais", which is surprising.
2. **`Uncategorized` stays a stored constant.** The reducer relies on it as the
   fallback bucket (delete-with-keep, sanitize), so renaming the stored key would
   need a migration and break the constant everywhere. Mapping only its *display*
   name (DEFCAT-4) avoids both. Rejected: storing a localized name.

## Out of scope / non-goals

- Translating categories the user created.
- Re-translating defaults when the user switches language after install (see §1a).

## Manual acceptance (not unit-tested)

- [ ] **DEFCAT-6** — Install on a Chrome set to Portuguese: the first home shows
      "Tutoriais", "Entretenimento", "Sem categoria" and Portuguese UI throughout.
- [ ] **DEFCAT-7** — The YouTube Save menu and the popup show the same names.
