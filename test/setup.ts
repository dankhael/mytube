// Vitest setup shared by every test file. Provides the minimal browser/extension
// globals the new-tab React page reaches for. Reducer (Node) tests ignore these.

import { vi } from 'vitest'

// A minimal chrome API surface. Component tests override `sendMessage` per case
// to script the responses they need.
const chromeMock = {
  runtime: {
    sendMessage: vi.fn(),
    lastError: undefined as { message?: string } | undefined,
  },
  storage: {
    sync: { getBytesInUse: vi.fn().mockResolvedValue(0) },
    onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
  },
}
;(globalThis as unknown as { chrome: typeof chromeMock }).chrome ??= chromeMock

// jsdom doesn't ship these; dnd-kit and other libs probe for them at render time.
if (typeof window !== 'undefined') {
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  }
}
