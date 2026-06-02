# tab-identity

## Purpose

Make the curated-home browser tab recognizable: show the name "MyTube" and the
extension favicon so it is distinguishable from a generic new tab. Driven by the
static page [newtab/index.html](../../../newtab/index.html) and the icons in
`icons/`. Consolidates `specs/newtab-tab-identity.spec.md` (TAB-*).

<!-- TODO: reconcile scenario IDs against specs/newtab-tab-identity.spec.md
     (TAB-1..3). These are observable by reading newtab/index.html as text. -->

## Requirements

### Requirement: Home tab shows the product name

The new-tab home page MUST set the browser tab title to "MyTube".

#### Scenario: Tab title (TAB-1)
- **WHEN** the user opens the extension's new-tab home
- **THEN** the browser tab title reads "MyTube"

### Requirement: Home tab shows the extension favicon

The new-tab home page MUST declare a `<link rel="icon">` pointing at an extension
icon asset.

#### Scenario: Favicon link present (TAB-2 / TAB-3)
- **WHEN** the new-tab HTML loads
- **THEN** it declares a `<link rel="icon">` pointing at an extension icon asset (today `/icons/icon48.png`), so the tab shows the MyTube icon
