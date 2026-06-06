## Context

After `quirky-salvar-button`, the injected `<style>` in
[content/content.ts](../../../content/content.ts) themes only `.mytube-watch-btn`
and `.mytube-btn--mini`; the base `.mytube-btn` (home feed + search overlay) keeps
the legacy black pill with a red hover and a hidden sparkle. Separately,
`CARD_SELECTORS` lists `ytd-compact-video-renderer` for the sidebar, but the
watch-page related list now renders cards with a newer lockup view-model, so the
mini control never injects there (confirmed: nothing appears on the sidebar).

`extractCard` already carries lockup fallbacks
(`.yt-lockup-metadata-view-model-wiz__title`,
`.yt-content-metadata-view-model-wiz__metadata-text`), so id/title/channel
extraction is likely already lockup-aware; this change mostly needs the right
selector and the right *context* detection for the mini variant.

## Goals / Non-Goals

**Goals:**
- Home-feed (and search) overlay button adopts the accent theme + sparkle/rotate.
- The mini Salvar appears on the current watch-suggestions renderer.
- No regression to the watch pill, toast, badge, or the no-expand fix.

**Non-Goals:**
- No `SAVE_VIDEO`/reducer/schema change; no dropdown behavior change.
- Not chasing every YouTube experiment renderer — cover the current lockup the
  sidebar actually ships, plus the legacy `ytd-compact-video-renderer`.

## Decisions

**1. Confirm the live sidebar renderer before coding.**
The first implementation step runs a one-off DOM probe on a `/watch` page (e.g.
`document.querySelector('#secondary, ytd-watch-next-secondary-results-renderer')`
then inspect its repeated child tag) to pin the exact selector instead of
assuming `yt-lockup-view-model`. Add that tag to `CARD_SELECTORS`.

*Alternative considered:* hardcode `yt-lockup-view-model` blind — rejected, the
alignment saga showed that measuring/confirming beats guessing.

**2. Detect "mini" by location, not by renderer tag.**
Today the mini variant keys off `card.matches('ytd-compact-video-renderer')`. The
lockup renderer is *also* used on the home feed and search, so keying off the tag
would shrink home cards too. Instead, mark a card as mini when it lives inside the
watch sidebar (`card.closest('#secondary, ytd-watch-next-secondary-results-renderer')`).
This keeps the mini styling scoped to suggestions regardless of renderer.

**3. Theme the base `.mytube-btn`, keep contrast over thumbnails.**
Apply the accent background + `--mytube-accent-ink` text and the sparkle/rotate to
`.mytube-btn` (so home/search match the watch pill). Because the overlay sits on
top of a thumbnail image, retain a strong shadow/opacity for legibility, and keep
the `.mytube-saved` state visually distinct. The sparkle, currently `display:none`
on the base button, becomes visible on the overlay too.

## Risks / Trade-offs

- **Lockup renderer is shared across surfaces** → scope the mini variant by
  sidebar ancestor (Decision 2), and confirm extraction works for lockups so home
  feed lockups still get a (non-mini) themed button.
- **Accent pill legibility over bright thumbnails** → keep a drop-shadow/border;
  verify against light and dark thumbnails in manual acceptance.
- **Two open changes touch the same requirement** → archive
  `quirky-salvar-button` first; this delta's MODIFIED text describes the end state
  assuming that change has folded into the baseline.
- **YouTube re-renders the lockup list** → the existing `MutationObserver` + the
  `data-mytube` processed guard already re-inject and de-dupe; verify no infinite
  re-scan loop with the new selector.

## Migration Plan

Pure content-script + CSS change; no data migration. Sequence after
`quirky-salvar-button` archives. Rollback is reverting `content/content.ts`.
Verified via the Manual acceptance checklist in the new
`specs/salvar-home-and-suggestions.spec.md` and a `npm run test:e2e` smoke.

## Open Questions

- **Home-button styling depth**: full accent fill (like the watch pill) vs. accent
  *text/icon* on the existing dark pill? The proposal assumes the full themed look;
  confirm at spec approval.
- **Exact sidebar renderer tag** — resolved by the Decision-1 probe during apply.
- Should the sparkle/rotate apply to *search* overlay buttons too, or only the
  home feed? (Proposal groups home + search together; confirm.)
