# Spec: New-tab UI & end-to-end smoke

These are the criteria that ARE worth automating at the UI level. Component-level
behavior is proven with Vitest + Testing Library (jsdom); the full extension load
is proven once with Playwright.

- Component tests: [newtab/App.test.tsx](../newtab/App.test.tsx) — run with `npm test`.
- E2E smoke: [e2e/smoke.spec.ts](../e2e/smoke.spec.ts) — run with `npm run test:e2e`.

## Acceptance criteria — component (jsdom)

| ID | Given | When | Then |
|---|---|---|---|
| **UI-1** | an empty store (no videos) | the new-tab page mounts | the welcome screen ("…curada por você") is shown |
| **UI-2** | a category with one video | the page mounts | the category heading and the video title are rendered |
| **UI-3** | one watched + one unwatched video | the user clicks the **Assistidos** toggle | watched videos are hidden; unwatched stay visible |

## Acceptance criteria — end-to-end (Playwright)

| ID | Given | When | Then |
|---|---|---|---|
| **SMOKE-1** | the built `dist/` loaded as an unpacked extension | open `chrome-extension://<id>/newtab/index.html` | the background service worker has registered (valid 32-char id) **and** the curated-home welcome screen renders |

## Still manual (cost/benefit not worth automating)

- [ ] Drag-and-drop reordering of videos and of categories persists across reload.
- [ ] Right-click / ⋯ context menu actions (Mover / Marcar / Remover).
- [ ] The amber quota warning appears near the 100KB `storage.sync` limit.
- [ ] Content-script **+ Salvar** injection on YouTube cards and the `/watch` bar.
