// Satisfying click sound, synthesized with the Web Audio API (no binary assets).
// The player is created lazily on first use (an AudioContext needs a user gesture).

import { Settings } from '../src/types'

export interface ClickPlayer {
  play(): void
}

// A short, soft "blip": a sine that drops in pitch with a quick percussive decay.
export function createClickPlayer(): ClickPlayer {
  let ctx: AudioContext | null = null
  return {
    play() {
      try {
        const Ctor =
          window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!Ctor) return
        ctx ??= new Ctor()
        if (ctx.state === 'suspended') void ctx.resume()

        const now = ctx.currentTime
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(440, now)
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.08)
        gain.gain.setValueAtTime(0.0001, now)
        gain.gain.exponentialRampToValueAtTime(0.16, now + 0.012)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13)
        osc.connect(gain).connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.14)
      } catch {
        // Audio unavailable — never let a sound break the UI.
      }
    },
  }
}

// Plays only when the user enabled sound. Player is injected so tests can assert
// without real audio.
export function playClick(settings: Settings, player: ClickPlayer): void {
  if (!settings.soundEffects) return
  player.play()
}
