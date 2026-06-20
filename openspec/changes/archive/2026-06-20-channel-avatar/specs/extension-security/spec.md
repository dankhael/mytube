## MODIFIED Requirements

### Requirement: Explicit CSP for extension pages

The manifest SHALL declare a `content_security_policy.extension_pages` that
allows only what the extension uses: `default-src 'self'`, images from `'self'`,
`https://i.ytimg.com` (video thumbnails), and the channel-avatar hosts
`https://yt3.ggpht.com`, `https://yt3.googleusercontent.com`, and
`https://lh3.googleusercontent.com`, plus `data:` for the generated inline SVG
favicon; connections to `https://www.youtube.com`, locally hosted fonts, and
`object-src 'none'`. Inline `style` attributes remain allowed (`'unsafe-inline'`
in `style-src`) because React/dnd-kit set drag transforms inline.

#### Scenario: Thumbnail host is allowed
- **WHEN** the new tab or popup renders a saved video's `i.ytimg.com` thumbnail
- **THEN** the image loads under the declared CSP

#### Scenario: Channel avatar host is allowed
- **WHEN** the home card renders a saved video's channel avatar from one of the allowlisted Google avatar hosts
- **THEN** the image loads under the declared CSP

#### Scenario: Arbitrary remote image is blocked
- **WHEN** an extension page attempts to load an image from any host other than `'self'`, `https://i.ytimg.com`, or the three allowlisted avatar hosts
- **THEN** the CSP blocks the request

### Requirement: Runtime validation at the service-worker message boundary

The service worker SHALL validate every incoming `Message` before acting on it,
making the compile-time `Message` union true at runtime. Specifically:

- Any message carrying a video id (`SAVE_VIDEO`, `DELETE_VIDEO`, `MOVE_VIDEO`,
  `MARK_WATCHED`) MUST be rejected with `{ ok: false, error }` — the error
  naming the offending value and expected shape — when the id does not match
  `/^[\w-]{11}$/`.
- `video.thumbnail` MUST be normalized to the canonical
  `https://i.ytimg.com/vi/<id>/mqdefault.jpg` URL; any other candidate string is
  replaced by the canonical URL derived from the validated id.
- `video.channelThumbnail`, when present, MUST be kept only if it is an `https:`
  URL whose host is one of `yt3.ggpht.com`, `yt3.googleusercontent.com`, or
  `lh3.googleusercontent.com`; any other value (other host, non-https, or
  non-string) MUST be dropped to `undefined` without failing the save.
- Category `icon` values MUST be gated against the closed icon set; unknown
  values are treated as unset.
- `title`, `channelName`, and category `name` MUST be clamped to a bounded
  length (300 characters) before storage.

The content script's watch-page extraction MUST apply the same video-id shape
check the card path already has.

#### Scenario: Malformed video id is rejected
- **WHEN** a `SAVE_VIDEO` (or `DELETE_VIDEO` / `MOVE_VIDEO` / `MARK_WATCHED`) arrives whose id fails `/^[\w-]{11}$/`
- **THEN** the worker responds `{ ok: false, error }` with the offending value in the message and nothing is written to storage

#### Scenario: Non-canonical thumbnail is normalized
- **WHEN** a `SAVE_VIDEO` arrives whose `thumbnail` is not exactly `https://i.ytimg.com/vi/<id>/mqdefault.jpg`
- **THEN** the stored video's thumbnail is the canonical URL derived from the validated id

#### Scenario: Allowlisted channel avatar is kept
- **WHEN** a `SAVE_VIDEO` arrives whose `channelThumbnail` is an `https:` URL on an allowlisted avatar host
- **THEN** the stored video keeps that `channelThumbnail` value

#### Scenario: Non-allowlisted channel avatar is dropped
- **WHEN** a `SAVE_VIDEO` arrives whose `channelThumbnail` is a non-allowlisted host, non-https, or non-string
- **THEN** the stored video has `channelThumbnail` undefined and the rest of the save succeeds

#### Scenario: Canonical payload passes through unchanged
- **WHEN** a `SAVE_VIDEO` arrives with a valid id and the canonical thumbnail (what the content script sends today)
- **THEN** the video is stored exactly as sent

#### Scenario: Unknown category icon is treated as unset
- **WHEN** an `ADD_CATEGORY` or `UPDATE_CATEGORY` arrives with an `icon` outside the closed icon set
- **THEN** the category is stored with no icon and renders the same fallback as a missing icon

#### Scenario: Oversized text fields are clamped
- **WHEN** a message arrives with a `title`, `channelName`, or category `name` longer than 300 characters
- **THEN** the stored value is truncated to 300 characters and the operation otherwise succeeds

#### Scenario: Watch-page id is shape-checked at extraction
- **WHEN** the watch page URL carries a `v` parameter that is not an 11-character `[\w-]` id
- **THEN** the content script does not inject a save pill for it and sends no message with that id

### Requirement: No third-party requests from extension pages

Extension pages MUST NOT fetch resources from third-party origins at page load.
Web fonts SHALL be vendored into the extension (woff2 + local `@font-face`)
instead of imported from Google Fonts; the only remote origins extension pages
may contact are `https://i.ytimg.com` for video thumbnails and the allowlisted
channel-avatar hosts (`yt3.ggpht.com`, `yt3.googleusercontent.com`,
`lh3.googleusercontent.com`) for saved channel photos.

#### Scenario: New tab loads without contacting Google
- **WHEN** the user opens a new tab
- **THEN** the page issues no request to `fonts.googleapis.com` or `fonts.gstatic.com`, and the three families (Bricolage Grotesque, Plus Jakarta Sans, JetBrains Mono) render from bundled files

#### Scenario: Fonts render offline
- **WHEN** the browser is offline and the user opens the new tab
- **THEN** the bundled fonts still render (no fallback to system fonts)
