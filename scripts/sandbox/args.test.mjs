import { describe, expect, it } from 'vitest'
import { sandboxArgs } from './args.mjs'

describe('sandbox args', () => {
  it('isolates the profile and loads only the built extension', () => {
    const args = sandboxArgs('/repo/dist', '/repo/.sandbox-profile', 'https://www.youtube.com/')
    expect(args).toContain('--user-data-dir=/repo/.sandbox-profile')
    expect(args).toContain('--disable-extensions-except=/repo/dist')
    expect(args).toContain('--load-extension=/repo/dist')
    expect(args.at(-1)).toBe('https://www.youtube.com/')
  })
})
