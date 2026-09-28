// Display name of a category (spec localized-default-categories, DEFCAT-4). The
// stored `UNCATEGORIZED` key is the reducer's fallback bucket and never changes,
// so only its label follows the interface language; every other name is the
// user's own data and shows exactly as stored. Lives apart from src/i18n.ts
// because src/types.ts already imports i18n (importing types back would cycle).

import { t } from './i18n'
import { UNCATEGORIZED } from './types'

/**
 * The name to show for a stored category name in `lang`.
 * @example categoryLabel('Uncategorized', 'pt-BR') // 'Sem categoria'
 */
export function categoryLabel(name: string, lang: unknown): string {
  return name === UNCATEGORIZED ? t('category.uncategorized', lang) : name
}
