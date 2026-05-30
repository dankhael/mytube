<!--
Copy this file to specs/<feature>.spec.md and fill it in.
The handshake (see CLAUDE.md → "Spec handshake"):
  1. Agent drafts this file with Status: Draft.
  2. Human reviews/edits the criteria and flips Status to Approved.
  3. ONLY THEN may the agent implement (test per criterion → code → green).
Do not implement against a Draft. Do not edit Approved criteria without the human.
-->

# Spec: Name and icon on the home tab

- **Status:** Approved  <!-- Draft → Approved (only a human sets Approved) -->
- **Owner:** dankhael
- **Contract:** static page [newtab/index.html](../newtab/index.html) + icons in [icons/](../icons/). Does not touch the `Message`/`StorageData` contract in `src/types.ts`.
- **Tests:** [newtab/index.html.test.ts](../newtab/index.html.test.ts) (new — reads the HTML as text)

## Why

When the user opens the extension's home (new tab), the browser tab shows a generic
title and **no favicon** (`newtab/index.html` has no `<link rel="icon">`). The tab is
indistinguishable from any other. We want it to show the name "MyTube" and the
extension icon, so the user recognizes the tab at a glance.

## Acceptance criteria

Stable IDs (`TAB-N`). Each row becomes one `it('<ID>: …')`. The criteria below are
observable by reading the contents of `newtab/index.html` (and the referenced
asset), with no browser involved.

| ID | Given | When | Then |
|---|---|---|---|
| **TAB-1** | `newtab/index.html` | the HTML is read | the `<title>` tag is exactly `MyTube` |
| **TAB-2** | `newtab/index.html` | the HTML is read | there is a `<link rel="icon">` whose `href` points to an icon file under `/icons/` (e.g. `/icons/icon48.png`) |
| **TAB-3** | the favicon `href` from TAB-2 | resolved against the repo | the referenced icon file exists in `icons/` (no broken href) |

## Out of scope / non-goals

- Does not change the extension's toolbar icon (`action.default_icon`) or
  `manifest.config.ts` — those already exist and are correct.
- Does not create new image files; reuses the existing `icons/icon{16,48,128}.png`.
- Does not make the title dynamic (e.g. a video count in the tab title) — that's
  left for a future spec if desired.
- Does not change the popup `<title>`.

## Manual acceptance (not unit-tested)

Load the extension (`npm run build` → load the unpacked `dist/`) and open a new tab:

- [x] The browser tab shows the text **MyTube** as the title.
- [x] The browser tab shows the **extension icon** as the favicon (not Chrome's
      generic/blank icon).
- [x] The favicon still shows after a page reload (`Ctrl+R`).
