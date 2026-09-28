<!--
The handshake (see CLAUDE.md → "Workflow"):
  1. Agent drafts this file with Status: Draft.
  2. Human reviews/edits the criteria and flips Status to Approved.
  3. ONLY THEN may the agent implement (test per criterion → code → green).
Do not implement against a Draft. Do not edit Approved criteria without the human.
-->

# Spec: Open-home keyboard shortcut

- **Status:** Approved  <!-- Draft → Approved (only a human sets Approved) — approved by the owner in the spec-audit review, 2026-09-28 -->
- **Owner:** dankhael
- **Contract:** no `Message`/`StorageData` change. The `open_home` command in
  [manifest.config.ts](../manifest.config.ts) (`commands`), `OPEN_HOME_COMMAND`,
  `homeShortcut` and `openShortcutSettings` in [src/home-page.ts](../src/home-page.ts),
  and the worker's `chrome.commands.onCommand` listener.
- **Tests:** [popup/config.test.ts](../popup/config.test.ts) (the Settings row,
  SHORTCUT-1…4 — these tests already exist) and
  [src/home-page.test.ts](../src/home-page.test.ts) (the helpers, SHORTCUT-5/6).

> **Retro-spec.** This documents behavior that shipped without a spec — the tests
> `SHORTCUT-1…4` existed with no spec defining those IDs (found in the spec
> audit). Approving it changes no code; it binds the existing tests to criteria.

## Why

The home is not a new-tab override (see `watch-reminders` Decision 1), so it
needs a fast way in besides the toolbar popup. A keyboard shortcut opens it from
anywhere, and the Settings modal shows which key is bound and lets the user
change it — Chrome owns the binding, so the extension can only show it and send
the user to Chrome's shortcuts page.

## Acceptance criteria

| ID | Given | When | Then |
|---|---|---|---|
| **SHORTCUT-1** | the `open_home` command has a binding (e.g. `Ctrl+Shift+Y`) | the Settings modal opens | the shortcut row's button shows that binding |
| **SHORTCUT-2** | the command has no binding | the Settings modal opens | the button shows "Not set" and carries the unset style |
| **SHORTCUT-3** | the interface language is `pt-BR` | the Settings modal opens | the row label and the unset placeholder are localized ("Atalho da home" / "Não definido") |
| **SHORTCUT-4** | the Settings modal is open | the user clicks the shortcut button | `onEditShortcut` is called once (the popup then opens Chrome's shortcuts page) |
| **SHORTCUT-5** | `chrome.commands.getAll()` lists the commands | `homeShortcut()` runs | it returns the `open_home` binding, or `''` when that command is unbound or absent |
| **SHORTCUT-6** | the user asked to edit the shortcut | `openShortcutSettings()` runs | a tab opens at `chrome://extensions/shortcuts` |

## Decisions

1. **Suggested key, not forced.** The manifest suggests `Ctrl+Shift+Y` /
   `Command+Shift+Y`; Chrome may leave it unbound if another extension already
   holds it, which is why SHORTCUT-2's "Not set" state exists.
2. **Read on open.** The popup reads the binding each time Settings opens, so a
   change made on Chrome's shortcuts page shows up without reinstalling.
3. **Extensions can't bind keys.** Chrome forbids setting a command's shortcut
   programmatically; editing means deep-linking to `chrome://extensions/shortcuts`.

## Out of scope / non-goals

- Additional commands (e.g. "save the current video") — a separate spec.
- Rebinding from inside the extension (not possible, Decision 3).

## Manual acceptance (not unit-tested)

- [ ] **SHORTCUT-7** — With the default binding, pressing `Ctrl+Shift+Y`
      (`Cmd+Shift+Y` on Mac) on any page opens the MyTube home in a new tab.
- [ ] **SHORTCUT-8** — Changing the binding on `chrome://extensions/shortcuts`,
      then reopening the popup Settings, shows the new key.
