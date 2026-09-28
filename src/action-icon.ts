// Recolors the toolbar action icon to the chosen accent (THEME-11). Pulled out
// of the service worker, which touches chrome.* at module load, so the paint
// logic is unit-testable: rendering, rasterizing and setIcon are injected.

export const ACTION_ICON_SIZES = [16, 32, 48] as const

export interface ActionIconDeps<Image> {
  renderSvg: (accent: string) => string // the accent-colored mark (src/logo-svg.ts)
  rasterize: (svg: string, size: number) => Promise<Image> // OffscreenCanvas in the worker
  setIcon: (details: { imageData: Record<number, Image> }) => Promise<void> // chrome.action.setIcon
}

/**
 * Returns `paint(accent)`, which repaints the action icon when the accent
 * changed since the last successful paint and is a no-op otherwise (a storage
 * change that didn't touch the accent skips the rasterize). Best-effort: if
 * rendering fails, the manifest PNG stays and the next call retries.
 * @example
 *   const paint = createActionIconPainter({ renderSvg: accentLogoSvg, rasterize, setIcon: (d) => chrome.action.setIcon(d) })
 *   await paint('mint')
 */
export function createActionIconPainter<Image>(
  deps: ActionIconDeps<Image>,
): (accent: string) => Promise<void> {
  let paintedAccent: string | null = null
  return async (accent) => {
    if (accent === paintedAccent) return
    try {
      const svg = deps.renderSvg(accent)
      const imageData: Record<number, Image> = {}
      for (const size of ACTION_ICON_SIZES) imageData[size] = await deps.rasterize(svg, size)
      await deps.setIcon({ imageData })
      paintedAccent = accent
    } catch {
      // Leave the manifest default icon if the canvas/bitmap path is unavailable.
    }
  }
}
