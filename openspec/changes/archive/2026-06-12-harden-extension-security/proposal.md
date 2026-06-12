## Why

The 2026-06-09 security & memory review ([docs/security-memory-review.md](../../../docs/security-memory-review.md))
found that MyTube's trust boundaries are compile-time only: the service worker
accepts any `Message` shape from a content script that runs inside youtube.com,
stored snapshots are cast unchecked, extension pages have no explicit CSP, the
manifest requests `tabs`/`activeTab` it never uses, and every new tab pings
Google Fonts. None of these is exploitable *today*, but each is one rendering
change away from a privileged-page injection or tracking vector — and the dev
toolchain carries 7 known-vulnerable packages (1 critical) that execute on every
build and test-hook run. This change closes findings S1–S9 as one hardening pass
that preserves all user-visible behavior.

## What Changes

- **S1** — Drop the unused `tabs` and `activeTab` permissions; keep only
  `storage`. Removes the "Read your browsing history" install warning.
- **S2** — Add a runtime validation module (`src/validate-message.ts`) applied at
  the top of the service worker's `handle()`: video ids must match
  `/^[\w-]{11}$/`, `thumbnail` is normalized to the canonical
  `https://i.ytimg.com/vi/<id>/mqdefault.jpg`, category `icon` is gated against
  the closed icon set, and `title`/`channelName`/category `name` are length-clamped.
  `extractWatchPage` gets the same video-id shape check the card path already has.
- **S3** — Replace the popup's two *computed* `innerHTML` sinks with imperative
  DOM construction (`createElement` + `textContent`); SVG tiles keep the closed
  `PATHS` map gated by the shared `isIconKey` validator.
- **S4** — Self-host the three web fonts (Bricolage Grotesque, Plus Jakarta Sans,
  JetBrains Mono) as woff2 under `styles/fonts/` with local `@font-face` rules;
  remove the Google Fonts `@import`. No third-party request on new-tab open.
- **S5** — Declare an explicit `content_security_policy.extension_pages` in the
  manifest allowing exactly what the extension uses (`'self'`, `i.ytimg.com`
  images, `www.youtube.com` connect, local fonts after S4, `object-src 'none'`).
- **S6** — Add a pure `sanitizeStorageData(raw: unknown): StorageData` applied in
  `MyTubeStore.getData()` and in both `storage.onChanged` listeners, so a
  malformed sync snapshot (other device, future schema, manual edit) can never
  crash the badge listener or feed unchecked values into the UI. Well-formed data
  passes through byte-identical.
- **S7** — Patch the dev-toolchain vulnerabilities: `npm audit fix`, bump
  `vite`/`vitest` majors as needed, move `@crxjs/vite-plugin` off the pinned
  beta to latest stable 2.x.
- **S8** — Give the oEmbed `fetch` an `AbortSignal.timeout(8_000)` so a hung
  response can't keep the service worker alive indefinitely.
- **S9** — After the crxjs upgrade, check whether `use_dynamic_url: true` works
  for the content-script `web_accessible_resources`; enable it if the e2e smoke
  stays green (reduces fingerprintability from youtube.com).

No storage layout, message contract, or user-visible behavior changes.

## Capabilities

### New Capabilities
- `extension-security`: the extension's trust-boundary guarantees — least-privilege
  manifest permissions, explicit CSP for extension pages, runtime validation of
  every message at the service-worker boundary, no computed-HTML sinks in
  privileged pages, and no third-party requests from extension pages.

### Modified Capabilities
- `persistence-sync`: stored snapshots are sanitized on read — `getData` and the
  `onChanged` listeners validate shape and drop malformed entries instead of
  trusting the cast, so corrupt sync data degrades gracefully rather than
  crashing listeners.
- `metadata-enrichment`: the oEmbed fetch gains a hard timeout requirement — a
  hung response aborts after 8s and is treated as the existing "best effort,
  keep what we have" null path.

## Impact

- **Manifest**: [manifest.config.ts](../../../manifest.config.ts) — permissions
  array, new `content_security_policy` key.
- **New module**: `src/validate-message.ts` (pure functions, unit-tested per the
  SDD loop) + `src/sanitize-storage.ts` (or colocated) for S6.
- **Service worker**: [background/service-worker.ts](../../../background/service-worker.ts)
  — validation at `handle()` entry, `onChanged` guard.
- **Content script**: [content/content.ts](../../../content/content.ts) —
  `extractWatchPage` id check only.
- **Popup**: [popup/popup.ts](../../../popup/popup.ts),
  [popup/render.ts](../../../popup/render.ts) — computed `innerHTML` → DOM
  building; locked by existing jsdom tests.
- **Styles**: [styles/theme-tokens.css](../../../styles/theme-tokens.css) +
  new `styles/fonts/` woff2 assets.
- **Toolchain**: `package.json` devDependencies (vite, vitest, @crxjs/vite-plugin,
  rollup, esbuild); verify with `npm test` + `npm run test:e2e`.
- **Specs/tests**: new granular `specs/*.spec.md` criteria for the validation and
  sanitization modules (handshake applies); manifest/CSP/font changes are covered
  by the Playwright e2e smoke + manual acceptance.
- **Ordering note**: this change and `fix-memory-and-storage-robustness` both
  touch `persistence-sync` and the service worker — archive whichever lands
  second against the updated baseline.
