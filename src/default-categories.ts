// Seeds the shipped default categories in the interface language on first
// install (spec localized-default-categories, DEFCAT-1…3). DEFAULT_DATA ships
// English names, so a pt-BR first run used to show "Tutorials" /
// "Entertainment" under a Portuguese UI. `Uncategorized` is never renamed — the
// reducer relies on it as the fallback bucket; it is display-mapped instead
// (categoryLabel in src/i18n.ts, DEFCAT-4).

import { Language, MessageKey, t } from './i18n'
import { MyTubeStore } from './storage'
import { DEFAULT_DATA, StorageData } from './types'

// Catalog key for each renameable default, by its shipped English name.
const DEFAULT_NAME_KEYS: Record<string, MessageKey> = {
  Tutorials: 'category.default.tutorials',
  Entertainment: 'category.default.entertainment',
}

// Untouched = exactly the shipped list, in order, and nothing saved yet — so a
// library synced from another device or kept across a reinstall is never
// renamed (DEFCAT-3).
function hasUntouchedDefaults(data: StorageData): boolean {
  const names = data.categories.map((c) => c.name)
  const shipped = DEFAULT_DATA.categories.map((c) => c.name)
  return data.videos.length === 0 && names.join('\n') === shipped.join('\n')
}

/**
 * Renames the untouched default categories to `language`'s names; a no-op (no
 * write) when nothing would change.
 * @example await localizeDefaultCategories(store, 'pt-BR') // Tutorials → Tutoriais
 */
export async function localizeDefaultCategories(
  store: MyTubeStore,
  language: Language,
): Promise<void> {
  const data = await store.getData()
  if (!hasUntouchedDefaults(data)) return
  for (const category of data.categories) {
    const key = DEFAULT_NAME_KEYS[category.name]
    if (!key) continue
    const name = t(key, language)
    if (name !== category.name)
      await store.updateCategory(category.name, name, category.emoji, category.icon)
  }
}
