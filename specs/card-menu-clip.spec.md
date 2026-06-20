<!--
The handshake (CLAUDE.md → "Spec handshake"):
  1. Agent drafts this file with Status: Draft.
  2. Human reviews/edits the criteria and flips Status to Approved.
  3. ONLY THEN may the agent implement (test per criterion → code → green).
-->

# Spec: Card context menu no longer clipped by the thumbnail

- **Status:** Approved  <!-- Draft → Approved (only a human sets Approved) -->
- **Owner:** dankhael
- **Contract:** Pure UI/CSS fix. No `Message` variant or `StorageData` schema
  change — the `onMove` / `onToggleWatched` / `onDelete` `CardActions` callbacks
  in `newtab/components/VideoCard.tsx` keep their current signatures.
- **Tests:**
  - `newtab/components/VideoCard.test.tsx` — extend with the `MENU-N` cases
    (menu placement is not inside the clipping thumb; all three items render;
    "Remover" still fires `onDelete`).

## Why

The hover/right-click context menu on a home video card (`.vmenu`) renders as an
`position: absolute` child of `.vthumb`, which is `overflow: hidden` (it has to
clip the rounded 16:9 artwork). With three items the menu is taller than the
remaining space below `top: 46px`, so its last item — **"Remover"** — is cut off
at the thumbnail's bottom edge (see the cropped trash row in the report). The
destructive action is the one users can't reach.

## Root cause (read before approving)

- `.vthumb` → `overflow: hidden` + `aspect-ratio: 16 / 9`
  ([newtab/index.css:269](newtab/index.css#L269)).
- `.vmenu` is a child of `.vthumb`, `position: absolute; top: 46px`
  ([newtab/index.css:418](newtab/index.css#L418)) and in JSX it sits inside
  `.vthumb` ([newtab/components/VideoCard.tsx:112](newtab/components/VideoCard.tsx#L112)).
- Any part of the menu below the thumb's bottom edge is clipped by the ancestor's
  `overflow: hidden`. The fix is to anchor the menu to a **non-clipping** ancestor
  (move it out of `.vthumb`, into `.vcard`, which is `position: relative` and not
  `overflow: hidden`) so it can overflow past the artwork.

## Acceptance criteria

Stable IDs (`MENU-N`). Each row becomes one `it('MENU-N: …')`. jsdom does not
compute layout, so these assert **DOM structure / behavior** (the things a unit
test can see); the visual "nothing is clipped" check is in Manual acceptance.

| ID | Given | When | Then |
|---|---|---|---|
| **MENU-1** | a rendered `VideoCardView` | the context menu is opened (right-click the card / click the ⋮ action) | the `.vmenu` element exists and is **not** a descendant of the `overflow: hidden` `.vthumb` (it is anchored to a non-clipping ancestor, e.g. a direct child of `.vcard`) |
| **MENU-2** | an open menu | it is rendered | all three items are present in order: "Mover para…", a watched-toggle ("Marcar como assistido" / "Marcar não assistido"), and the danger "Remover" item |
| **MENU-3** | an open menu | "Remover" is clicked | `onDelete` is called once with `video.id`, and the menu closes |
| **MENU-4** | an open menu | "Mover para…" is clicked | `onMove` is called once with the video, and the menu closes |
| **MENU-5** | a closed card | nothing is opened | no `.vmenu` is in the DOM (menu is conditionally rendered only while open — unchanged) |

## Out of scope / non-goals

- Redesigning the menu's contents, icons, or wording — only its placement so it
  isn't clipped.
- Edge-flipping the menu when the card is near the viewport edge (open
  up/left instead of down/right). Possible follow-up; not required to un-clip.
- Changing `.vthumb`'s `overflow: hidden` (it must stay to clip the rounded
  artwork) or the hover `.vactions` buttons.
- The popup's own menus (`popup/`) — this is the new-tab home card only.

## Manual acceptance (not unit-tested)

- [ ] Right-click (or hover → ⋮) a card in the **top row** of the home grid:
      all three items are fully visible, "Remover" is not cut off.
- [ ] Same for a card in the **last/bottom row** and a card in the **right-most
      column** — the menu is not clipped by the card, the grid, or the viewport.
- [ ] Clicking "Remover" deletes the video; "Mover para…" opens the move modal;
      the watched-toggle flips state — all still work after the placement change.
- [ ] The menu still closes on outside-click and does not trigger the card's
      `onOpen` (clicks inside the menu are stopped).
