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
    include: [
      'src/**/*.test.ts',
      'content/**/*.test.ts',
      'newtab/**/*.test.tsx',
      'newtab/**/*.test.ts',
      'popup/**/*.test.ts',
    ],
    setupFiles: ['./test/setup.ts'],
    // On vite 8 + vitest 4 (Windows, Node 22.22) the default worker pool dies
    // before collection with "Cannot read properties of undefined (reading
    // 'config')" / "failed to find the current suite" — every suite reports 0
    // tests. The `forks` pool starts each suite in its own child process and is
    // deterministically green here; `fileParallelism: false` keeps startup
    // serial so even the fork pool can't race. The suite is small (~14s), so the
    // cost is fine.
    pool: 'forks',
    fileParallelism: false,
  },
})
