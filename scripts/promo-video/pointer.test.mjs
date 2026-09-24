import { describe, expect, it } from 'vitest'
import { easedPath, trailSince } from './pointer.mjs'

describe('easedPath', () => {
  it('takes one step per 16 ms and lands exactly on the target', () => {
    const path = easedPath({ x: 0, y: 0 }, { x: 100, y: 40 }, 160)
    expect(path).toHaveLength(10)
    expect(path.at(-1)).toEqual({ x: 100, y: 40 })
  })

  it('eases: slow at both ends, fast in the middle', () => {
    const xs = easedPath({ x: 0, y: 0 }, { x: 100, y: 0 }, 160).map((point) => point.x)
    const deltas = xs.map((x, i) => x - (xs[i - 1] ?? 0))
    expect(deltas[4]).toBeGreaterThan(deltas[0])
    expect(deltas[4]).toBeGreaterThan(deltas[9])
  })

  it('still moves in one step for a zero-length duration', () => {
    expect(easedPath({ x: 0, y: 0 }, { x: 5, y: 5 }, 0)).toEqual([{ x: 5, y: 5 }])
  })
})

describe('trailSince', () => {
  it('re-bases to seconds and rounds to whole pixels', () => {
    expect(trailSince([{ ms: 1500, x: 10.4, y: 2.6 }], 1000)).toEqual([{ t: 0.5, x: 10, y: 3 }])
  })

  it('collapses points from before the take onto t = 0', () => {
    expect(trailSince([{ ms: 900, x: 1, y: 1 }], 1000)[0].t).toBe(0)
  })
})
