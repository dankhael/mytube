// The confirm flow behind a category's Delete action, apart from App.tsx so each
// branch is testable without rendering the home. `confirm` is injected for the
// same reason; the home passes window.confirm.

import { categoryLabel } from '../src/category-label'
import { Language, t } from '../src/i18n'
import { Category, UNCATEGORIZED } from '../src/types'

export interface CategoryDeleteChoice {
  deleteVideos: boolean
}

export type ConfirmDialog = (message: string) => boolean

function askDeleteWithVideos(
  name: string,
  count: number,
  lang: Language,
  confirm: ConfirmDialog,
): boolean {
  // Two-step confirm: keep videos (move to the uncategorized bucket) or
  // delete them too. {uncategorized} is the real category the reducer moves
  // orphans into (UNCATEGORIZED), so the dialog names the actual destination.
  const uncategorized = categoryLabel(UNCATEGORIZED, lang)
  return confirm(t('cat.confirmDeleteWithVideos', lang, { name, count, uncategorized }))
}

/**
 * Asks how to delete `category`; null means the user backed out.
 * @example askCategoryDelete(category, 3, 'en', (m) => window.confirm(m)) // { deleteVideos: true }
 */
export function askCategoryDelete(
  category: Category,
  count: number,
  lang: Language,
  confirm: ConfirmDialog,
): CategoryDeleteChoice | null {
  const name = categoryLabel(category.name, lang)
  if (count === 0) {
    return confirm(t('cat.confirmDelete', lang, { name })) ? { deleteVideos: false } : null
  }
  // The bucket can't move videos into itself, so "keep them" isn't an option and
  // Cancel has to mean abort (CATDEL-7).
  if (category.name === UNCATEGORIZED) {
    const message = t('cat.confirmDeleteBucket', lang, { name, count })
    return confirm(message) ? { deleteVideos: true } : null
  }
  return { deleteVideos: askDeleteWithVideos(name, count, lang, confirm) }
}
