import { useEffect, useRef, useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Category, Video } from '../../src/types'
import VideoCard from './VideoCard'

interface Props {
  category: Category
  videos: Video[]
  onOpenVideo: (id: string) => void
  onMoveVideo: (video: Video) => void
  onToggleWatched: (video: Video) => void
  onDeleteVideo: (id: string) => void
  onReorderVideos: (category: string, orderedIds: string[]) => void
  onEditCategory: (category: Category) => void
  onDeleteCategory: (category: Category) => void
}

const PREVIEW_COUNT = 4

export default function CategorySection(props: Props) {
  const { category, videos } = props
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `cat:${category.name}`,
  })
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  const visible = expanded ? videos : videos.slice(0, PREVIEW_COUNT)
  const hiddenCount = videos.length - PREVIEW_COUNT

  const handleVideoDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = videos.map((v) => v.id)
    const oldIndex = ids.indexOf(active.id as string)
    const newIndex = ids.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return
    props.onReorderVideos(category.name, arrayMove(ids, oldIndex, newIndex))
  }

  return (
    <section ref={setNodeRef} style={style} className="mb-10">
      <div className="mb-3 flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-yt-muted opacity-40 transition hover:opacity-100 active:cursor-grabbing"
          title="Arrastar categoria"
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <span>{category.emoji}</span>
          <span>{category.name}</span>
        </h2>
        <span className="text-sm text-yt-muted">
          ({videos.length} {videos.length === 1 ? 'vídeo' : 'vídeos'})
        </span>

        <div className="relative ml-auto" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-full p-1.5 text-yt-muted transition hover:bg-yt-hover hover:text-yt-text"
            title="Opções da categoria"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-9 z-30 w-44 overflow-hidden rounded-lg border border-yt-border bg-[#212121] py-1 text-sm shadow-2xl">
              <button
                onClick={() => { setMenuOpen(false); props.onEditCategory(category) }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-yt-text hover:bg-yt-hover"
              >
                <Pencil className="h-4 w-4" /> Renomear / emoji
              </button>
              <button
                onClick={() => { setMenuOpen(false); props.onDeleteCategory(category) }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-400 hover:bg-yt-hover"
              >
                <Trash2 className="h-4 w-4" /> Deletar categoria
              </button>
            </div>
          )}
        </div>
      </div>

      {videos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-yt-border px-4 py-6 text-sm text-yt-muted">
          Nenhum vídeo aqui ainda. Salve vídeos pelo botão “+” no YouTube.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleVideoDragEnd}>
          <SortableContext items={videos.map((v) => v.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {visible.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onOpen={props.onOpenVideo}
                  onMove={props.onMoveVideo}
                  onToggleWatched={props.onToggleWatched}
                  onDelete={props.onDeleteVideo}
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
          </SortableContext>
        </DndContext>
      )}

      {expanded && hiddenCount > 0 && (
        <button onClick={() => setExpanded(false)} className="mt-3 text-sm text-[#3ea6ff] hover:underline">
          Mostrar menos
        </button>
      )}
    </section>
  )
}
