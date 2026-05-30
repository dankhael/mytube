# Spec: Categories

Contract: `ADD_CATEGORY`, `UPDATE_CATEGORY`, `DELETE_CATEGORY`,
`REORDER_CATEGORIES` in [src/types.ts](../src/types.ts).
Tests: [src/storage.test.ts](../src/storage.test.ts).

## Acceptance criteria

| ID | Given | When | Then |
|---|---|---|---|
| **CAT-1** | a fresh store | `ADD_CATEGORY` "Música" `🎵` | the category is appended; adding the same name again is a **no-op** (no duplicate) |
| **CAT-2** | category "Tutoriais" with 2 videos | `UPDATE_CATEGORY` rename to "Estudos" `🎓` | the category is renamed **and** every video whose `category` was "Tutoriais" now points to "Estudos" |
| **CAT-3** | category "X" with videos, `deleteVideos: false` | `DELETE_CATEGORY` "X" | "X" is removed; its videos move to **"Sem categoria"** (recreated if it was missing) |
| **CAT-4** | category "X" with videos, `deleteVideos: true` | `DELETE_CATEGORY` "X" | "X" **and all its videos** are removed |
| **REORDER-CAT-1** | categories `[A, B, C]` | `REORDER_CATEGORIES` with order `[C, A]` | result starts `[C, A, …]`; any category **omitted** from the order (B) is kept at the end |

## Manual acceptance (UI — not unit-tested)

- [ ] **+ Categoria** opens the modal; the emoji picker preselects the current emoji when editing.
- [ ] The category **⋯** menu offers Rename/emoji and Delete.
- [ ] Deleting a non-empty category asks whether to keep or also delete its videos.
- [ ] Dragging the category grip reorders sections and persists across reload.
