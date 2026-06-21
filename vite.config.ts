import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config'

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
  build: {
    rollupOptions: {
      // CRXJS only builds HTML pages the manifest references. The curated home is
      // no longer a new-tab override (see manifest.config.ts), so it isn't a
      // manifest page — register it here explicitly or it won't be emitted to
      // dist/ and the open-home action 404s (ERR_FILE_NOT_FOUND).
      input: {
        newtab: 'newtab/index.html',
      },
    },
  },
})
