import { DEFAULT_LANGUAGE, type Language, t } from '../src/i18n'

/** Persistent, accessible error with an explicit retry; replaces an older error. */
export function showPopupError(
  retry: () => void, language: Language = DEFAULT_LANGUAGE, kind: 'load' | 'save' = 'load',
): void {
  document.getElementById('popup-error')?.remove()
  const alert = document.createElement('div')
  alert.id = 'popup-error'
  alert.setAttribute('role', 'alert')
  alert.style.padding = '12px'
  const text = document.createElement('p')
  text.textContent = t(kind === 'load' ? 'common.loadFailed' : 'common.saveFailed', language)
  const button = document.createElement('button')
  button.textContent = t('common.retry', language)
  button.addEventListener('click', retry)
  alert.append(text, button)
  document.body.appendChild(alert)
}
