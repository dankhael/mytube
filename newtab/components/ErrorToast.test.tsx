// @vitest-environment jsdom
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ErrorToast from './ErrorToast'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('ErrorToast', () => {
  it('auto-dismisses after six seconds', () => {
    const onDismiss = vi.fn()
    render(<ErrorToast message="quota" onDismiss={onDismiss} />)
    act(() => void vi.advanceTimersByTime(6_000))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  // App passes a new inline onDismiss on every render, so typing in the search
  // kept restarting the timer and the toast never left.
  it('regression: re-rendering with a new callback does not restart the timer', () => {
    const latest = vi.fn()
    const { rerender } = render(<ErrorToast message="quota" onDismiss={vi.fn()} />)
    act(() => void vi.advanceTimersByTime(5_000))
    rerender(<ErrorToast message="quota" onDismiss={latest} />)
    act(() => void vi.advanceTimersByTime(1_000))
    expect(latest).toHaveBeenCalledOnce()
  })

  it('a different error gets its full time on screen', () => {
    const onDismiss = vi.fn()
    const { rerender } = render(<ErrorToast message="quota" onDismiss={onDismiss} />)
    act(() => void vi.advanceTimersByTime(5_000))
    rerender(<ErrorToast message="offline" onDismiss={onDismiss} />)
    act(() => void vi.advanceTimersByTime(5_000))
    expect(onDismiss).not.toHaveBeenCalled()
  })
})
