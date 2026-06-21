import { Category } from '../../src/types'
import { resolveCategoryIcon } from '../../src/category-icon'
import { scrollToCategory } from '../category-anchor'
import CategoryIcon from './CategoryIcon'
import { useT } from '../i18n-context'

interface Props {
  categories: Category[]
  // Injectable so the jsdom test can assert the jump without a real layout;
  // defaults to the shared smooth-scroll-to-section helper (spec CHIP-3).
  onJump?: (categoryName: string) => void
}

// Horizontal chip row that jumps to a category's section, styled after YouTube's
// own category bar (spec home-category-chips / CHIP-1..6). Pure navigation: it
// renders whatever visible category set the caller passes, in that order.
export default function CategoryChips({ categories, onJump = scrollToCategory }: Props) {
  const tr = useT()
  if (categories.length === 0) return null
  return (
    <nav className="cat-chips" aria-label={tr('home.jumpToCategory')}>
      {categories.map((cat) => (
        <button key={cat.name} className="cat-chip" onClick={() => onJump(cat.name)}>
          <CategoryIcon icon={resolveCategoryIcon(cat)} size={15} />
          <span>{cat.name}</span>
        </button>
      ))}
    </nav>
  )
}
