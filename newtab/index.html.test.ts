// Static specs for the new-tab document's tab identity (title + favicon).
// Each test names the acceptance-criterion ID it proves
// (see specs/newtab-tab-identity.spec.md). No browser: we read the source HTML
// as text and resolve the favicon href against the repo.

import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')
const html = readFileSync(resolve(here, 'index.html'), 'utf8')

// Pull the href of the <link rel="icon"> (rel may sit before or after href).
function faviconHref(markup: string): string | null {
  const link = markup.match(/<link\b[^>]*\brel=["']icon["'][^>]*>/i)?.[0]
  if (!link) return null
  return link.match(/\bhref=["']([^"']+)["']/i)?.[1] ?? null
}

describe('new-tab tab identity', () => {
  it('TAB-1: the <title> tag is exactly "MyTube"', () => {
    const title = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim()
    expect(title).toBe('MyTube')
  })

  it('TAB-2: a <link rel="icon"> points at an icon under /icons/', () => {
    const href = faviconHref(html)
    expect(href).toMatch(/^\/icons\/icon\d+\.png$/)
  })

  it('TAB-3: the favicon href resolves to a file that exists in icons/', () => {
    const href = faviconHref(html)
    expect(href, 'no <link rel="icon"> href found').toBeTruthy()
    // Strip the leading "/" (extension-root absolute) to resolve against the repo.
    const iconPath = resolve(repoRoot, (href as string).replace(/^\//, ''))
    expect(existsSync(iconPath), `broken favicon href: ${href}`).toBe(true)
  })
})
