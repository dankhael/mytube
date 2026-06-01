# Spec: Popup visual rework (main + settings screens)

- **Status:** Approved  <!-- Draft → Approved (only a human sets Approved) -->
- **Owner:** dankhael
- **Contract:** **No message or storage changes.** Existing flows (`GET_ALL`,
  `UPDATE_SETTINGS`, `chrome.tabs.create`) and the `Settings`/`StorageData` shape
  are untouched. Two presentation-layer additions (Decision §3, §2):
  - the home's `:root` theme tokens move into a **shared stylesheet** imported by
    both the new tab and the popup, so `--accent-h` is the one knob for both;
  - a small pure `categoryIcon(name)` helper maps a category to a monochrome icon
    (the popup is vanilla DOM, so icons render as inline SVG, not lucide-react).
  The category `emoji` field is unchanged in data and still used on the home; the
  popup just stops displaying it.
- **Tests:** a Node unit test for `categoryIcon` (mapping + fallback), plus
  extensions to `popup/render.test.ts` and `popup/config.test.ts` (jsdom) for the
  **observable structural** assertions below. Everything purely visual (colors,
  spacing, radii) is **Manual acceptance** — don't fake pixels in a test.

## Why

The popup still uses the old look (red "Abrir minha home" button, bare emoji rows,
"13 não assistidos", a dashed donate button). The home page was reworked to a
warm-dark violet theme with the official MyTube mark; the popup should match it so
the extension feels like one product. The two reference images define the target:
a themed main screen (logo + unwatched count + gear, icon-tile category rows with
count pills and chevrons, a violet "Open my home" button) and a themed Settings
modal (titled card, single sound toggle with a subtitle, a "Buy me a coffee" card
with a SOON badge).

## Acceptance criteria

Stable IDs (`PUI-N`). Behavior is already locked by POPUP-1..7 / CFG-1..9; these
add **only** what the redesign makes newly observable.

| ID | Given | When | Then |
|---|---|---|---|
| **PUI-1** | the popup header | it renders | it shows the official MyTube mark + wordmark, an **unwatched count** styled as `<accent number> <muted label>` (English: "13 unwatched"), and the gear button — no total-videos string |
| **PUI-2** | a category row | it renders | a **monochrome icon** (from `categoryIcon`) sits inside a **rounded icon tile** (own surface bg) — **not the emoji** — followed by the name, a **count pill** (rounded badge, shown even when 0), and a **chevron** |
| **PUI-3** | a collapsed vs expanded category | the user toggles it | the chevron reflects state: **`▸`/right when collapsed, `▾`/down when open** (the existing toggle still works; only the glyph styling is asserted) |
| **PUI-4** | the footer button | it renders | it is the **accent-filled** "Open my home" pill with a play glyph — no longer the old red (`#ff0000`) button |
| **PUI-5** | the Settings modal | it opens (CFG-1) | its title is the English **"Settings"** with a close (✕) control |
| **PUI-6** | the sound-effects row in the modal | it renders | it shows **"Sound effects"** plus a secondary subtitle line **"Little chimes as you browse"** (accurate copy — see Decision §4), and the toggle reflecting the persisted value (CFG-2) |
| **PUI-7** | the donate entry in the modal | it renders | it is a **card** with an icon tile (coffee), a title **"Buy me a coffee"**, a subtitle **"Support the developer"** and a **"SOON" badge**; it stays a non-actionable placeholder (CFG-6) |
| **PUI-8** | the new tab **and** the popup | the accent hue (`--accent-h`) is changed in the one shared token file | **both** surfaces re-theme — accent + surfaces in the popup resolve from the shared tokens, no second edit needed |
| **PUI-9** | `categoryIcon(name)` | called with a known category, an unknown/arbitrary name, and an empty string | returns a defined icon key for each, falling back to a **default icon** for unmatched/empty names; never throws |

## Out of scope / non-goals

- Any behavior change: no new actions, messages, permissions, or storage keys.
- New settings options (the modal is styled to hold more later, none added now).
- A working donation flow — still a placeholder (SOON).
- Editing/search/watched-state in the popup (unchanged from POPUP-* non-goals).
- Animations/transitions beyond what's needed to not look broken.

## Decisions (resolved by owner)

1. **Language: English.** The popup copy matches the images — "unwatched",
   "Open my home", "Settings", "Sound effects", "Buy me a coffee", "Support the
   developer", "SOON". (Drives PUI-1/4/5/6/7 wording.)
2. **Category icon: fixed monochrome set.** The popup renders an icon from a
   `categoryIcon(name)` mapping instead of the stored emoji, with a default icon
   for unmatched/arbitrary categories. The emoji stays in data and on the home.
   (Drives PUI-2/9.)
3. **Theme: one shared knob.** The home's `:root` tokens move into a shared
   stylesheet imported by both the new tab and the popup; the popup is restyled to
   consume `var(--accent)` / surface vars. Changing `--accent-h` in that one file
   re-themes **both** surfaces. The accent is currently **violet (290)**; the popup
   tracks whatever the knob is set to. (Drives PUI-8.)
4. **Sound subtitle: accurate copy.** "Little chimes as you browse" — reflects that
   sound plays on popup interactions (expand/click), not on save. (Drives PUI-6.)

## Manual acceptance (not unit-tested)

Visual fidelity to the two reference images — verify by hand after building and
reloading the unpacked extension.

- [ ] Main screen matches image 1: violet logo + wordmark, accent unwatched count,
      gear; icon-tile rows with count pills and chevrons; expanded category shows
      rounded thumbnails + 2-line titles + channel; violet "Open my home" pill.
- [ ] Settings modal matches image 2: dark backdrop, titled card with ✕, sound row
      with subtitle + violet toggle, "Buy me a coffee" card with coffee icon tile
      and SOON badge.
- [ ] Palette reads as the same product as the new-tab home (surfaces, text, accent).
- [ ] Flipping `--accent-h` in the shared token file visibly re-themes the popup too.
- [ ] Category icons are legible and sensible; arbitrary new categories get the
      default icon rather than a broken/empty tile.
- [ ] Nothing overflows the ~340px popup width; long titles still clamp to 2 lines.
- [ ] Hover/focus states are visible on rows, video items, the gear and the button.
