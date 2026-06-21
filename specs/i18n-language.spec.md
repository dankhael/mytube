<!--
The handshake (CLAUDE.md → "Spec handshake"):
  1. Agent drafts this file with Status: Draft.
  2. Human reviews/edits the criteria and flips Status to Approved.
  3. ONLY THEN may the agent implement (test per criterion → code → green).
-->

# Spec: Interface language setting (English default, Portuguese-BR option)

- **Status:** Approved  <!-- Draft → Approved (only a human sets Approved) -->
- **Owner:** dankhael
- **Contract:** extend `Settings` in `src/types.ts` with a `language: Language`
  key (`'en' | 'pt-BR'`), defaulted to `'en'` so missing/unknown values fall
  back (CFG-9 / THEME-1 style). Reuses the existing `UPDATE_SETTINGS` message and
  `GET_ALL` round-trip. No new permissions. A new `src/i18n.ts` module holds the
  message catalog and a `t(key, lang)` lookup; UI strings move out of the source
  into the catalog.
- **Tests:**
  - `src/i18n.test.ts` — `t(key, lang)` returns the catalog string; unknown
    `lang` falls back to `'en'`; both locales define the same key set (no gaps).
  - `src/sanitize-storage.test.ts` — an unknown/garbage `language` falls back to
    `'en'` on read.
  - `popup/config.test.ts` — the modal renders the language row with the persisted
    language selected and reports a pick.
  - `newtab/App.test.tsx` — the new-tab page renders catalog strings for the
    active language (e.g. "Saved"/"Salvos") rather than hardcoded text.

## Why

The extension's UI is a mix of English (popup Settings modal) and hardcoded
Brazilian Portuguese (content script "+ Salvar", new-tab home labels, category
defaults). To reach a wider audience, the default interface language should be
**English**, with **Portuguese (Brazil)** available as a switchable option in
Settings. All user-facing copy should come from one catalog keyed by language.

## Acceptance criteria

Stable IDs (`I18N-N`). Each row becomes one `it('I18N-N: …')`.

| ID | Given | When | Then |
|---|---|---|---|
| **I18N-1** | the `Settings` schema | the extension reads stored data with no `language` key | `language` defaults to `'en'`; no migration needed |
| **I18N-2** | an unknown/garbage `language` value (e.g. `'fr'`, `42`) | settings are sanitized on read | it falls back to `'en'` rather than persisting the invalid value |
| **I18N-3** | the message catalog | `t(key, 'en')` and `t(key, 'pt-BR')` are called for a defined key | each returns the locale's string for that key |
| **I18N-4** | the two locale catalogs (`en`, `pt-BR`) | their key sets are compared | they are identical — every key exists in both (test guards against drift) |
| **I18N-5** | `t(key, lang)` with an unknown key | the lookup runs | it returns a stable, debuggable fallback (the key itself or the `en` value) rather than `undefined`, and does not throw |
| **I18N-6** | the config modal | it renders a **"Language"** row | a selectable control offers English and Português (Brasil), with the persisted language marked selected (`aria-checked="true"`) |
| **I18N-7** | the language row | the user picks the other language | the change is reported via callback (persisted as `UPDATE_SETTINGS { language }`) and that option becomes selected |
| **I18N-8** | a stored `language` of `'pt-BR'` | the popup and the new-tab page load | both render their copy from the `pt-BR` catalog (e.g. "Salvos", "Categorias"), not hardcoded English |
| **I18N-9** | the default install (`language: 'en'`) | the popup and the new-tab page load | both render English copy from the catalog |
| **I18N-10** | a changed language | the surface is closed and reopened (or the other surface is opened) | the chosen language persists (stored + synced) and is reflected on both surfaces |
| **I18N-11** | the new-tab smart-section / home labels currently hardcoded in Portuguese | the page renders in the active language | section titles and empty/error copy come from the catalog for that language |

## Out of scope / non-goals

- Auto-detecting the browser/OS locale (`chrome.i18n` / `navigator.language`).
  Default is a fixed `'en'`; the user opts into `pt-BR` explicitly. (Owner may
  override — see Decisions §1.)
- Any third language beyond `en` and `pt-BR`.
- Translating user-authored content (saved video titles, custom category names a
  user typed). Only MyTube's own chrome is localized.
- The **content-script** "+ Salvar" button copy and other in-YouTube DOM strings
  are localized via the catalog but verified by **Manual acceptance**, not unit
  tests (YouTube DOM isn't unit-tested per `specs/README.md`).
- Renaming the seeded default categories (`Tutoriais`, `Entretenimento`,
  `Sem categoria`) for existing users — migrating stored data is out of scope.
  (Whether *new* installs seed English category names is Decisions §3.)
- RTL layout, locale-specific date/number formatting, pluralization rules beyond
  what the catalog strings already encode.
- Using Chrome's native `_locales/messages.json` extension i18n (the manifest
  `default_locale` mechanism). This spec keeps a runtime, settings-driven catalog
  so the user can switch language without changing the browser locale.

## Manual acceptance (not unit-tested)

- [ ] The Language row is discoverable in the popup Settings modal.
- [ ] Switching to Português (Brasil) re-localizes the popup immediately (or per
      Decisions §2) and the new-tab home on next open.
- [ ] The in-YouTube "+ Salvar" / "Save" button and its category menu show the
      chosen language.
- [ ] The choice survives closing/reopening the popup and syncs across devices.
- [ ] No leftover hardcoded Portuguese remains visible when English is selected
      (and vice-versa).

## Decisions (proposed — owner to confirm before Approved)

1. **Default & detection:** seed from `navigator.language`, defaulting to `'en'` when not pt-BR.)
2. **Live switch vs reload:** picking a language re-renders the popup immediately
3. **New-install category names:** seed English defaults (`Tutorials`, `Entertainment`, `Uncategorized`) when
   `language === 'en'` at first install.
4. **Catalog shape:** one `src/i18n.ts` with a typed `Messages` record per locale
   and `t(key, lang)`; keys are dot-namespaced (e.g. `popup.settings.title`).
   Reuse `UPDATE_SETTINGS` / `GET_ALL`; unknown `language` falls back to `'en'`.
