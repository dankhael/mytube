// playClick specs (Node). The injected player lets us assert without real audio.

import { describe, expect, it, vi } from 'vitest'
import { playClick, ClickPlayer } from './sound'

function fakePlayer(): ClickPlayer & { play: ReturnType<typeof vi.fn> } {
  return { play: vi.fn() }
}

describe('popup-config.spec (sound)', () => {
  it('CFG-4: plays the click when sound effects are on', () => {
    const player = fakePlayer()
    playClick({ soundEffects: true }, player)
    expect(player.play).toHaveBeenCalledOnce()
  })

  it('CFG-5: stays silent when sound effects are off', () => {
    const player = fakePlayer()
    playClick({ soundEffects: false }, player)
    expect(player.play).not.toHaveBeenCalled()
  })
})
