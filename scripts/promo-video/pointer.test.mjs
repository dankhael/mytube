import { describe, expect, it } from 'vitest'
import { easedPath } from './pointer.mjs'

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
