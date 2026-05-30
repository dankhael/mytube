# Spec: Saving, moving & ordering videos

**Status:** Approved (implemented)

Contract: `SAVE_VIDEO`, `DELETE_VIDEO`, `MOVE_VIDEO`, `REORDER_VIDEOS` in
[src/types.ts](../src/types.ts). Tests: [src/storage.test.ts](../src/storage.test.ts).

## Acceptance criteria

| ID | Given | When | Then |
|---|---|---|---|
| **SAVE-1** | a video not yet saved | `SAVE_VIDEO` into an existing category | it is added at the **top** of `videos` with `watched: false` and a numeric `addedAt` |
| **SAVE-2** | a category name that doesn't exist | `SAVE_VIDEO` into it | the category is created (default emoji `📁`) and the video lands in it |
| **SAVE-3** | a video already saved in category A | `SAVE_VIDEO` of the same `id` into category B | **no duplicate** is created; the existing entry moves to B |
| **DELETE-1** | a saved video | `DELETE_VIDEO` by `id` | it is removed; unrelated videos are untouched |
| **MOVE-1** | a saved video in category A | `MOVE_VIDEO` to category B | the video's `category` becomes B; nothing else changes |
| **REORDER-VID-1** | videos `[a, b, c]` in category A | `REORDER_VIDEOS` with order `[c, a, b]` | category A's videos follow `[c, a, b]`; videos in **other** categories keep their relative order |

## Manual acceptance (content script / UI — not unit-tested)

- [ ] Hovering a card on the YouTube home shows the **+ Salvar** pill.
- [ ] The pill also appears in search results, the suggested sidebar, and on the `/watch` action bar.
- [ ] Clicking it opens the category dropdown; choosing one flips the pill to **✓ Salvo** for 2s.
- [ ] An already-saved video shows **✓ Salvo** with the category in its tooltip on next page load.
