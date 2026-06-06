## Why

The themed, quirky "+ Salvar" treatment shipped in `quirky-salvar-button` only
reached the `/watch` pill and a mini sidebar variant. Two gaps remain: the
**home-feed** card button is still the old plain dark pill (it was an explicit
non-goal of that change, deferred "unless the human asks otherwise" — the human is
now asking), and the **watch-page suggestions** show no Salvar button at all,
because the related/"Up next" list now renders with a newer element than the
`ytd-compact-video-renderer` our selectors target. The save control should look
consistent and be present on every video surface.

## What Changes

- Bring the **home-feed card button** (`ytd-rich-item-renderer`, and the matching
  search `ytd-video-renderer` overlay) up to the themed look: MyTube accent color
  and the quirky sparkle + rotate-on-hover affordance, so it matches the watch
  pill instead of the legacy black/red pill.
- Extend the injected-card selectors so the **watch-page suggestions** get the
  mini Salvar button. The sidebar now uses a lockup view-model
  (e.g. `yt-lockup-view-model`) rather than `ytd-compact-video-renderer`; add
  coverage for the current renderer (and keep the old one for surfaces that still
  use it). The exact selector is confirmed against the live DOM during design.
- Ensure the existing extractors (id / title / channel / thumbnail) resolve for
  the new lockup renderer, reusing the lockup fallbacks already present in
  `extractCard`.
- No change to the `SAVE_VIDEO` contract, the reducer, the dropdown/category
  picker, the toast, or the badge.

## Capabilities

### New Capabilities
<!-- none — this enhances an existing capability -->

### Modified Capabilities
- `save-from-youtube`: the "Save control on YouTube video surfaces" requirement
  changes — the home-feed button adopts the themed/quirky styling (previously a
  documented non-goal), and the injected-card selectors expand to cover the
  current watch-suggestions renderer so the control actually appears there.

## Impact

- **Code**: [content/content.ts](../../../content/content.ts) — `CARD_SELECTORS`
  (add the lockup renderer), the mini-variant detection in `injectButton`, the
  injected `<style>` block (apply accent/sparkle/rotate to the home-feed
  `.mytube-btn`, not just the watch pill), and possibly `extractCard` selector
  fallbacks for the lockup view-model.
- **Specs/tests**: content-script DOM behavior stays on **Manual acceptance**
  (per `specs/README.md`); no reducer contract change, so `src/storage.test.ts`
  is unaffected.
- **Prereq**: builds on `quirky-salvar-button` (the themed styles, sparkle, and
  mini variant it introduced). Best sequenced after that change archives.
- **No** changes to `src/types.ts`, the `Message` union, or storage schema.
