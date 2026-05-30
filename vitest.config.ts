import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Separate from vite.config.ts on purpose: tests run in Node/jsdom and must NOT
// load the CRXJS plugin (which expects a manifest/extension build).
// - src/**/*.test.ts   → pure reducer specs (Node)
// - newtab/**/*.test.tsx → React component specs (jsdom, via per-file docblock)
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'newtab/**/*.test.tsx'],
    setupFiles: ['./test/setup.ts'],
  },
})
