# Spec: Browse categories & videos in the popup

- **Status:** Approved  <!-- Draft → Approved (only a human sets Approved) -->
- **Owner:** dankhael
- **Contract:** existing `GET_ALL` message (`src/types.ts`) + `chrome.tabs.create`.
  No new message or schema change.
- **Tests:** `popup/popup.test.ts` (to add) — a pure grouping helper (Node) plus a
  jsdom render/click test. Needs `popup/**` added to the Vitest `include` and the
  tsconfig `include`.

## Why

Today the popup only shows per-category **counts** and a button to open the new
tab. The user wants to actually browse from the popup: expand a category, see each
video's thumbnail / title / channel, and click one to watch it — without leaving
the toolbar.

## Acceptance criteria

| ID | Given | When | Then |
|---|---|---|---|
| **POPUP-1** | saved videos across categories | the popup opens | each category renders as a clickable row showing its emoji, name and video count; **all rows start collapsed** |
| **POPUP-2** | a collapsed category row | the user clicks it | the row expands and lists that category's videos, each with a **thumbnail (16:9)**, **title** (max 2 lines) and **channel name**; clicking the row again collapses it. **Multiple categories may be open at once** (not an accordion) |
| **POPUP-3** | an expanded video item | the user clicks it | a new tab opens at `https://www.youtube.com/watch?v={id}` (via `chrome.tabs.create`) |
| **POPUP-4** | an empty store (no videos) | the popup opens | the existing empty hint is shown and no category rows render |
| **POPUP-5** | an expanded category with zero videos | it is expanded | a subtle "nenhum vídeo aqui" placeholder is shown instead of an empty gap |
| **POPUP-6** | many categories/videos | the popup opens | the list scrolls vertically within the popup's fixed width (~320px); thumbnails and text never overflow the popup |
| **POPUP-7** | an expanded category with **more than 10** videos | it is expanded | only the **first 10** videos render, followed by a **"ver todos na home (N)"** link that opens the new-tab page |

## Out of scope / non-goals

- Editing from the popup: no rename, move, delete, mark-watched, drag-and-drop —
  those stay on the new-tab page.
- Watched dimming / ✓ overlay in the popup (the popup is a quick browser, not the
  full home).
- Search / filtering.

## Manual acceptance (not unit-tested)

- [x] Clicking a video opens the correct YouTube watch page in a new tab.
- [x] Thumbnails load (i.ytimg mqdefault) and keep 16:9; long titles clamp to 2 lines.
- [x] With several categories the popup scrolls and stays within its width.
- [x] Expand/collapse feels responsive; only DOM, no flicker.

## Decisions (resolved by owner)

1. **Default state:** all categories collapsed on open.
2. **Multi-expand:** several categories may be open at once (not an accordion).
3. **Per-category cap:** show the first 10 videos, then a "ver todos na home (N)"
   link to the new-tab page.
