// design-rework.spec — the token layer (DR-THEME-2/3). Reads the stylesheets
// and components as text: these are properties of the source, not of pixels.
// DR-THEME-1 (re-theming the whole UI from --accent-h) is visual — Manual acceptance.

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

// Every stylesheet, component and config the extension's own UI is built from.
function uiSources(): string[] {
  const dirs = ['newtab', 'popup', 'styles', 'content']
  const files = dirs.flatMap((dir) =>
    readdirSync(join(root, dir), { recursive: true })
      .map(String)
      .filter((file) => /\.(css|ts|tsx|html)$/.test(file) && !file.includes('.test.'))
      .map((file) => join(dir, file)),
  )
  return [...files, 'tailwind.config.js']
}

describe('design-rework.spec (tokens)', () => {
  it('DR-THEME-2: the accent presets are documented as hue values next to --accent-h', () => {
    const tokens = read('styles/theme-tokens.css')
    expect(tokens).toMatch(/Presets:\s*Mint 168 · Red 25 · Violet 290 · Amber 64/)
    expect(tokens).toMatch(/--accent-h:\s*\d+;/)
  })

  it('DR-THEME-3: no hard-coded YouTube red (#ff0000) remains in the UI sources', () => {
    const offenders = uiSources().filter((file) => /#ff0000|#f00\b/i.test(read(file)))
    expect(offenders).toEqual([])
  })
})
