import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Separate from vite.config.ts on purpose: tests run in Node/jsdom and must NOT
// load the CRXJS plugin (which expects a manifest/extension build).
// - src/**/*.test.ts   → pure reducer specs (Node)
// - newtab/**/*.test.tsx → React component specs (jsdom, via per-file docblock)
// - newtab/**/*.test.ts  → static HTML specs (Node, e.g. tab title/favicon)
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'newtab/**/*.test.tsx', 'newtab/**/*.test.ts', 'popup/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
    // The default 'forks' pool is broken under vite 8 + vitest 4 on Windows: every
    // suite dies before collection with "Cannot read properties of undefined
    // (reading 'config')" / "failed to find the current suite". The 'threads' pool
    // runs the same suite green (and faster). Cross-platform safe, so pinned here.
    pool: 'threads',
  },
})
