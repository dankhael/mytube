import { describe, expect, it } from 'vitest'
import { PROMO_BOARDS } from './boards-promo.mjs'
import { SHOT_BOARDS } from './boards-shots.mjs'

// Chrome Web Store image rules: screenshots 1280×800 (or 640×400), at most 5;
// small promo tile 440×280; marquee 1400×560.
describe('store promo boards', () => {
  it('ships at most five screenshots, all 1280×800', () => {
    expect(SHOT_BOARDS.length).toBeLessThanOrEqual(5)
    for (const board of SHOT_BOARDS) expect(board.size).toEqual({ width: 1280, height: 800 })
  })

  it('ships the small tile at 440×280 and the marquee at 1400×560', () => {
    expect(PROMO_BOARDS.map((board) => board.size)).toEqual([
      { width: 440, height: 280 },
      { width: 1400, height: 560 },
    ])
  })

  it('names every file with its own size and never twice', () => {
    const boards = [...SHOT_BOARDS, ...PROMO_BOARDS]
    for (const { file, size } of boards) expect(file).toContain(`${size.width}x${size.height}`)
    expect(new Set(boards.map((board) => board.file)).size).toBe(boards.length)
  })
})
