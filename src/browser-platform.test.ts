import { afterEach, expect, it, vi } from 'vitest'

// A named native seam also verifies that methods retain their owning receiver.
class FakeNativeSync {
  constructor(private readonly title: string) {}
  async get(): Promise<Record<string, unknown>> {
    return { title: this.title }
  }
}

class FakeNativeBrowser {
  readonly storage: { sync: FakeNativeSync; onChanged: object }
  readonly runtime = {}
  readonly tabs = {}
  readonly commands = {}
  readonly action = {}
  constructor(title: string) {
    this.storage = { sync: new FakeNativeSync(title), onChanged: {} }
  }
}

afterEach(() => vi.unstubAllGlobals())

it('imports without Chrome and resolves the current native runtime lazily', async () => {
  vi.stubGlobal('chrome', undefined)
  vi.resetModules()
  const { browserPlatform } = await import('./browser-platform')
  const first = new FakeNativeBrowser('first profile')
  vi.stubGlobal('chrome', first)
  const adapter = browserPlatform()
  expect(await adapter.sync.get(null)).toEqual({ title: 'first profile' })
  expect(adapter.storageChanges).toBe(first.storage.onChanged)
  expect(adapter.runtime).toBe(first.runtime)
  expect(adapter.tabs).toBe(first.tabs)
  expect(adapter.commands).toBe(first.commands)
  expect(adapter.action).toBe(first.action)
  expect(adapter.shortcutSettingsUrl).toBe('chrome://extensions/shortcuts')

  vi.stubGlobal('chrome', new FakeNativeBrowser('replacement profile'))
  expect(await browserPlatform().sync.get(null)).toEqual({ title: 'replacement profile' })
})
