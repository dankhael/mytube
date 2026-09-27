import { describe, expect, it } from 'vitest'
import { PROMO_BOARDS } from './boards-promo.mjs'
import { SHOT_BOARDS } from './boards-shots.mjs'
import { VIDEO_BOARDS } from './boards-video.mjs'
import { FORMS_BOARDS } from './boards-forms.mjs'
import { COPY } from './copy.mjs'
import { CAPTURE_LOCALES } from './locales.mjs'

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

  // YouTube's recommended thumbnail size (16:9, ≥ 640 wide, under 2 MB).
  it('renders the video thumbnail at 1280×720 and the vertical cover at 1080×1920', () => {
    expect(VIDEO_BOARDS.map((board) => board.size)).toEqual([
      { width: 1280, height: 720 },
      { width: 1080, height: 1920 },
    ])
  })

  // Google Forms' recommended header: 1600×400 (4:1).
  it('renders the support form header at 1600×400', () => {
    expect(FORMS_BOARDS.map((board) => board.size)).toEqual([{ width: 1600, height: 400 }])
  })
})

// Walks a copy tree into dotted key paths, with array lengths, so two
// languages can be compared shape-for-shape.
function keyPaths(node, prefix = '') {
  if (Array.isArray(node)) return [`${prefix}[${node.length}]`]
  if (typeof node !== 'object') return [prefix]
  return Object.entries(node).flatMap(([key, value]) => keyPaths(value, prefix ? `${prefix}.${key}` : key))
}

describe('store promo copy', () => {
  it('has the same keys and list lengths in every language', () => {
    const [base, ...others] = Object.values(COPY).map((tree) => keyPaths(tree).sort())
    for (const paths of others) expect(paths).toEqual(base)
  })

  it('has copy for every capture locale and vice versa', () => {
    expect(Object.keys(COPY).sort()).toEqual(Object.keys(CAPTURE_LOCALES).sort())
  })
})
