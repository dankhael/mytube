## ADDED Requirements

### Requirement: Capture the channel avatar at save time

The content script SHALL best-effort read the channel avatar image URL from the
YouTube DOM when building the save payload — both for feed/search/sidebar cards
(`extractCard`) and for the open `/watch` page (`extractWatchPage`) — and include
it on the `SAVE_VIDEO` message as `video.channelThumbnail`. Because YouTube
exposes no deterministic per-`videoId` avatar URL and oEmbed returns none, the
capture MUST be optional: when the DOM exposes no avatar, the field is omitted
and the save proceeds with the rest of the payload unchanged.

#### Scenario: Avatar present in the card DOM is captured
- **WHEN** the user saves a video from a card whose DOM exposes a channel avatar image
- **THEN** the `SAVE_VIDEO` payload carries `video.channelThumbnail` set to that avatar URL

#### Scenario: No avatar in the DOM still saves
- **WHEN** the user saves a video from a card or watch page that exposes no channel avatar image
- **THEN** the video is saved with `channelThumbnail` omitted and no error occurs
