// THEME-11 (theme-color.spec): the worker recolors the toolbar icon to the
// accent. The worker wires this to startup and storage changes; here the paint
// itself is driven with a fake toolbar.

import { describe, expect, it } from 'vitest'
import { ACTION_ICON_SIZES, createActionIconPainter } from './action-icon'

// Stands in for chrome.action + the OffscreenCanvas rasterizer; records calls.
class FakeToolbar {
  rendered: string[] = []
  painted: Record<number, string>[] = []
  failNextRasterize = false
  private held = new Map<string, Promise<void>>()

  holdRasterize(accent: string, gate: Promise<void>): void {
    this.held.set(accent, gate)
  }

  deps() {
    return {
      renderSvg: (accent: string) => {
        this.rendered.push(accent)
        return `<svg data-accent="${accent}"/>`
      },
      rasterize: async (svg: string, size: number) => {
        if (this.failNextRasterize) {
          this.failNextRasterize = false
          throw new Error('OffscreenCanvas unavailable')
        }
        for (const [accent, gate] of this.held) if (svg.includes(accent)) await gate
        return `${svg}@${size}`
      },
      setIcon: async ({ imageData }: { imageData: Record<number, string> }) => {
        this.painted.push(imageData)
      },
    }
  }
}

describe('theme-color.spec (toolbar icon)', () => {
  it('THEME-11: paints the accent mark at every action size', async () => {
    const toolbar = new FakeToolbar()
    await createActionIconPainter(toolbar.deps())('mint')
    expect(toolbar.painted).toHaveLength(1)
    expect(Object.keys(toolbar.painted[0]).map(Number)).toEqual([...ACTION_ICON_SIZES])
    expect(toolbar.painted[0][16]).toBe('<svg data-accent="mint"/>@16')
  })

  it('THEME-11: an unchanged accent skips the repaint; a new one repaints', async () => {
    const toolbar = new FakeToolbar()
    const paint = createActionIconPainter(toolbar.deps())
    await paint('mint')
    await paint('mint') // e.g. a storage change from saving a video
    await paint('amber')
    expect(toolbar.rendered).toEqual(['mint', 'amber'])
    expect(toolbar.painted).toHaveLength(2)
  })

  it('THEME-11: a failed rasterize leaves the icon alone and retries on the next call', async () => {
    const toolbar = new FakeToolbar()
    const paint = createActionIconPainter(toolbar.deps())
    toolbar.failNextRasterize = true
    await expect(paint('pink')).resolves.toBeUndefined()
    expect(toolbar.painted).toHaveLength(0)
    await paint('pink')
    expect(toolbar.painted).toHaveLength(1)
  })

  // storage.onChanged starts a paint per event and nothing orders them, so the
  // last one to finish won even when it carried the older accent.
  it('regression: a slow paint of an older accent does not overwrite a newer one', async () => {
    const toolbar = new FakeToolbar()
    let release!: () => void
    toolbar.holdRasterize('mint', new Promise<void>((resolve) => (release = resolve)))
    const paint = createActionIconPainter(toolbar.deps())

    const older = paint('mint')
    await paint('rose')
    release()
    await older

    expect(toolbar.painted).toHaveLength(1)
    expect(toolbar.painted[0][16]).toContain('rose')
  })

  it('regression: going back to the painted accent cancels a paint still in flight', async () => {
    const toolbar = new FakeToolbar()
    const paint = createActionIconPainter(toolbar.deps())
    await paint('mint')
    let release!: () => void
    toolbar.holdRasterize('rose', new Promise<void>((resolve) => (release = resolve)))

    const abandoned = paint('rose')
    await paint('mint')
    release()
    await abandoned

    expect(toolbar.painted).toHaveLength(1)
    expect(toolbar.painted[0][16]).toContain('mint')
  })
})
