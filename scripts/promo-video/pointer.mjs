// Human-paced mouse for the recordings: moves along eased paths instead of
// teleporting. The visible arrow is page-overlay.mjs.

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
  const moveTo = async (x, y, ms = 650) => {
    for (const point of easedPath(at, { x, y }, ms)) {
      await page.mouse.move(point.x, point.y)
      await page.waitForTimeout(STEP_MS / 2)
    }
    at = { x, y }
  }
  // Re-aims once on arrival: YouTube lazy-loads content above a card, so the
  // target can shift during the glide and the click would land on a neighbor.
  const glide = async (locator, ms) => {
    const target = await centerOf(locator)
    await moveTo(target.x, target.y, ms)
    const settled = await centerOf(locator)
    if (Math.hypot(settled.x - target.x, settled.y - target.y) > 4) await moveTo(settled.x, settled.y, 180)
  }
  const click = async (locator, ms) => {
    await glide(locator, ms)
    await page.waitForTimeout(140)
    await page.mouse.down()
    await page.waitForTimeout(90)
    await page.mouse.up()
  }
  const park = () => page.mouse.move(at.x, at.y)
  // Viewport-relative move, for spots with no element to aim at.
  const moveToShare = (xShare, yShare, ms) => {
    const { width, height } = page.viewportSize()
    return moveTo(width * xShare, height * yShare, ms)
  }
  return { moveTo, moveToShare, glide, click, park }
}
