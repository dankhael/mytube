// Human-paced mouse for the recordings: moves along eased paths instead of
// teleporting, and keeps a wall-clock trail of every step so the vertical cut
// can pan with it (reframe.mjs). The visible arrow is page-overlay.mjs.

const STEP_MS = 16

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

/**
 * Points of an eased move from `from` to `to`, one per ~STEP_MS of `ms`,
 * ending exactly on `to`.
 * @example easedPath({ x: 0, y: 0 }, { x: 100, y: 0 }, 32) // [{ x: 50, y: 0 }, { x: 100, y: 0 }]
 */
export function easedPath(from, to, ms) {
  const steps = Math.max(1, Math.round(ms / STEP_MS))
  return Array.from({ length: steps }, (_, index) => {
    const t = easeInOut((index + 1) / steps)
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }
  })
}

/**
 * Trail re-based to seconds since `startMs`, rounded to whole pixels; points
 * from before the take started collapse onto t = 0.
 * @example trailSince([{ ms: 1500, x: 10.4, y: 2 }], 1000) // [{ t: 0.5, x: 10, y: 2 }]
 */
export function trailSince(trail, startMs) {
  return trail.map(({ ms, x, y }) => ({
    t: Math.max(0, (ms - startMs) / 1000),
    x: Math.round(x),
    y: Math.round(y),
  }))
}

async function centerOf(locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error(`pointer target has no box (not visible?): ${locator}`)
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/**
 * Pointer bound to one page; remembers where it is so every glide starts from
 * the last spot.
 * @example
 *   const pointer = createPointer(page, { x: 1000, y: 560 })
 *   await pointer.click(page.getByRole('button', { name: 'Save' }))
 */
export function createPointer(page, start) {
  let at = { ...start }
  const trail = [{ ms: Date.now(), ...at }]
  const moveTo = async (x, y, ms = 650) => {
    for (const point of easedPath(at, { x, y }, ms)) {
      await page.mouse.move(point.x, point.y)
      trail.push({ ms: Date.now(), ...point })
      await page.waitForTimeout(STEP_MS / 2)
    }
    at = { x, y }
  }
  const glide = async (locator, ms) => {
    const target = await centerOf(locator)
    await moveTo(target.x, target.y, ms)
  }
  const click = async (locator, ms) => {
    await glide(locator, ms)
    await page.waitForTimeout(140)
    await page.mouse.down()
    await page.waitForTimeout(90)
    await page.mouse.up()
  }
  const park = () => page.mouse.move(at.x, at.y)
  return { moveTo, glide, click, park, trailSince: (startMs) => trailSince(trail, startMs) }
}
