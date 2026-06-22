# Spec: Config modal in the popup (with sound effects)

- **Status:** Approved  <!-- Draft → Approved (only a human sets Approved) -->
- **Owner:** dankhael
- **Contract:** a new `settings` object persisted in storage + an `UPDATE_SETTINGS`
  message (`src/types.ts`). `GET_ALL` starts returning `settings` so the popup gets
  it in one round-trip. No new permissions.
- **Tests:** pure settings helpers (Node) + a jsdom render/interaction test for the
  modal. A `playClick(settings, player)` unit that no-ops when sound is off (audio
  player injected, so no real sound in tests).

## Why

The popup needs a place for preferences as the extension grows. First option: opt-in
**satisfying/ASMR click sounds** to make using MyTube feel good. The modal is built to
hold more options later, and reserves a spot to support the developer.

## Acceptance criteria

| ID | Given | When | Then |
|---|---|---|---|
| **CFG-1** | the popup header | the user clicks the **settings (gear)** button | a config modal opens over the popup content |
| **CFG-2** | the config modal | it renders an **"Efeitos sonoros"** toggle reflecting the persisted value | — |
| **CFG-3** | the toggle | the user flips it | the new value is persisted and applied immediately (no popup reopen needed) |
| **CFG-4** | sound effects **on** | the user performs a sound-enabled interaction (see Decisions §2) | a short, pleasant click sound plays |
| **CFG-5** | sound effects **off** | the same interaction | **no** sound plays |
| **CFG-6** | the modal footer | the user clicks the **"Buy me a coffee / support the developer"** card | the developer's Ko-fi page (`https://ko-fi.com/dankhael`) opens in a new tab |
| **CFG-7** | an open modal | the user clicks the close (✕), presses Esc, or clicks the backdrop | the modal closes and the category list is shown again |
| **CFG-8** | a changed setting | the popup is closed and reopened | the setting persists (stored, synced) |
| **CFG-9** | the settings model | a future option is added | it slots into a structured `settings` object with defaults — no migration churn, unknown/missing keys fall back to defaults |

## Out of scope / non-goals

- Any second config option beyond sound effects (designed for, not built now).
- An in-extension donation flow — CFG-6 just deep-links to the external Ko-fi page.
- Sound on the new-tab page or elsewhere; this spec covers the popup (see §2).
- Volume control / choosing between multiple sound packs.

## Manual acceptance (not unit-tested)

- [ ] The gear button is discoverable in the header and opens the modal.
- [ ] The click sound is actually pleasant/satisfying and short (no lag, no overlap spam).
- [ ] Toggling off truly silences it; the choice survives closing/reopening the popup.
- [ ] The donate card reads as actionable (pointer cursor, hover state) and opens
      `https://ko-fi.com/dankhael` in a new tab when clicked.

## Decisions (resolved by owner)

1. **Default state:** sound effects **OFF** on first install (opt-in).
2. **Which interactions make sound:** **popup-only** for now (expand a category, click a
   video). Content-script "+ Salvar" is out of scope here.
3. **Sound source:** **Web Audio API synth** — no binary assets.
4. **Storage shape:** extend the existing `StorageData` with a `settings` object;
   reuse `GET_ALL`, add `UPDATE_SETTINGS`.
5. **Donate target:** the developer's Ko-fi page, `https://ko-fi.com/dankhael`,
   opened in a new tab via `chrome.tabs.create` (no new permission). Activated
   2026-06-22, replacing the original SOON placeholder.
