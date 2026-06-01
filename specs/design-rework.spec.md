# Spec: Design rework — warm-dark theme + single-knob accent color

- **Status:** Approved  <!-- owner directed implementation in the request -->
- **Owner:** dankhael
- **Source design:** Claude Design handoff (`MyTube.html` + `app/styles.css`) — warm-cozy
  dark, **mint-green accent**, Bricolage Grotesque / Plus Jakarta Sans, line icons,
  subtle motion.
- **Contract:** CSS only — a token layer in `newtab/index.css` that all colors derive
  from, plus Tailwind `theme.colors` mapped to those tokens. No storage/message change.
- **Tests:** a pure `matchesQuery` search helper (Node) + an `App` jsdom test for the
  new greeting. Visual fidelity is **manual acceptance** (CSS can't be unit-tested).

## Why

Re-skin MyTube from the YouTube-red clone into the curated, cozy product the design
mocked up — and make the brand color a **one-line change** in code.

## The single color knob (key requirement)

All accent color derives from two tokens in `:root`:

```css
--accent-h: 168;     /* hue — THE knob. Mint 168 · Red 25 · Violet 290 · Amber 64 */
--accent-c: 0.125;   /* chroma */
```

Every accent shade (`--accent`, `--accent-2`, `--accent-soft`, `--accent-line`,
`--accent-ink`) is computed from those via `oklch()`. Changing `--accent-h` re-themes
the entire UI. Neutrals derive from `--hue` (warm 70).

## Acceptance criteria

| ID | Given | When | Then |
|---|---|---|---|
| **THEME-1** | the token layer in `:root` | a developer changes **`--accent-h`** | the whole UI (home, cards, chips, buttons, modals, badges) re-themes — no other edits needed |
| **THEME-2** | the tokens | read in code | the four accent presets (Mint/Red/Violet/Amber) are documented as hue values next to `--accent-h` |
| **THEME-3** | Tailwind classes already used by modals/buttons | rendered | they resolve to the new token palette (no hard-coded `#ff0000` / YouTube red remains) |
| **HOME-1** | the new-tab home | loaded | warm-dark gradient background, centered max-width container, display-font headings (Bricolage Grotesque) |
| **HOME-2** | the home header | loaded | brand wordmark + **"Welcome back."** greeting + an unwatched-count line |
| **HOME-3** | the header controls | loaded | a search field, the hide-watched toggle and **+ Categoria** restyled as searchbar / ghost / accent buttons |
| **HOME-4** | text in the search field | typed | the categories and smart sections filter to videos whose **title or channel** match (live) |
| **HOME-5** | each category section | rendered | an accent icon tile + display-font title + count, hover drag affordance, and the dashed empty state when it has no videos |
| **HOME-6** | each video card | rendered | rounded thumbnail with hover-lift + play overlay + scrim, a mint **unwatched dot**, channel-initial avatar + 2-line title + channel, and hover action buttons (mark watched / move / more-menu) |
| **HOME-7** | the smart sections (Recentes / Poeira) | rendered | reuse the same card + section styling |
| **HOME-8** | primary buttons (e.g. + Categoria, modal Create/Save, Salvar pill) | rendered | use accent background with **`--accent-ink`** (dark) text for legibility on mint |

## Out of scope / non-goals

- The prototype's **browser-chrome frame** (tabs, address bar) and the **Tweaks panel**
  — dev-only scaffolding, not part of the real extension.
- Full **popup** visual rework and the content-script **"+ Salvar"** restyle — these
  inherit the new token palette but a faithful redesign is a follow-up spec.
- Filter **chips** bar (category filter) — search covers querying for now.
- Real **duration / progress** on cards (no data) — omitted.
- Category **line icons**: categories keep their user emoji, shown inside the icon tile
  (the prototype swapped emojis for line icons; our data model is emoji-based).

## Manual acceptance (not unit-tested)

- [ ] Home reads as the mockup: gradient, greeting, cards with hover lift + play.
- [ ] Changing `--accent-h` to 25 / 290 / 64 cleanly swaps the whole accent.
- [ ] Fonts load (Bricolage Grotesque headings, Plus Jakarta body).
- [ ] Mint accent text on buttons uses dark ink and stays legible.
- [ ] Modals/welcome no longer show YouTube red.
