# Store & documentation assets

Every image here is captured from the real packaged extension (`dist/`) driving a
real Chromium — the home and popup shots seed their library through the actual
message contract, and the youtube.com shots use the live site in dark mode:

```bash
npm run store:assets
```

The generator lives in [`scripts/capture-store-assets.mjs`](../../scripts/capture-store-assets.mjs)
with one module per surface under `scripts/store-assets/`.

## Designed listing images — `listing/` (use these for the store)

Marketing boards built from clean stills of the real extension (dark YouTube,
ad slots hidden), laid out after the Dopamine Toll store set in MyTube's brand:

```bash
npm run store:promo                          # build + capture stills + render (en + pt-BR)
node scripts/make-store-promo.mjs render     # re-render after a copy/layout edit
node scripts/make-store-promo.mjs all pt-BR  # one language only
```

| File | Upload as | Says |
|---|---|---|
| `listing/screenshot-1-hero-1280x800.png` | Screenshot 1 | "Your YouTube, curated by you." — the home + popup |
| `listing/screenshot-2-save-1280x800.png` | Screenshot 2 | "One click. It's saved." — Save pill, category menu, toast |
| `listing/screenshot-3-organize-1280x800.png` | Screenshot 3 | "Organize it your way." — new-category and move modals |
| `listing/screenshot-4-home-1280x800.png` | Screenshot 4 | "A home page with nothing recommended." — search, popup, reminder |
| `listing/screenshot-5-yours-1280x800.png` | Screenshot 5 | "Your colors. Your library." — accents, CRT skin, no account/server/ads |
| `listing/small-promo-440x280.png` | Small promo tile | Mark, name, tagline |
| `listing/marquee-1400x560.png` | Marquee promo tile | Headline + the home in a window |

The same seven files exist in Portuguese (Brazil) under `listing/pt-BR/`, for the
pt-BR listing locale — captured with the extension, YouTube and the category
names in Portuguese.

Copy lives in `scripts/store-promo/copy.mjs` (one block per language); every
claim must match that language's listing text in
`docs/chrome-web-store-submission.md`.

## Raw UI captures (1280×800 / 440×280)

Store screenshots must be 1280×800 or 640×400, so only these are uploadable:

| File | Shows |
|---|---|
| `home-library-1280x800.png` | Primary listing shot — the populated curated home |
| `home-welcome-1280x800.png` | First-run empty state |
| `home-search-1280x800.png` | Library search filtering every section |
| `home-card-actions-1280x800.png` | Per-card hover actions and the right-click menu |
| `home-move-video-1280x800.png` | Move a saved video to another category |
| `home-new-category-1280x800.png` | New-category modal with the icon picker |
| `home-smpte-theme-1280x800.png` | SMPTE / CRT theme preset |
| `youtube-save-card-1280x800.png` | The Save pill injected on a YouTube search card |
| `youtube-save-menu-1280x800.png` | Category picker open from a suggestion card |
| `youtube-watch-save-1280x800.png` | Save control in the `/watch` action bar |
| `youtube-playlist-import-1280x800.png` | Import button on a playlist header |
| `youtube-playlist-import-menu-1280x800.png` | Choosing the destination for a playlist import |
| `youtube-home-reminder-1280x800.png` | Opt-in watch reminder on the YouTube home |
| `small-promo-440x280.png` | Branded small promotional tile |

## Documentation only (340×600)

The popup is a fixed 340px column, so these are shot at its real size. They are
**not** valid store screenshots — use them in the README / docs only.

| File | Shows |
|---|---|
| `popup-library-340x600.png` | Toolbar popup: unwatched count, categories, expanded videos |
| `popup-settings-340x600.png` | Settings modal — language, sound, theme, accent |
| `popup-settings-reminders-340x600.png` | Settings scrolled — shortcut, watch reminders, donate |

## Notes

Regenerate after any material store-facing UI or branding change, and review the
images before upload. The youtube.com captures ride YouTube's live DOM and real
recommendations, so their surrounding content differs run to run — check them for
anything you would not want in a public listing. The generator uses public
YouTube thumbnail URLs as sample content and writes its seed data into a
temporary browser profile.
