import { useState } from 'react'
import { Video } from '../../src/types'
import { VideoCardView } from './VideoCard'

interface Props {
  emoji: string
  title: string
  videos: Video[]
  onOpenVideo: (id: string) => void
  onMoveVideo: (video: Video) => void
  onToggleWatched: (video: Video) => void
  onDeleteVideo: (id: string) => void
}

const PREVIEW_COUNT = 4

// A derived, read-only section (e.g. "Recentemente adicionados"). Same card UI as
// categories, but no drag handle and no category menu — its order is computed.
export default function SmartSection({
  emoji,
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
    <section className="mb-10">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <span>{emoji}</span>
          <span>{title}</span>
        </h2>
        <span className="text-sm text-yt-muted">
          ({videos.length} {videos.length === 1 ? 'vídeo' : 'vídeos'})
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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
        {!expanded && hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="flex aspect-video items-center justify-center rounded-lg border border-yt-border bg-yt-card text-lg font-semibold text-yt-text transition hover:bg-yt-hover"
          >
            +{hiddenCount}
          </button>
        )}
      </div>

      {expanded && hiddenCount > 0 && (
        <button onClick={() => setExpanded(false)} className="mt-3 text-sm text-[#3ea6ff] hover:underline">
          Mostrar menos
        </button>
      )}
    </section>
  )
}
