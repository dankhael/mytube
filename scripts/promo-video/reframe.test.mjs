import { describe, expect, it } from 'vitest'
import { focusCropX, followCropXs, pointerXAt, sendcmdScript } from './reframe.mjs'

const TAKE = { takeWidth: 1440, cropWidth: 960 }

describe('pointerXAt', () => {
  it('holds the latest point at or before t', () => {
    const trail = [
      { t: 0, x: 10, y: 0 },
      { t: 1, x: 90, y: 0 },
    ]
    expect(pointerXAt(trail, 0.5)).toBe(10)
    expect(pointerXAt(trail, 1)).toBe(90)
    expect(pointerXAt(trail, 5)).toBe(90)
  })

  it('rejects an empty trail with the expected shape in the message', () => {
    expect(() => pointerXAt([], 0)).toThrow(/expected ≥1 \{t, x, y\} point/)
  })
})

describe('followCropXs', () => {
  it('centers a still pointer and returns one x per frame', () => {
    const xs = followCropXs([{ t: 0, x: 720, y: 0 }], { frames: 30, fps: 30, speed: 1, ...TAKE })
    expect(xs).toHaveLength(30)
    expect(new Set(xs)).toEqual(new Set([240]))
  })

  it('clamps to the take edges when the pointer hugs a side', () => {
    const left = followCropXs([{ t: 0, x: 5, y: 0 }], { frames: 5, fps: 30, speed: 1, ...TAKE })
    const right = followCropXs([{ t: 0, x: 1435, y: 0 }], { frames: 5, fps: 30, speed: 1, ...TAKE })
    expect(left.every((x) => x === 0)).toBe(true)
    expect(right.every((x) => x === 480)).toBe(true)
  })

  it('eases across a jump instead of cutting, starting before the jump', () => {
    const trail = [
      { t: 0, x: 0, y: 0 },
      { t: 2, x: 1440, y: 0 },
    ]
    const xs = followCropXs(trail, { frames: 120, fps: 30, speed: 1, ...TAKE })
    expect(xs[0]).toBe(0)
    expect(xs[119]).toBe(480)
    expect(xs[55]).toBeGreaterThan(0) // anticipates the move at frame 60
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThanOrEqual(xs[i - 1])
  })

  it('maps output time through speed onto take time', () => {
    const trail = [
      { t: 0, x: 0, y: 0 },
      { t: 2, x: 1440, y: 0 },
    ]
    const normal = followCropXs(trail, { frames: 90, fps: 30, speed: 1, ...TAKE })
    const doubled = followCropXs(trail, { frames: 90, fps: 30, speed: 2, ...TAKE })
    expect(doubled[45]).toBeGreaterThan(normal[45])
  })
})

describe('sendcmdScript', () => {
  it('emits one timed crop command per frame', () => {
    expect(sendcmdScript([0, 4], 30)).toBe('0.0000 crop@follow x 0;\n0.0333 crop@follow x 4;')
  })
})

describe('focusCropX', () => {
  it('keeps a bottom-left box in shot once zoomed', () => {
    const box = { x: 20, y: 820, width: 460, height: 36 }
    const x = focusCropX(box, 2.2, TAKE)
    const onScreenCenter = (box.x + box.width / 2) * 2.2
    expect(onScreenCenter - x).toBeGreaterThanOrEqual(0)
    expect(onScreenCenter - x).toBeLessThanOrEqual(960)
  })

  it('centers a mid-frame box exactly', () => {
    expect(focusCropX({ x: 700, y: 400, width: 40, height: 40 }, 2, TAKE)).toBe(240)
  })
})
