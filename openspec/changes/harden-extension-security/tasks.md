## 1. Implementation-layer spec (handshake)

- [x] 1.1 Draft `specs/security-hardening.spec.md` (`Status: Draft`) from
      `specs/_TEMPLATE.spec.md` with stable IDs for the unit-testable criteria:
      video-id validation, thumbnail canonicalization, icon gating, length
      clamps, snapshot sanitization (byte-identical pass-through + malformed-entry
      drop), oEmbed timeout. Put manifest/CSP/font/popup-DOM checks under
      **Manual acceptance**. Stop and request human approval — do not write code
      against a Draft spec.
- [x] 1.2 Reconcile the `TODO` notes in the touched baselines
      (`openspec/specs/persistence-sync/spec.md`,
      `openspec/specs/metadata-enrichment/spec.md`) per the OpenSpec layer rule
      (first change to a capability reconciles its TODOs).

## 2. S1 — Least-privilege manifest

- [x] 2.1 Change `permissions` to `['storage']` in `manifest.config.ts`.
- [x] 2.2 Run `npm run test:e2e` and manually verify both popup
      `chrome.tabs.create` paths (open video, open home) still work.

## 3. S2 + S6 + S3(icon) — Validation and sanitization boundary

- [x] 3.1 Write failing Vitest cases (one `it('<ID>: …')` per approved criterion)
      for `isYoutubeVideoId`, `canonicalThumbnail`, `isIconKey`, length clamp,
      and `sanitizeStorageData` (byte-identical well-formed pass-through,
      malformed-entry dropping, missing-`videos` guard).
- [x] 3.2 Implement `src/validate-message.ts` (pure functions: id regex,
      canonical thumbnail, icon gate, clamp) until green.
- [x] 3.3 Implement `sanitizeStorageData(raw: unknown): StorageData` in `src/`
      until green; no write-back on read.
- [x] 3.4 Apply validation at the top of `handle()` in
      `background/service-worker.ts`: reject bad ids with
      `{ ok: false, error }` naming the offending value, normalize thumbnails,
      gate icons, clamp text fields.
- [x] 3.5 Call `sanitizeStorageData` in `MyTubeStore.getData()` and in both
      `storage.onChanged` listeners (service-worker badge + new tab); add the
      `if (!changes.mytube.newValue) return` guard to the badge listener.
- [x] 3.6 Add the `/^[\w-]{11}$/` check to `extractWatchPage` in
      `content/content.ts`.

## 4. S3 — Popup computed innerHTML → DOM building

- [x] 4.1 Replace the `unwatchedLabel(...).replace(...)` `innerHTML` write in
      `popup/popup.ts` with `replaceChildren(<b>, textNode)`; keep rendered
      markup identical (locked by `popup/render.test.ts` /
      `popup-shell.test.ts`).
- [x] 4.2 Gate the SVG tile lookup in `popup/render.ts` / `popup/config.ts`
      behind `isIconKey` from `src/validate-message.ts`.

## 5. S8 — Bounded oEmbed fetch

- [x] 5.1 Failing test: `fetchVideoMetadata` resolves `null` when the fetch
      aborts (fake fetch rejecting with `TimeoutError`).
- [x] 5.2 Add `{ signal: AbortSignal.timeout(8_000) }` to the fetch in
      `src/metadata.ts`; green.

## 6. S4 — Self-host fonts

- [x] 6.1 Vendor Bricolage Grotesque, Plus Jakarta Sans, and JetBrains Mono as
      variable woff2 under `styles/fonts/` (preserve the axis ranges from the
      current Google Fonts URL: `opsz,wght@12..96,400..800` etc.).
- [x] 6.2 Replace the `@import` in `styles/theme-tokens.css` with local
      `@font-face` rules; verify rendering in new tab and popup (manual
      acceptance), confirm zero requests to `fonts.googleapis.com` /
      `fonts.gstatic.com` in DevTools Network.

## 7. S5 — Explicit CSP

- [x] 7.1 Add `content_security_policy.extension_pages` to
      `manifest.config.ts`: `default-src 'self'`;
      `img-src 'self' https://i.ytimg.com`;
      `connect-src https://www.youtube.com`;
      `style-src 'self' 'unsafe-inline'`; `font-src 'self'`;
      `object-src 'none'`.
- [x] 7.2 Run `npm run test:e2e` and manually check thumbnails, fonts, and the
      oEmbed backfill under the new policy.

## 8. S7 + S9 — Toolchain patch and fingerprint check

- [x] 8.1 `npm audit fix`; bump `vite`/`vitest` majors as required; move
      `@crxjs/vite-plugin` from `2.0.0-beta.28` to latest stable 2.x. One
      isolated commit.
- [x] 8.2 Verify: `npm audit` reports 0 fixable findings, `npm test` green,
      `npm run test:e2e` green, PostToolUse hook (`scripts/test-hook.mjs`)
      still runs.
- [x] 8.3 Check whether the upgraded crxjs supports `use_dynamic_url: true` for
      content-script `web_accessible_resources`; enable it if e2e stays green,
      otherwise record the limitation in the change notes (finding stays
      accepted-Info).

## 9. Wrap-up

- [ ] 9.1 Full pass: `npm test`, `npm run test:e2e`, manual acceptance
      checklist from `specs/security-hardening.spec.md`.
      *(2026-06-10: automated half done — `npm test` 94/94 and e2e smoke green
      on the bumped toolchain; the manual checklist in the spec awaits a human
      with the loaded extension.)*
- [x] 9.2 Mark the implementation spec's criteria green and prepare the change
      for `/opsx:archive` (delta folds into `extension-security`,
      `persistence-sync`, `metadata-enrichment` baselines).
