// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createToast } from './toast'

const toastNode = () => document.getElementById('mytube-toast')

afterEach(() => {
  toastNode()?.remove()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

// A hidden tab holds its animation frames until the user comes back; timers keep
// running. Frames queue here until the test says the tab is visible again.
class FakeHiddenTabFrames {
  private frames: FrameRequestCallback[] = []
  install(): void {
    vi.stubGlobal('requestAnimationFrame', (frame: FrameRequestCallback) => this.frames.push(frame))
  }
  returnToTab(): void {
    this.frames.splice(0).forEach((frame) => frame(0))
  }
}

describe('createToast', () => {
  it('shows the text in one reused element', () => {
    const show = createToast(() => false)
    show('Saved')
    show('Saved again')
    expect(document.querySelectorAll('#mytube-toast')).toHaveLength(1)
    expect(toastNode()?.textContent).toBe('Saved again')
  })

  // A playlist import is long enough for the user to switch tabs before it ends.
  it('regression: a toast fired in a hidden tab still dismisses after the user returns', () => {
    vi.useFakeTimers()
    const frames = new FakeHiddenTabFrames()
    frames.install()
    const show = createToast(() => false)

    show('Imported')
    vi.advanceTimersByTime(10_000)
    frames.returnToTab()
    expect(toastNode()?.classList.contains('mytube-toast--show')).toBe(true)

    vi.advanceTimersByTime(2_500)
    expect(toastNode()?.classList.contains('mytube-toast--show')).toBe(false)
  })

  it('regression: shows nothing once the script is torn down (M4)', () => {
    const show = createToast(() => true)
    show("Couldn't save this video. Try again.")
    expect(toastNode()).toBeNull()
  })
})
