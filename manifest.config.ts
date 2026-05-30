import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: 'MyTube',
  version: pkg.version,
  description: 'Sua home do YouTube curada por você',
  permissions: ['storage', 'tabs', 'activeTab'],
  host_permissions: ['https://www.youtube.com/*'],
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
  chrome_url_overrides: {
    newtab: 'newtab/index.html',
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
