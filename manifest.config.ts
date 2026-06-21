import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'
import { AVATAR_HOSTS } from './src/validate-message'

// Same hosts the worker allowlists for channel avatars (channel-avatar): the CSP
// must permit them or the new-tab <img> can't load the saved photo.
const avatarImgSrc = AVATAR_HOSTS.map((host) => `https://${host}`).join(' ')

export default defineManifest({
  manifest_version: 3,
  name: 'MyTube',
  version: pkg.version,
  description: 'Sua home do YouTube curada por você',
  // chrome.tabs.create needs no permission; 'tabs'/'activeTab' were unused and
  // triggered the "Read your browsing history" install warning (finding S1).
  permissions: ['storage'],
  host_permissions: ['https://www.youtube.com/*'],
  // Explicit least-privilege CSP for extension pages (finding S5): ytimg for
  // thumbnails, the allowlisted Google hosts for saved channel avatars
  // (channel-avatar), www.youtube.com for the worker's oEmbed fetch, fonts
  // vendored locally (S4). 'unsafe-inline' stays in style-src because
  // React/dnd-kit set inline style attributes for drag transforms. data: in
  // img-src is the inline SVG favicon the new-tab page generates from the accent
  // (THEME-10) — images only, no script vector.
  content_security_policy: {
    extension_pages: [
      "default-src 'self'",
      `img-src 'self' https://i.ytimg.com ${avatarImgSrc} data:`,
      'connect-src https://www.youtube.com',
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "object-src 'none'",
    ].join('; '),
  },
  action: {
    default_popup: 'popup/popup.html',
    default_icon: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
    },
  },
  icons: {
    '16': 'icons/icon16.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png',
  },
  // The curated home is a normal packaged page opened on demand (popup button or
  // the open_home shortcut), NOT a new-tab override: overriding newtab hijacks
  // every new tab and triggers Chrome's un-suppressable "keep this page?" consent
  // prompt, which scares users off at install. See src/home-page.ts.
  commands: {
    // Key must stay in sync with OPEN_HOME_COMMAND in src/home-page.ts (the
    // worker's onCommand match and the popup's shortcut lookup use that constant).
    open_home: {
      suggested_key: { default: 'Ctrl+Shift+Y', mac: 'Command+Shift+Y' },
      description: 'Open the MyTube home',
    },
  },
  content_scripts: [
    {
      matches: ['https://www.youtube.com/*'],
      js: ['content/content.ts'],
      run_at: 'document_idle',
    },
  ],
  background: {
    service_worker: 'background/service-worker.ts',
    type: 'module',
  },
})
