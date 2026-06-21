// Non-blocking error toast (finding R3, ROB-10): a mutation that did not
// persist must be visible, not silently dropped. role="alert" so assistive
// tech announces it; auto-dismisses but stays closable by hand.

import { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useT } from '../i18n-context'

const AUTO_DISMISS_MS = 6_000

interface ErrorToastProps {
  message: string
  onDismiss: () => void
}

export default function ErrorToast({ message, onDismiss }: ErrorToastProps) {
  const tr = useT()
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div
      role="alert"
      className="fixed bottom-6 right-6 z-50 flex max-w-md items-center gap-3 rounded-xl border border-red-500/40 bg-red-950/90 px-4 py-3 text-sm text-red-200 shadow-lg"
    >
      <AlertTriangle className="h-4 w-4 flex-none" />
      <span>
        {tr('toast.notSaved')} <span className="text-red-300/80">{message}</span>
      </span>
      <button aria-label={tr('toast.dismiss')} className="flex-none text-red-300/80" onClick={onDismiss}>
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
