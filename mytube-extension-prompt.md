# Claude Code Prompt — MyTube Extension

## Context

Build a **Chrome Extension (Manifest V3)** called **MyTube** — a curated home for YouTube. The problem it solves: YouTube's native "Watch Later" is a graveyard of videos that never get watched. The user wants a "YouTube home, but curated by themselves" experience, with videos split into categories they define.

---

## What to build

### Project structure

```
mytube-extension/
├── manifest.json
├── background/
│   └── service-worker.js
├── content/
│   └── content.js          # injects a button on YouTube cards
├── newtab/
│   ├── index.html
│   ├── App.tsx             # curated home (React + Vite)
│   └── components/
│       ├── CategorySection.tsx
│       ├── VideoCard.tsx
│       ├── AddCategoryModal.tsx
│       └── SaveToModal.tsx
├── popup/
│   └── popup.html          # badge with saved-video count
├── package.json
└── vite.config.ts
```

### Tech stack

- **Build:** Vite + CRXJS (`@crxjs/vite-plugin`) — native hot reload for extensions
- **UI:** React 18 + TypeScript
- **Styling:** Tailwind CSS
- **Storage:** `chrome.storage.sync` (syncs across devices)
- **Icons:** Lucide React
- **Messaging:** `chrome.runtime.sendMessage` / `chrome.runtime.onMessage`

---

## Features

### 1. Content Script (`content/content.js`)

Injects a **"+ Salvar"** button on every video card on the YouTube home (`ytd-rich-item-renderer`), on the search results page (`ytd-video-renderer`) and in the suggested-videos sidebar (`ytd-compact-video-renderer`).

- Uses a `MutationObserver` to detect new cards loaded dynamically (YouTube is an SPA)
- Extracts from the DOM: `videoId` (from the `<a>` URL), `title`, `thumbnail` (`<img>`), `channelName`
- On click, opens an **inline dropdown** with the existing categories + a "Nova categoria" option
- On selecting a category, sends a message to the service worker: `{ action: 'SAVE_VIDEO', video, category }`
- Visual feedback on the button: switches to "✓ Salvo" for 2 seconds

**YouTube card selectors (reference):**
```js
// Cards on the home
document.querySelectorAll('ytd-rich-item-renderer')
// Thumbnail link
card.querySelector('a#thumbnail')
// Title
card.querySelector('#video-title')
// Channel
card.querySelector('#channel-name a')
// Thumbnail src
card.querySelector('img.yt-core-image')
```

### 2. Background Service Worker (`background/service-worker.js`)

Manages the storage. Responds to the messages:

- `SAVE_VIDEO` → adds the video to storage under the right category
- `GET_ALL` → returns all videos and categories
- `DELETE_VIDEO` → removes a video by id
- `MOVE_VIDEO` → changes a video's category
- `MARK_WATCHED` → sets `watched: true`
- `ADD_CATEGORY` → creates a new category
- `DELETE_CATEGORY` → removes a category (and moves its videos to "Sem categoria" or deletes them too — configurable)
- `REORDER_CATEGORIES` → saves the new category order

**Storage schema:**
```ts
interface StorageData {
  categories: string[]           // category order
  videos: Video[]
}

interface Video {
  id: string                     // YouTube videoId
  title: string
  thumbnail: string              // thumbnail URL (mqdefault.jpg)
  channelName: string
  category: string
  addedAt: number                // timestamp
  watched: boolean
  watchedAt?: number
}
```

Updates the icon badge with the unwatched-video count:
```js
chrome.action.setBadgeText({ text: String(unwatchedCount) })
chrome.action.setBadgeBackgroundColor({ color: '#FF0000' })
```

### 3. New Tab Page — Curated Home

This is the centerpiece. The new tab page replaces Chrome's new tab with the user's curated home.

**Layout:**

```
┌──────────────────────────────────────────────────────────┐
│  MyTube                               [+ Categoria] [⚙]  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  🎓 Tutoriais  (3 videos)                    [···]       │
│  ┌────────┐  ┌────────┐  ┌────────┐                      │
│  │ thumb  │  │ thumb  │  │ thumb  │                      │
│  │        │  │        │  │        │                      │
│  │ title  │  │ title  │  │ title  │                      │
│  │ channel│  │ channel│  │ channel│                      │
│  └────────┘  └────────┘  └────────┘                      │
│                                                          │
│  🎭 Entretenimento  (5 videos)               [···]       │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐          │
│  │ thumb  │  │ thumb  │  │ thumb  │  │ +2     │          │
│  └────────┘  └────────┘  └────────┘  └────────┘          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Behaviors:**

- Grid of cards with thumbnail, title (truncated to 2 lines), channel
- Each category shows up to 4 videos; if there are more, the last card is a clickable "+N" that expands
- Card hover: the thumbnail dims slightly, a centered play button appears
- Card click: opens `https://www.youtube.com/watch?v={id}` in a new tab
- Right-click on the card (or the `⋯` menu): options — Move to..., Mark as watched, Remove
- Videos marked as watched get a semi-transparent overlay and a ✓ — they can be hidden via a toggle
- Drag and drop to reorder videos within a category (use `@dnd-kit/core`)
- Drag and drop to reorder the categories themselves
- The `[···]` button on a category: rename, change emoji/icon, delete category
- Dark theme by default (matches YouTube's dark look)

**Visual style:**

- Background: `#0f0f0f` (same as YouTube dark)
- Cards: `#1a1a1a` with border `#272727`
- Hover: `#272727`
- Accent: YouTube red `#ff0000` for the badge detail and primary button
- Font: `YouTube Sans` (available via CDN) or `Roboto` fallback
- Thumbnails with a 16:9 aspect ratio and `border-radius: 8px`
- Responsive layout: 2 cols mobile, 3 cols tablet, 4 cols desktop

### 4. Popup (`popup/popup.html`)

Simple: shows the per-category video count and a link to open the new tab page.

---

## manifest.json (reference)

```json
{
  "manifest_version": 3,
  "name": "MyTube",
  "version": "1.0.0",
  "description": "Sua home do YouTube curada por você",
  "permissions": ["storage", "tabs", "activeTab"],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": "icons/icon48.png"
  },
  "chrome_url_overrides": {
    "newtab": "newtab/index.html"
  },
  "content_scripts": [
    {
      "matches": ["https://www.youtube.com/*"],
      "js": ["content/content.js"],
      "run_at": "document_idle"
    }
  ],
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  }
}
```

---

## Suggested implementation order

1. Project setup: `npm create vite@latest` + CRXJS + Tailwind
2. `manifest.json` with the complete structure
3. Service worker with all messages and storage
4. Content script with MutationObserver and the save button
5. New Tab Page — category structure + card grid
6. Drag and drop (dnd-kit)
7. Context menus (move, mark, delete)
8. Popup with the summary
9. Visual polish (animations, transitions, empty states)

---

## Important states to handle

- **Empty home:** a welcome screen explaining how to use it ("Navegue pelo YouTube e clique em + nos vídeos para salvá-los aqui")
- **Category empty after removing videos:** a subtle placeholder
- **Video already saved:** the content-script button shows "✓ Salvo" instead of "+ Salvar", with a tooltip indicating the category
- **Storage full:** `chrome.storage.sync` has a 100KB limit — warn when getting close (monitor `chrome.storage.sync.getBytesInUse`)
- **YouTube changes the DOM:** the MutationObserver must be robust to a selector not being found (try/catch per card)

---

## No need to implement now

- YouTube Data API integration (thumbnails and titles already come from the DOM)
- Authentication / backend
- Cross-browser sync (Firefox, etc.)
- Import/export the video list (leave as roadmap)
