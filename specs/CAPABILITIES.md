# MyTube — capability map

_What the extension does today, at a glance._ This is a **digest and index**, not a
source of truth: the authoritative, test-bound criteria live in the linked
`specs/*.spec.md` files (grep an ID like `SAVE-3` to jump from a behavior to its
test). Keep entries one or two lines — when a capability changes, update its bullet
here in the same PR that lands the spec.

> Replaces the retired `openspec/specs/<capability>/` baselines (frozen; see
> [../openspec/README.md](../openspec/README.md)). Last reconciled: 2026-06-21.

| Capability | What it does | Authoritative specs (ID prefix) |
|---|---|---|
| [Save from YouTube](#save-from-youtube) | Inject "+ Salvar" on YouTube cards & watch pages; save into a category | `save-video` (SAVE), `salvar-button`, `salvar-home-and-suggestions`, `channel-avatar` |
| [Playlist import](#playlist-import) | Button on a playlist page imports its rows into a chosen category in one batch | `playlist-import` (IMPORT) |
| [Curated home](#curated-home) | New-tab home: category grids, smart sections, search, watched filter, drag-drop, card actions | `newtab-ui` (UI), `design-rework` (HOME/THEME), `home-smart-sections` (SMART), `home-icon-tiles` (HICON), `home-category-chips` (CHIP), `theme-color`, `card-menu-clip`, `channel-avatar` |
| [Category management](#category-management) | Create / rename / delete / reorder categories and their icons | `categories` (CAT), `home-icon-tiles` (HICON-8) |
| [Watched tracking](#watched-tracking) | Mark watched/unwatched; unwatched count on the toolbar badge | `watched-quota` (WATCH, BADGE) |
| [Popup](#popup) | Toolbar popup: browse by category, unwatched summary, open video/home, settings | `popup-categories` (POPUP), `popup-config` (CFG), `popup-redesign` (PUI) |
| [Preferences](#preferences) | Settings: sound effects, interface language, open-home shortcut | `popup-config` (CFG), `i18n-language` (I18N) |
| [Metadata enrichment](#metadata-enrichment) | Backfill missing title/channel from YouTube oEmbed | `metadata` (META), `security-hardening` (SEC-18/19) |
| [Persistence & sync](#persistence--sync) | Sharded `chrome.storage.sync` store via the reducer; live cross-surface updates | `watched-quota` (QUOTA-1), `storage-robustness` (ROB), `security-hardening` (SEC-14..17) |
| [Extension security](#extension-security) | Least-privilege manifest, CSP, message validation, no HTML sinks / 3rd-party fetches | `security-hardening` (SEC) |
| [Tab identity](#tab-identity) | Home tab shows the "MyTube" title and favicon | `newtab-tab-identity` (TAB) |

---

## Save from YouTube

Content script [content/content.ts](../content/content.ts) ↔ service worker over `SAVE_VIDEO`.

- Injects a "+ Salvar" button on feed/search/sidebar cards and a pill on `/watch`;
  survives SPA nav via `MutationObserver`; skips cards with no valid 11-char id.
- Picking a category sends `SAVE_VIDEO` (id, title, channel, canonical thumbnail,
  best-effort `channelThumbnail`); "+ Nova categoria" creates-and-saves inline.
- Re-saving a known id **moves** it instead of duplicating (SAVE-3).
- Injected buttons re-sync their Salvo/Salvar state from `storage.onChanged`.

## Playlist import

Content script [content/playlist-import.ts](../content/playlist-import.ts) (+ shared
[content/extract-card.ts](../content/extract-card.ts)) ↔ service worker over `IMPORT_VIDEOS`.

- Scrapes the rendered rows of a `youtube.com/playlist?list=…` page (Watch Later
  `WL`, Liked `LL`, any created playlist) via the content script — no API/OAuth.
- A button injected on the playlist header opens the category picker; the whole
  list imports into the chosen category in one `IMPORT_VIDEOS` batch commit.
- Re-importing a known video moves it (consistent with SAVE-3); huge playlists are
  best-effort (auto-scroll, IMPORT-DOM-5).

## Curated home

[newtab/App.tsx](../newtab/App.tsx) and components.

- Saved videos grouped by category in stored order; welcome screen when empty.
- A YouTube-style category chip row jumps to a category's section (smooth-scroll);
  chips track the visible-category set and drop under search (CHIP).
- Smart sections from [newtab/smart-sections.ts](../newtab/smart-sections.ts):
  "Recentemente adicionados" (newest unwatched) and "Pegando poeira" (unwatched
  older than 21 days, hidden when empty); both cap at 12 and exclude watched.
- Case-insensitive search over title/channel drives every section.
- Watched-visibility toggle; per-card open / move / toggle-watched / delete (hover
  + right-click menu); drag-drop reorder of categories and of videos within one.
- Channel avatar with initial-letter fallback; quota warning banner.

## Category management

Reducer [src/storage.ts](../src/storage.ts); icon rules [src/category-icon.ts](../src/category-icon.ts).

- Seeds `Tutoriais`, `Entretenimento`, `Sem categoria` on first use.
- Add (duplicate name = no-op), rename (cascades to its videos), delete (keep →
  move to `Sem categoria`, or delete videos too), reorder (unnamed kept at end).
- Icon auto-derived from the name (substring rules, `bookmark` fallback); an
  explicit pick wins.

## Watched tracking

Reducer [src/storage.ts](../src/storage.ts); badge [background/service-worker.ts](../background/service-worker.ts).

- Mark watched stamps `watchedAt`; mark unwatched clears it.
- Toolbar badge shows the `watched === false` count (empty at zero); recomputed on
  any `storage.onChanged`.

## Popup

[popup/popup.ts](../popup/popup.ts), [popup/groups.ts](../popup/groups.ts).

- "N unwatched" header; categories in stored order with up to 10 videos each
  (empty categories keep a placeholder; the rest live on the home).
- Click a video → opens its watch URL; open-home control → new home tab.
- Gear opens the config modal (see Preferences).

## Preferences

`Settings` in [src/types.ts](../src/types.ts), persisted via `UPDATE_SETTINGS`; catalog in [src/i18n.ts](../src/i18n.ts).

- **Sound effects** toggle — opt-in, defaults false on fresh install (CFG).
- **Interface language** — English default, Portuguese-BR option; unknown values
  fall back to `'en'` on read; all UI copy comes from the `t(key, lang)` catalog (I18N).
- **Open-home keyboard shortcut** — integrated with settings.

## Metadata enrichment

[src/metadata.ts](../src/metadata.ts), driven by the service worker.

- A video needs enrichment when title/channel is missing or a placeholder
  (`Sem título` / `Canal desconhecido`).
- Enriches on save (best effort — a failed lookup never blocks the save) and via a
  guarded one-shot `backfillMetadata` pass (`onInstalled`/`onStartup`/`GET_ALL`).
- oEmbed fetch bounded by `AbortSignal.timeout(8000)`; failures resolve `null`.
- Session-scoped failure cache: a failed id is not re-fetched until the next SW
  restart (ROB-5/6 in `storage-robustness`).

## Persistence & sync

Reducer [src/storage.ts](../src/storage.ts) over [src/storage-backend.ts](../src/storage-backend.ts); shards in [src/backfill.ts](../src/backfill.ts) area.

- Every mutation goes through `MyTubeStore`, reading and committing the whole
  `StorageData` snapshot; mutations are serialized (mutex) so concurrent
  read-modify-write can't lose updates (ROB-8/9).
- Storage is **sharded** across `mytube:meta` + `mytube:videos:<n>` keys (≤8 KB
  per item), migrated once from the legacy single `mytube` key (ROB-12..17).
- `getData` fills missing fields from defaults; reads pass through
  `sanitizeStorageData` (SEC-14..17). Live updates fan out via `storage.onChanged`.
- Quota warning fires on the binding limit; write failures propagate as
  `{ ok: false }` and surface a toast on the home (ROB-1/2/10/11).

## Extension security

[src/validate-message.ts](../src/validate-message.ts), enforced at `handle()` in [background/service-worker.ts](../background/service-worker.ts).

- Manifest requests exactly `['storage']`; host limited to `youtube.com`.
- Explicit CSP for extension pages (self + `i.ytimg.com` + allowlisted avatar
  hosts + bundled fonts; `object-src 'none'`).
- Every message validated at the SW boundary: 11-char id shape, canonical
  thumbnail, avatar-host allowlist, closed icon set, 300-char text clamp.
- No computed HTML in privileged pages (DOM APIs only); no third-party requests
  (fonts vendored).

## Tab identity

Static [newtab/index.html](../newtab/index.html).

- Tab title reads "MyTube"; `<link rel="icon">` points at the extension icon.
</content>
</invoke>
