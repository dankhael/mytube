// Virtual camera for the vertical cut: picks, frame by frame, which slice of a
// landscape take to show. It follows the pointer trail recorded with the take
// (pointer.mjs), smoothed with a centered window so the pan starts a moment
// *before* the pointer moves — the camera anticipates instead of chasing.

// ±0.5 s at 30 fps; applied twice, the box blur approximates a gaussian ease.
const SMOOTH_RADIUS_FRAMES = 15

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

/**
 * Pointer x at take-time `t`: the latest trail point at or before it.
 * @example pointerXAt([{ t: 0, x: 10 }, { t: 1, x: 90 }], 0.5) // 10
 */
export function pointerXAt(trail, t) {
  if (trail.length === 0) throw new Error('pointer trail is empty; expected ≥1 {t, x, y} point')
  let x = trail[0].x
  for (const point of trail) {
    if (point.t > t) break
    x = point.x
  }
  return x
}

function boxBlur(values, radius) {
  return values.map((_, index) => {
    const from = Math.max(0, index - radius)
    const to = Math.min(values.length - 1, index + radius)
    let sum = 0
    for (let i = from; i <= to; i++) sum += values[i]
    return sum / (to - from + 1)
  })
}

/**
 * Left edge of the crop for every output frame, keeping the pointer centered
 * when the edges allow it. `speed` maps output time back onto take time.
 * @example followCropXs(trail, { frames: 90, fps: 30, speed: 1, takeWidth: 1440, cropWidth: 960 })
 */
export function followCropXs(trail, { frames, fps, speed, takeWidth, cropWidth }) {
  const maxX = takeWidth - cropWidth
  const targets = Array.from({ length: frames }, (_, frame) =>
    clamp(pointerXAt(trail, (frame / fps) * speed) - cropWidth / 2, 0, maxX),
  )
  const smooth = boxBlur(boxBlur(targets, SMOOTH_RADIUS_FRAMES), SMOOTH_RADIUS_FRAMES)
  return smooth.map((x) => Math.round(clamp(x, 0, maxX)))
}

/**
 * ffmpeg `sendcmd` script that moves the crop named `crop@follow` to each x.
 * @example sendcmdScript([0, 4], 30) // '0.0000 crop@follow x 0;\n0.0333 crop@follow x 4;'
 */
export function sendcmdScript(xs, fps) {
  return xs.map((x, frame) => `${(frame / fps).toFixed(4)} crop@follow x ${x};`).join('\n')
}

/**
 * Static crop x for a zoomed scene: where the focus box's center lands once the
 * eased zoom (compose.mjs zoomFilter) has settled, centered in the crop.
 * @example focusCropX({ x: 20, y: 800, width: 400, height: 40 }, 2.2, { takeWidth: 1440, cropWidth: 960 })
 */
export function focusCropX(box, zoom, { takeWidth, cropWidth }) {
  const center = box.x + box.width / 2
  const viewWidth = takeWidth / zoom
  const viewLeft = clamp(center - viewWidth / 2, 0, takeWidth - viewWidth)
  const onScreen = (center - viewLeft) * zoom
  return Math.round(clamp(onScreen - cropWidth / 2, 0, takeWidth - cropWidth))
}
