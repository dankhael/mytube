## ADDED Requirements

### Requirement: Channel avatar on the home card

The home video card SHALL display the saved channel photo in its avatar slot when
the video carries a valid `channelThumbnail`, and MUST fall back to the existing
initial-letter avatar (the uppercased first character of the channel name) when
the field is missing, invalid, or the image fails to load. A failed image load
MUST degrade to the initial-letter avatar rather than render a broken image.

#### Scenario: Card shows the channel photo
- **WHEN** a card renders for a video that has a valid `channelThumbnail`
- **THEN** the avatar slot shows an `<img>` whose `src` is that URL and whose `alt` is the channel name

#### Scenario: Card without an avatar shows the initial
- **WHEN** a card renders for a video with no `channelThumbnail`
- **THEN** the avatar slot shows the uppercased first character of the channel name

#### Scenario: Broken avatar image degrades to the initial
- **WHEN** a rendered avatar image fails to load (e.g. an expired URL)
- **THEN** the card replaces it with the initial-letter avatar instead of a broken image
