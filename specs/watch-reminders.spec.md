<!--
Copy this file to specs/<feature>.spec.md and fill it in.
The handshake (see CLAUDE.md → "Spec handshake"):
  1. Agent drafts this file with Status: Draft.
  2. Human reviews/edits the criteria and flips Status to Approved.
  3. ONLY THEN may the agent implement (test per criterion → code → green).
Do not implement against a Draft. Do not edit Approved criteria without the human.
-->

# Spec: Watch reminders (opt-in, no new-tab claim)

- **Status:** Approved  <!-- Draft → Approved (only a human sets Approved) -->
- **Owner:** dankhael
- **Contract:** `Settings` (two new booleans) + a new `OPEN_HOME` `Message` variant in
  [src/types.ts](../src/types.ts); read-path gating in
  [src/sanitize-storage.ts](../src/sanitize-storage.ts).
- **Tests:** [src/sanitize-storage.test.ts](../src/sanitize-storage.test.ts) (settings
  gating), a new `src/watch-reminders.test.ts` (pure decision functions),
  [popup/config.test.ts](../popup/config.test.ts) (the two new toggles). Content-script
  DOM and the actual browser-startup tab live in **Manual acceptance**.

## Why

The extension used to **override the new tab** so every new tab was the MyTube home.
That nudged the "second user" — the one who wants to be reminded to watch their saved
backlog instead of postponing it — but it was forced and intrusive for everyone else, so
it was removed (the override hijacks every tab and triggers Chrome's un-suppressable
"keep this page?" prompt; see [manifest.config.ts:48-51](../manifest.config.ts#L48-L51)
and [src/home-page.ts:1-4](../src/home-page.ts#L1-L4)).

This feature delivers that same reminder value **opt-in and without claiming the new
tab**, via two independent toggles (both OFF by default): open the home once per browser
launch, and a dismissible nudge on YouTube's own home page.

## Acceptance criteria

Stable IDs (`REMIND-N`). Each row becomes one `it('<ID>: …')`. Criteria are observable by
unit tests; DOM/browser behavior is in **Manual acceptance**.

| ID | Given | When | Then |
|---|---|---|---|
| **REMIND-1** | the settings schema | `DEFAULT_SETTINGS` is read | both `openHomeOnStartup` and `remindOnYoutubeHome` are present and `false` |
| **REMIND-2** | a stored snapshot whose `settings` is missing the two new fields | `sanitizeStorageData` runs | both fields are filled from defaults (`false`), other settings untouched |
| **REMIND-3** | a stored snapshot with a non-boolean `openHomeOnStartup` / `remindOnYoutubeHome` (e.g. `"yes"`, `1`) | `sanitizeStorageData` runs | each non-boolean field is coerced to `false` (mirrors the accent/language gates) |
| **REMIND-4** | a store with both new settings | `UPDATE_SETTINGS { openHomeOnStartup: true }` is applied | only `openHomeOnStartup` flips to `true`; `remindOnYoutubeHome` and the rest are unchanged |
| **REMIND-5** | settings with `openHomeOnStartup: true` and an injected tab opener | the startup decision runs | the home tab is opened exactly once with the home URL |
| **REMIND-6** | settings with `openHomeOnStartup: false` and an injected tab opener | the startup decision runs | no tab is opened |
| **REMIND-7** | the worker `handle()` with an injected home-tab opener | an `OPEN_HOME` message is handled | the opener is called once and the response is `{ ok: true }` |
| **REMIND-8** | inputs `{ remindOnYoutubeHome: true, unwatched: N>0, onYoutubeHome: true, dismissed: false }` | `shouldShowHomeNudge` runs | returns `true` |
| **REMIND-9** | the same inputs but `remindOnYoutubeHome: false` | `shouldShowHomeNudge` runs | returns `false` (the toggle is the master switch) |
| **REMIND-10** | the same true-inputs but `dismissed: true`, or `unwatched: 0`, or `onYoutubeHome: false` | `shouldShowHomeNudge` runs | returns `false` for each (one assertion per condition) |
| **REMIND-11** | a config modal built from settings | the modal renders | it shows an "open home on startup" toggle reflecting `openHomeOnStartup`; clicking it fires `onToggleStartup` with the negated value |
| **REMIND-12** | a config modal built from settings | the modal renders | it shows a "remind me on the YouTube home" toggle reflecting `remindOnYoutubeHome`; clicking it fires `onToggleHomeReminder` with the negated value |

## Decisions

1. **No new-tab override, ever.** Re-adding `chrome_url_overrides.newtab` is the one path
   explicitly rejected by the original team (intrusive, un-suppressable consent prompt,
   can't hand the native NTP back once claimed). Both reminders are pull-free, opt-in, and
   reversible from settings.
2. **Two independent booleans, both default `false`.** A fresh install behaves exactly as
   today (no surprise tab, no banner). Each is its own toggle so a user can take one
   reminder without the other.
3. **`OPEN_HOME` message instead of `web_accessible_resources`.** The YouTube-home nudge's
   "open my home" action runs in a content script, which cannot navigate the page to a
   `chrome-extension://` URL unless the home page is web-accessible (a security surface we
   don't want). Instead the content script sends `OPEN_HOME`; the worker opens the tab via
   the existing `openHomeTab` ([src/home-page.ts](../src/home-page.ts)). No new permission.
4. **Startup uses the existing `chrome.runtime.onStartup` + `openHomeTab`.** The gating
   decision is a pure function (`shouldOpenHomeOnStartup`) so it's unit-tested without a
   Chrome runtime; the listener just reads settings and calls the injected opener.
5. **Nudge dismissal is session-scoped (v1).** Dismissing hides it for the rest of the
   browser session (in-memory flag), not persisted per-day. The decision lives in the pure
   `shouldShowHomeNudge` so the policy can tighten later without touching the DOM code.
6. **"YouTube home" = the site root** (`youtube.com/` with an empty/`/` pathname), not
   search/watch/channel pages — that's where the algorithmic pull happens.

## Out of scope / non-goals

- Any `chrome_url_overrides` / new-tab takeover (Decision 1).
- Persisted or per-day dismissal of the nudge (session-only for v1; Decision 5).
- The nudge on non-home YouTube pages, or a `chrome.notifications` reminder.
- Reworking the toolbar badge (the passive unwatched count already exists).
- Localizing net-new copy beyond adding the keys to both `en`/`pt-BR` catalogs.

## Manual acceptance (not unit-tested)

Load the built extension (`npm run build` → load unpacked `dist/`):

**Open on startup**
- [ ] With the toggle OFF (default), launching Chrome opens **no** MyTube tab.
- [ ] With the toggle ON, launching Chrome opens the MyTube home in exactly one normal tab.
- [ ] Opening additional new tabs after launch stays 100% native (no MyTube).

**YouTube-home nudge**
- [ ] With the toggle OFF (default), youtube.com home shows **no** banner.
- [ ] With the toggle ON and ≥1 unwatched saved video, youtube.com home shows a small
      dismissible banner naming the unwatched count.
- [ ] The banner does **not** appear on watch / search / channel pages.
- [ ] Clicking the banner's open action opens the MyTube home (via `OPEN_HOME`).
- [ ] Dismissing the banner hides it for the rest of the session; it can return next launch.
- [ ] The banner survives YouTube SPA navigation back to the home without duplicating.

**Settings UI**
- [ ] Both toggles appear in the popup settings modal, reflect persisted state, and persist
      across reopen.
