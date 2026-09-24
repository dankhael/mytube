// The promo video's running order — the single source for what plays, in which
// sequence, under which caption. Recording order is different (state has to be
// built up: seed → YouTube saves → home), so every clip is recorded by `id` and
// the composer stitches them back in this order.
//
// `layout`:
//   card    — a full-frame title card rendered from cards.mjs (no browser window)
//   window  — a recorded page framed in a floating browser window
//   popup   — the toolbar popup floating over a still of the home page
// `url` is the text painted in the fake address bar (cosmetic only).
// `speed` plays a take faster than it was filmed (cursor glides are paced for
// clarity, not for a 60s cut).
// `vertical.x` pins the vertical cut's 720px slice instead of letting it
// follow the pointer — for scenes whose payoff happens away from the cursor.
// `focus` eases a zoom in on the box the scene saved to `<id>.focus.json`
// (for UI too small to read at full frame), `from` seconds into the take.

export const FPS = 30
export const TRANSITION_S = 0.5

export const STORYBOARD = [
  { id: 'intro', layout: 'card', seconds: 3.5 },
  {
    id: 'yt-save',
    layout: 'window',
    url: 'youtube.com/results?search_query=blender+open+movie',
    caption: 'Save any YouTube video in one click',
    speed: 1.15,
  },
  // yt-playlist (playlist import) is filmed but left out of the cut until the
  // importer reads YouTube's current playlist rows: today the scrape finds no
  // `ytd-playlist-video-renderer` and the take ends on "No videos found".
  {
    id: 'home-library',
    layout: 'window',
    url: 'MyTube — New Tab',
    caption: 'Your new tab becomes your own YouTube home',
    speed: 1.25,
  },
  {
    id: 'home-search',
    layout: 'window',
    url: 'MyTube — New Tab',
    caption: 'Find anything instantly',
  },
  {
    id: 'home-category',
    layout: 'window',
    url: 'MyTube — New Tab',
    caption: 'Organize with your own categories',
  },
  {
    id: 'home-move',
    layout: 'window',
    url: 'MyTube — New Tab',
    caption: 'Move videos where they belong',
    speed: 1.2,
  },
  {
    id: 'popup',
    layout: 'popup',
    url: 'MyTube — New Tab',
    caption: 'Your library, one click from the toolbar',
  },
  {
    id: 'yt-reminder',
    layout: 'window',
    url: 'youtube.com',
    caption: 'Gentle reminders for what you saved',
    // 1.5× in the vertical cut: at 2.2× the pill outgrows the 720px slice.
    focus: { zoom: 2.2, verticalZoom: 1.5, from: 0.9 },
  },
  {
    id: 'home-theme',
    layout: 'window',
    url: 'MyTube — New Tab',
    caption: 'Make it yours: accent colors and a retro CRT skin',
  },
  { id: 'outro', layout: 'card', seconds: 4.5 },
]
