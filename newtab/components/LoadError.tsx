import { AlertTriangle } from 'lucide-react'
import { DEFAULT_LANGUAGE, type Language, t } from '../../src/i18n'
import RecoveryTools from './RecoveryTools'

interface LoadErrorProps {
  onRetry: () => void
  language?: Language
}

// Shared by the initial-load and stale-library states; the action retries a read.
// Retry alone never gets out of a blocked library, so the way out sits next to it.
export default function LoadError({ onRetry, language = DEFAULT_LANGUAGE }: LoadErrorProps) {
  return (
    <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      <AlertTriangle aria-hidden="true" className="h-4 w-4 flex-none" />
      <p>{t('common.loadFailed', language)}</p>
      <button className="flex-none rounded-md border border-red-400/40 px-3 py-1 hover:bg-red-500/20 focus-visible:outline focus-visible:outline-2" onClick={onRetry}>
        {t('common.retry', language)}
      </button>
      <RecoveryTools language={language} />
    </div>
  )
}
