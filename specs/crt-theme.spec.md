<!--
The handshake (CLAUDE.md → "Spec handshake"):
  1. Agent drafts this file with Status: Draft.
  2. Human reviews/edits the criteria and flips Status to Approved.
  3. ONLY THEN may the agent implement (test per criterion → code → green).
Do not implement against a Draft. Do not edit Approved criteria without the human.
-->

# Spec: CRT theme preset — 90's/00's · Y2K · SMPTE color bars

- **Status:** Approved  <!-- Draft → Approved (only a human sets Approved) -->
- **Owner:** dankhael
- **Source design:** owner-provided mockups (prototype "Tweaks" panel with an
  **SMPTE** theme selected): scanlined thumbnails, phosphor-green power-LED
  unwatched dot, pixel-bitmap display headings, an SMPTE color-bar strip riding
  the hovered card, near-black CRT background.
- **Contract:** extend `Settings` in `src/types.ts` with a `theme: ThemePreset`
  key (`'aurora' | 'smpte'`, defaulted — CFG-9 style, no migration). New module
  `src/theme-preset.ts` (accent stays in `src/theme.ts` — one knob per module).
  Reuses `UPDATE_SETTINGS` / `GET_ALL`. No new permissions.
- **Tests:**
  - `src/theme-preset.ts` → `src/theme-preset.test.ts` — preset guard, default,
    `applyThemePreset(root, theme)` toggling `data-theme` (jsdom).
  - `src/sanitize-storage.test.ts` — unknown/garbage `theme` falls back on read.
  - `popup/config.test.ts` — the modal renders the Theme row; picking reports.
  - `newtab/App.test.tsx` — the home applies the stored preset on init.

## Why

The current warm-dark "Aurora" look is the only skin. The owner wants a second,
opt-in **special theme** with a 90's/00's aesthetic (Y2K, Motorola V3, CRT TVs):
the whole extension should read like a tube screen — and the theme's symbol in
the settings picker is the **SMPTE color bars** test pattern.

## Design (how the skin is built)

Everything hangs off **one attribute knob**, mirroring the accent architecture:
`applyThemePreset(root, theme)` sets `data-theme="smpte"` on `:root` (and removes
it for `aurora`). All CRT styling lives under `[data-theme='smpte']` selectors —
zero specificity fights, zero JS-driven styling beyond the attribute.

**1. Token overrides** (`styles/theme-tokens.css`, shared by popup + new-tab):

```css
:root[data-theme='smpte'] {
  --hue: 220;                      /* cool phosphor neutrals instead of warm 70 */
  --bg: oklch(0.115 0.008 var(--hue));       /* tube-off near-black */
  --bg-grad: oklch(0.145 0.012 var(--hue));
  --radius: 10px; --radius-sm: 6px; --radius-lg: 14px;  /* squarer, bezel-era */
  --crt-scanline: rgba(0, 0, 0, 0.28);
  --crt-scanline-page: rgba(0, 0, 0, 0.11);  /* subtler: whole-screen glass */
  --crt-text-glow: /* phosphor bloom + red/cyan convergence fringe (D1) */
    0 0 16px oklch(0.815 var(--accent-c) var(--accent-h) / 0.35),
    0.7px 0 0 rgba(255, 70, 70, 0.32), -0.7px 0 0 rgba(70, 220, 255, 0.32);
  --crt-led: oklch(0.82 0.19 152);           /* phosphor-green power LED */
  --smpte-bars: linear-gradient(90deg,       /* 7 hard-stop 75% SMPTE bars */
    #b4b4b4 0 14.28%, #b4b400 0 28.57%, #00b4b4 0 42.85%, #00b400 0 57.14%,
    #b400b4 0 71.42%, #b40000 0 85.71%, #0000b4 0 100%);
}
```

The **accent knob stays independent**: `--accent-h` keeps working under the CRT
theme (theme = neutrals/effects/type; accent = hue), so the two pickers compose.

**2. Effect layers** (surface CSS, gated by `[data-theme='smpte']`):

- **The front glass** — one fixed, `pointer-events: none` overlay per surface
  (`body::after`) stacks subtle **full-page scanlines** under a curved-glass
  **vignette**; the whole screen reads as a tube, modals included.
- **Thumbnail glass** — `.vthumb::after` layers a soft top-left reflection, a
  faint **aperture-grille RGB triad** (vertical stripes) and the heavier
  mockup scanlines; `.art` gets a slight `filter: saturate(1.15)
  contrast(1.05)` for that over-driven tube color.
- **SMPTE bar strip on hover** — a short (~6px) `var(--smpte-bars)` strip pinned
  to the bottom edge of the hovered `.vthumb` (replaces the plain scrim accent),
  like a broadcast test signal bleeding in.
- **Power-LED unwatched dot** — the mint unwatched dot becomes `--crt-led` with
  a phosphor `box-shadow` halo (steady glow; no blink — see Decisions).
- **Phosphor type** — headings keep their faces but gain `--crt-text-glow`:
  an accent bloom plus the red/cyan convergence fringe of a miscalibrated
  tube (static `text-shadow`, D1/D2).
- All effects are pure CSS: no per-frame JS, no canvas, nothing on the card
  hot path.

**3. The picker** (popup Settings modal, above the accent row):

A **"Theme"** radiogroup row styled exactly like the accent swatches (THEME-5/6
pattern): two larger swatches — **Aurora** previews the current dark gradient,
**SMPTE** previews `var(--smpte-bars)` (the requested symbol). Selection is
`aria-checked`, persisted via `UPDATE_SETTINGS { theme }`.

**4. Typography** — unchanged: Bricolage/Jakarta stay on both themes, no new
font is vendored. The mockup's pixel headings were dropped by owner direction
(D1); the CRT read comes from the glass/glow effects instead.

## Acceptance criteria

Stable IDs (`CRT-N`). Each row becomes one `it('CRT-N: …')`.

| ID | Given | When | Then |
|---|---|---|---|
| **CRT-1** | the `Settings` schema | stored data is read with no `theme` key | `theme` defaults to `"aurora"` (today's look), no migration needed |
| **CRT-2** | a root element | `applyThemePreset(root, 'smpte')` is called | `root` has `data-theme="smpte"` |
| **CRT-3** | a root element already themed | `applyThemePreset(root, 'aurora')` is called | the `data-theme` attribute is removed (Aurora = the unprefixed default styles) |
| **CRT-4** | an unknown/garbage `theme` value | `applyThemePreset` runs (or sanitize on read) | it falls back to `"aurora"` rather than writing a junk attribute |
| **CRT-5** | the config modal | it renders | a **"Theme"** radiogroup row with one swatch per preset; the persisted preset is `aria-checked="true"`; the SMPTE swatch carries the color-bars preview (`data-theme-preset="smpte"`) |
| **CRT-6** | the Theme row | the user clicks the other swatch | the pick is reported via callback (persisted as `UPDATE_SETTINGS { theme }`) and selection moves to it |
| **CRT-7** | a stored `theme` of `"smpte"` | the new-tab home loads | `document.documentElement` gets `data-theme="smpte"` on init (alongside `applyAccent`) |
| **CRT-8** | a stored `theme` of `"smpte"` | the popup loads | the popup root gets the same attribute on init (both surfaces re-skin) |
| **CRT-9** | the CRT theme active | the accent preset is changed (or vice-versa) | the two settings compose: `data-theme` survives an accent change and `--accent-h` survives a theme change |
| **CRT-10** | a theme changed on one surface | the other surface is open (`storage.onChanged`) or reopened | it reflects the new preset (stored + synced), same as accent THEME-8 |

## Decisions

1. **D1 — No pixel font; the CRT look is carried by the tube effects.** The
   first implementation shipped Silkscreen pixel headings (per the mockup);
   the owner dropped it (2026-07-06) to bet harder on the CRT visuals instead.
   Typography stays Bricolage/Jakarta on both themes; headings get a phosphor
   glow + red/cyan convergence fringe (`--crt-text-glow`), and the scanline
   treatment expanded from thumbnails-only to the whole screen. Upside: no
   extra vendored font, no pt-BR legibility risk at chip sizes.
2. **D2 — No flicker/blink animations.** A real CRT flickers; the theme doesn't.
   Animated flicker is a migraine/accessibility hazard and would need a
   `prefers-reduced-motion` fork for marginal payoff. The LED dot glows steady.
   (If ever revisited, it's a new criterion, not a silent addition.)
3. **D3 — Picker lives in the popup Settings modal**, not a new-tab "Tweaks"
   panel. The mockup's Tweaks panel is prototype scaffolding (explicitly out of
   scope in `design-rework`); the extension's one settings surface is the modal,
   and the theme row sits with the accent row it composes with.
4. **D4 — Attribute knob over class or duplicate stylesheet.** `data-theme` on
   `:root` mirrors the `--accent-h` single-knob architecture (THEME-1): one
   line of JS, all styling declarative under `[data-theme='smpte']`, and future
   presets (e.g. `'vaporwave'`) extend the union without touching surfaces.
5. **D5 — SMPTE bars use the 75%-amplitude bar colors** (`#b4b4b4`…) not 100%
   saturated RGB — that's the actual broadcast test pattern and reads less
   garish as a UI element.

## Out of scope / non-goals

- The prototype **Tweaks panel** on the home (Warmth / Card density controls) —
  prototype-only scaffolding, per `design-rework`.
- **VCR-style duration badges** from the mockup — the data model has no
  duration field (`design-rework` non-goal); nothing to render.
- Theming the **content-script UI on YouTube** ("+ Salvar" pills/menus) — those
  live inside YouTube's page and keep the neutral look.
- **Favicon / toolbar icon** changes — they stay accent-driven (THEME-10/11).
- Flicker, screen-turn-on, or any **animation** beyond existing hover motion (D2).
- A **light** CRT variant; `color-scheme: dark` stays.

## Manual acceptance (not unit-tested)

Visual fidelity is CSS — checked by hand with the built extension.

- [ ] Picking SMPTE re-skins the home immediately: near-black cool background,
      full-screen scanlines under a corner vignette, squarer card radii.
- [ ] The page-wide glass overlay is subtle enough that body text stays
      comfortably readable, and it never blocks clicks (it's inert).
- [ ] Thumbnails show the heavier scanlines + RGB grille + glass reflection;
      hover actions (mark watched / move / menu) stay reachable.
- [ ] Hovering a card shows the SMPTE color-bar strip along the thumbnail's
      bottom edge.
- [ ] The unwatched dot reads as a glowing green power LED.
- [ ] Greeting, section titles and the wordmark show the phosphor glow with a
      faint red/cyan fringe — legible, not blurry (D1).
- [ ] The popup re-skins too (background, radii, glass, glowing header).
- [ ] Accent swatches still recolor buttons/chips while SMPTE is active.
- [ ] The SMPTE picker swatch itself shows the color bars; Aurora shows the
      dark gradient; selection ring is visible on both.
- [ ] No layout shift vs. Aurora (cards, chips and modals keep their geometry).
- [ ] Switching back to Aurora restores today's exact look.
