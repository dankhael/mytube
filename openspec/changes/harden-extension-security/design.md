## Context

MyTube's security posture today rests on compile-time types and good rendering
habits: the `Message` union is not enforced at runtime, stored snapshots are
cast with `as StorageData`, MV3's default CSP leaves `img-src`/`connect-src`
open, and the manifest over-requests `tabs`/`activeTab`. The content script runs
inside youtube.com and builds payloads from page-controlled DOM — it is the
untrusted side of the boundary. The full inventory is findings S1–S9 in
[docs/security-memory-review.md](../../../docs/security-memory-review.md).
Constraint: zero user-visible behavior change; the e2e smoke and existing jsdom
tests must stay green throughout.

## Goals / Non-Goals

**Goals:**
- Make the `Message` contract true at runtime, at the single choke point
  (`handle()` in the service worker).
- Least privilege: minimal permissions, explicit CSP, no third-party requests
  from extension pages.
- No computed string ever parsed as HTML in a privileged page.
- Malformed sync data degrades gracefully instead of crashing listeners.
- Patch the vulnerable dev toolchain.

**Non-Goals:**
- No storage-layout, quota, or concurrency work — that is
  `fix-memory-and-storage-robustness` (R1/R2).
- No new user-facing error UI (R3 lives in the other change).
- No attempt to sanitize YouTube DOM content beyond shape/length — titles and
  channel names remain arbitrary strings rendered via `textContent`/React.

## Decisions

1. **Validate at `handle()`, not in the content script.** The content script is
   page-adjacent and can be bypassed by anything running on youtube.com; the
   service worker is the trust boundary. `extractWatchPage` still gets the
   `/^[\w-]{11}$/` check (cheap, catches garbage early), but the *guarantee*
   lives in `src/validate-message.ts` applied before the `switch`. Alternative
   considered: a full schema validator (zod) — rejected as a new dependency for
   four small checks; hand-rolled pure functions are unit-testable per the SDD
   loop and keep the bundle lean.
2. **Normalize `thumbnail`, don't reject it.** `canonicalThumbnail(id, candidate)`
   returns the expected `https://i.ytimg.com/vi/<id>/mqdefault.jpg` unless the
   candidate already equals it. Rejecting would change behavior for any
   out-of-contract caller; normalizing is observationally identical for every
   payload the extension generates today and removes the tracking-pixel vector.
3. **Invalid ids reject with the existing `{ ok: false, error }` shape**, with
   the offending value and expected shape in the message (CLAUDE.md exception
   style). No new response variants — UI handling is unchanged.
4. **`sanitizeStorageData(raw: unknown): StorageData` is a pure function in
   `src/`**, called in `MyTubeStore.getData()` and in both `onChanged`
   listeners. It validates field shapes, drops malformed entries, applies
   existing defaults, and passes well-formed data through byte-identical
   (asserted in a test). The `icon` gate (`isIconKey`) lives in the validation
   module and is shared by S2, S3, and S6.
5. **Popup `innerHTML` → imperative DOM only for the two computed sinks.** The
   two static-literal `innerHTML` writes are safe and stay (matching the
   existing code style); `unwatchedLabel` becomes `replaceChildren(<b>, text)`
   and SVG tiles keep the closed `PATHS` map behind `isIconKey`. Locked by the
   existing `popup/render.test.ts` / `popup-shell.test.ts` jsdom tests.
6. **Fonts before CSP.** S4 (vendor woff2 + local `@font-face`) lands first so
   S5's CSP can use `font-src 'self'` / drop `fonts.googleapis.com` from
   `style-src`. If S4 slipped, the CSP would need the Google hosts — vendoring
   first avoids shipping a looser policy. `'unsafe-inline'` stays in
   `style-src` because React/dnd-kit set inline `style` attributes.
7. **Dep bumps last, S9 piggybacks.** `npm audit fix` + `vite`/`vitest` majors +
   `@crxjs/vite-plugin` stable 2.x are verified by `npm test` + e2e. Only then
   check whether current crxjs supports `use_dynamic_url: true` for the
   content-script chunks; enable if e2e stays green, otherwise document why not.

## Risks / Trade-offs

- [CSP too strict breaks thumbnails/fonts silently] → the Playwright e2e smoke
  renders the new tab with a saved video; broken `img-src`/`font-src` shows up
  immediately. Run e2e after the manifest change.
- [Length clamps (300 chars) could truncate a legitimate value] → real YouTube
  titles are ≤ 100 chars; clamp is generous and protects the sync quota. Clamp,
  don't reject, so saves never fail on length.
- [Sanitizer drops data a future schema version needs] → it only drops entries
  that fail the *current* shape and never writes the sanitized result back on
  read — the stored bytes are untouched until the next legitimate mutation.
- [vite/vitest major bumps break the build or the PostToolUse hook] → bump in
  one isolated commit, gate on `npm test` + `npm run test:e2e`; the hook script
  (`scripts/test-hook.mjs`) runs `vitest run` and must stay compatible.
- [`use_dynamic_url: true` regression (the old Chromium bug)] → e2e smoke loads
  the built extension on YouTube; if content-script chunks fail to import,
  revert to `false` and record the finding as accepted (Info severity).

## Migration Plan

No persisted data or contract changes. Permissions removal (`tabs`/`activeTab`)
is a downgrade Chrome applies silently on update — no re-consent prompt. Rollout
order: S1 → S2+S6 (+S3 icon gate) → S3 DOM building → S8 → S4 → S5 → S7 → S9.
Rollback for any step is a revert; steps are independent except S5-after-S4 and
S9-after-S7.

## Open Questions

- Does the latest `@crxjs/vite-plugin` stable support `use_dynamic_url: true`
  for content-script `web_accessible_resources`? (Resolved during S7/S9 task —
  answer determines whether S9 ships or is documented as accepted.)

  **Resolved 2026-06-10 (S9 does not ship; finding stays accepted-Info).**
  crxjs 2.5.0 hardcodes `use_dynamic_url: false` for manifest-declared
  content-script resources (`dist/index.mjs`, the
  `isDynamicScript ? dynamicScriptDynamicUrl : false` branch) — only scripts
  injected via the `scripting` API with `defineDynamicResource` can opt in,
  which MyTube doesn't use. Overriding via a manifest post-processing plugin
  would fight the loader (it imports chunks through `chrome.runtime.getURL`,
  the path hit by the old dynamic-URL Chromium bug crxjs guards against), and
  the e2e smoke doesn't exercise youtube.com imports, so a green run wouldn't
  prove safety. Revisit if crxjs exposes the flag for manifest content scripts.
