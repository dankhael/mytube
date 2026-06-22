// playClick specs (Node). The injected player lets us assert without real audio.

import { describe, expect, it, vi, type Mock } from 'vitest'
import { playClick, ClickPlayer } from './sound'

// vitest 4 types vi.fn() as Mock<Procedure | Constructable>, which no longer
// satisfies ClickPlayer's `() => void` — pin the signature explicitly.
function fakePlayer(): ClickPlayer & { play: Mock<() => void> } {
  return { play: vi.fn<() => void>() }
}

describe('popup-config.spec (sound)', () => {
  it('CFG-4: plays the click when sound effects are on', () => {
    const player = fakePlayer()
    playClick(
      { soundEffects: true, accent: 'violet', language: 'en', openHomeOnStartup: false, remindOnYoutubeHome: false },
      player,
    )
    expect(player.play).toHaveBeenCalledOnce()
  })

  it('CFG-5: stays silent when sound effects are off', () => {
    const player = fakePlayer()
    playClick(
      { soundEffects: false, accent: 'violet', language: 'en', openHomeOnStartup: false, remindOnYoutubeHome: false },
      player,
    )
    expect(player.play).not.toHaveBeenCalled()
  })
})
