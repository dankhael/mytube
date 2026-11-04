// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { createToast } from './toast'

const toastNode = () => document.getElementById('mytube-toast')

afterEach(() => toastNode()?.remove())

describe('createToast', () => {
  it('shows the text in one reused element', () => {
    const show = createToast(() => false)
    show('Saved')
    show('Saved again')
    expect(document.querySelectorAll('#mytube-toast')).toHaveLength(1)
    expect(toastNode()?.textContent).toBe('Saved again')
  })

  it('regression: shows nothing once the script is torn down (M4)', () => {
    const show = createToast(() => true)
    show("Couldn't save this video. Try again.")
    expect(toastNode()).toBeNull()
  })
})
