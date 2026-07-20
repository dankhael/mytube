import { Category, Video } from '../../src/types'
import { resolveCategoryIcon } from '../../src/category-icon'
import { ModalShell } from './AddCategoryModal'
import CategoryIcon from './CategoryIcon'
import { useT } from '../i18n-context'

interface Props {
  video: Video
  categories: Category[]
  onClose: () => void
  onMove: (videoId: string, category: string) => void
}

// Picks a destination category for an existing saved video.
export default function SaveToModal({ video, categories, onClose, onMove }: Props) {
  const tr = useT()
  return (
    <ModalShell title={tr('modal.moveVideoTo')} onClose={onClose}>
      <p className="mb-4 line-clamp-2 text-sm text-yt-muted">{video.title}</p>
      <div className="flex flex-col gap-1">
        {categories.map((cat) => {
          const current = cat.name === video.category
          return (
            <button
              key={cat.name}
              disabled={current}
              onClick={() => onMove(video.id, cat.name)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                current ? 'cursor-default bg-[#3ea6ff]/10 text-[#3ea6ff]' : 'text-yt-text hover:bg-yt-hover'
              }`}
            >
              {/* Resolved icon, not the legacy emoji — keeps this list consistent
                  with the home tiles and the content-script picker (HICON-4). */}
              <CategoryIcon icon={resolveCategoryIcon(cat)} size={16} />
              <span>{cat.name}</span>
              {current && <span className="ml-auto text-xs">{tr('modal.current')}</span>}
            </button>
          )
        })}
      </div>
    </ModalShell>
  )
}
