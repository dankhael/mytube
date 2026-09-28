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
})
