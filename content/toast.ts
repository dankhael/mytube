// Transient, non-blocking confirmation toast. A single reused element is
// appended lazily; re-firing resets the auto-dismiss timer (spec SALVAR-TOAST).

const TOAST_ID = 'mytube-toast'
const VISIBLE_MS = 2500

function toastElement(): HTMLElement {
  const existing = document.getElementById(TOAST_ID)
  if (existing) return existing
  const toast = document.createElement('div')
  toast.id = TOAST_ID
  toast.className = 'mytube-toast'
  document.documentElement.appendChild(toast)
  return toast
}

/**
 * Builds the page's toast function. It stays silent once `isTornDown` is true: an
 * orphaned script must leave no UI behind (M4), and every failure path that reports
 * through a toast runs right after the teardown that removed the old one.
 * @example const showToast = createToast(() => torndown); showToast('Saved')
 */
export function createToast(isTornDown: () => boolean): (text: string) => void {
  let timer: number | undefined
  return (text) => {
    if (isTornDown()) return
    const toast = toastElement()
    toast.textContent = text
    // The timer starts with the frame that shows the toast. A hidden tab holds its
    // frames but not its timers, so a timer started here would expire first and the
    // late frame would show a toast nothing ever hides.
    requestAnimationFrame(() => {
      toast.classList.add('mytube-toast--show')
      window.clearTimeout(timer)
      timer = window.setTimeout(() => toast.classList.remove('mytube-toast--show'), VISIBLE_MS)
    })
  }
}
