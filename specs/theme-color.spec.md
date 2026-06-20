<!--
The handshake (CLAUDE.md → "Spec handshake"):
  1. Agent drafts this file with Status: Draft.
  2. Human reviews/edits the criteria and flips Status to Approved.
  3. ONLY THEN may the agent implement (test per criterion → code → green).
-->

# Spec: Theme color (accent) setting

- **Status:** Approved  <!-- Draft → Approved (only a human sets Approved) -->
- **Owner:** dankhael
- **Contract:** extend `Settings` in `src/types.ts` with an `accent` preset key
  (defaulted, so missing/unknown keys fall back — CFG-9 style). Reuses the existing
  `UPDATE_SETTINGS` message and `GET_ALL` round-trip. No new permissions.
- **Tests:**
  - `src/theme.test.ts` — pure preset→hue mapping + `applyAccent(root, accent)`
    writes `--accent-h` (Node/jsdom).
  - `src/sanitize-storage.test.ts` — an out-of-range/unknown `accent` falls back
    to the default on read.
  - `popup/config.test.ts` — the modal renders the swatch row and reports a pick.

## Why

The whole extension already re-themes off a single CSS knob (`--accent-h` in
`styles/theme-tokens.css`). Today changing it requires editing source. Users should
be able to pick the accent color from the popup's Settings modal and have both
surfaces (popup + new-tab home) recolor immediately and persistently.

## Acceptance criteria

Stable IDs (`THEME-N`). Each row becomes one `it('THEME-N: …')`.

| ID | Given | When | Then |
|---|---|---|---|
| **THEME-1** | the `Settings` schema | the extension reads stored data with no `accent` key | `accent` defaults to `"violet"` (today's `--accent-h: 290`), no migration needed |
| **THEME-2** | the preset table | `accentHue(preset)` is called for each named preset | it returns the documented hue (Violet 290 · Mint 168 · Red 25 · Amber 64 · Blue 250 · Pink 350) |
| **THEME-3** | a root element | `applyAccent(root, accent)` is called | `root.style` has `--accent-h` set to the preset's hue as a string |
| **THEME-4** | an unknown/garbage `accent` value | `applyAccent(root, value)` (or sanitize on read) runs | it falls back to the default preset's hue rather than writing an invalid value |
| **THEME-5** | the config modal | it renders a **"Theme color"** row | one selectable swatch per preset, with the persisted preset marked selected (`aria-checked="true"`) |
| **THEME-6** | the theme-color row | the user clicks a different swatch | the change is reported via callback (persisted as `UPDATE_SETTINGS { accent }`) and that swatch becomes selected |
| **THEME-7** | a stored `accent` of e.g. `"mint"` | the popup and the new-tab page load | each applies `--accent-h: 168` to `:root` on init (accent visible without reopening) |
| **THEME-8** | a changed accent | the surface is closed and reopened (or the other surface is opened) | the chosen accent persists (stored + synced) and is reflected |
| **THEME-9** | the MyTube logo mark (new-tab `Logo.tsx` + popup `popup.html`) | it renders | its gradient/cutout read the `--accent*` tokens (which follow `--accent-h`), not hardcoded violet, so the mark recolors with the accent setting |
| **THEME-10** | the new-tab page favicon | settings load (or the accent changes) | the `<link rel="icon">` is repointed at an inline SVG data URI of the mark colored from the accent, so the browser tab icon matches the theme |
| **THEME-11** | the toolbar action icon | the worker starts, or the accent changes via storage | the worker rasterizes the accent mark and calls `chrome.action.setIcon`, recoloring the toolbar icon (badge count unchanged) |

## Out of scope / non-goals

- A free/continuous hue slider or custom hex picker (presets only — owner chose swatches).
- Theming anything beyond the accent hue (no separate background/neutral themes,
  no light mode; `color-scheme: dark` stays).
- Per-category or per-video colors.
- Changing accent chroma/lightness (`--accent-c` stays fixed).
- The static manifest PNGs (`icons/icon*.png`) shipped in the bundle: they stay
  violet as the install-time default. THEME-11 recolors the *live* toolbar icon at
  runtime via `setIcon`; the on-disk PNGs and `icons/icon.svg` are not regenerated.
- Rasterizing the toolbar icon is exercised by hand (Manual acceptance) — the MV3
  worker's `OffscreenCanvas`/`createImageBitmap` path isn't available in jsdom/Node;
  only the shared color/SVG logic (`accentLogoSvg`) is unit-tested.

## Manual acceptance (not unit-tested)

- [ ] Each preset swatch shows roughly its real accent color in the picker.
- [ ] Picking a color recolors buttons/accents in the popup immediately.
- [ ] Opening the new-tab home reflects the same chosen accent.
- [ ] The choice survives closing/reopening the popup and syncs across devices.
- [ ] The new-tab browser tab's favicon matches the chosen accent (THEME-10).
- [ ] The toolbar action icon recolors to the chosen accent within a moment of
      picking it, and the unwatched badge count still shows over it (THEME-11).

## Decisions (resolved by owner)

1. **Picker style:** preset **swatches** (not a free hue slider).
2. **Default accent:** `"violet"` — preserves today's look (`--accent-h: 290`).
3. **Preset set:** Violet, Mint, Red, Amber (the documented four) + Blue, Pink.
4. **Storage shape:** extend `Settings` with `accent: AccentPreset` (string key),
   reusing `UPDATE_SETTINGS` / `GET_ALL`. Unknown keys fall back to default.
