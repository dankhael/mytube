import { Category, Video } from '../../src/types'
import { ModalShell } from './AddCategoryModal'

interface Props {
  video: Video
  categories: Category[]
  onClose: () => void
  onMove: (videoId: string, category: string) => void
}

// Picks a destination category for an existing saved video.
export default function SaveToModal({ video, categories, onClose, onMove }: Props) {
  return (
    <ModalShell title="Mover vídeo para…" onClose={onClose}>
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
              <span>{cat.emoji}</span>
              <span>{cat.name}</span>
              {current && <span className="ml-auto text-xs">atual</span>}
            </button>
          )
        })}
      </div>
    </ModalShell>
  )
}
