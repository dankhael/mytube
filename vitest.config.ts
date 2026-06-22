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
    // Run suites serially. On vite 8 + vitest 4 (Windows, Node 22.22) parallel
    // worker startup races and whole suites die before collection with "Cannot
    // read properties of undefined (reading 'config')" / "failed to find the
    // current suite" — flakily, regardless of the pool (threads/forks/vmThreads
    // each pass a single file but fail the full parallel run). Serial startup is
    // deterministic and green; the suite is small (~13s), so the cost is fine.
    fileParallelism: false,
  },
})
