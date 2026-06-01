import { useState } from 'react'
import { type LucideIcon } from 'lucide-react'
import { Video } from '../../src/types'
import { VideoCardView } from './VideoCard'

interface Props {
  icon: LucideIcon // monochrome header glyph (matches the category tiles)
  title: string
  videos: Video[]
  onOpenVideo: (id: string) => void
  onMoveVideo: (video: Video) => void
  onToggleWatched: (video: Video) => void
  onDeleteVideo: (id: string) => void
}

const PREVIEW_COUNT = 4

// A derived, read-only section (e.g. "Recentemente adicionados"). Same card UI as
// categories, but no drag handle / category menu — its order is computed.
export default function SmartSection({
  icon: Icon,
  title,
  videos,
  onOpenVideo,
  onMoveVideo,
  onToggleWatched,
  onDeleteVideo,
}: Props) {
  const [expanded, setExpanded] = useState(false)

  if (videos.length === 0) return null // SMART-6: hide when nothing qualifies

  const visible = expanded ? videos : videos.slice(0, PREVIEW_COUNT)
  const hiddenCount = videos.length - PREVIEW_COUNT

  return (
    <section className="cat">
      <div className="cat-head">
        <div className="cat-ico">
          <Icon size={18} />
        </div>
        <h2 className="cat-title">{title}</h2>
        <span className="cat-count">
          {videos.length} {videos.length === 1 ? 'vídeo' : 'vídeos'}
        </span>
        <div className="spacer" />
        {hiddenCount > 0 && (
          <button className="cat-action" style={{ opacity: 1 }} onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Mostrar menos' : `Ver todos (${videos.length})`}
          </button>
        )}
      </div>

      <div className="grid">
        {visible.map((video) => (
          <VideoCardView
            key={video.id}
            video={video}
            onOpen={onOpenVideo}
            onMove={onMoveVideo}
            onToggleWatched={onToggleWatched}
            onDelete={onDeleteVideo}
          />
        ))}
      </div>
    </section>
  )
}
