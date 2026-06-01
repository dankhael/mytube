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
    <section ref={setNodeRef} style={style} className="cat">
      <div className="cat-head">
        <button {...attributes} {...listeners} className="drag" title="Arrastar categoria">
          <GripVertical size={16} />
        </button>
        <div className="cat-ico">{category.emoji}</div>
        <h2 className="cat-title">{category.name}</h2>
        <span className="cat-count">
          {videos.length} {videos.length === 1 ? 'vídeo' : 'vídeos'}
        </span>

        <div className="spacer" />
        {hiddenCount > 0 && (
          <button className="cat-action" style={{ opacity: 1 }} onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Mostrar menos' : `Ver todos (${videos.length})`}
          </button>
        )}

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="cat-action"
            style={{ opacity: 1, padding: '0 9px' }}
            title="Opções da categoria"
          >
            <MoreHorizontal size={18} />
          </button>
          {menuOpen && (
            <div className="vmenu" style={{ right: 0, top: 38 }}>
              <button onClick={() => { setMenuOpen(false); props.onEditCategory(category) }}>
                <Pencil size={15} /> Renomear / emoji
              </button>
              <button className="danger" onClick={() => { setMenuOpen(false); props.onDeleteCategory(category) }}>
                <Trash2 size={15} /> Deletar categoria
              </button>
            </div>
          )}
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="empty">
          <div className="ei">
            <span style={{ fontSize: 20 }}>{category.emoji}</span>
          </div>
          <div>
            <b>Nada aqui ainda</b>
            <span>Clique em “+ Salvar” em qualquer vídeo para jogá-lo em {category.name}.</span>
          </div>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleVideoDragEnd}>
          <SortableContext items={videos.map((v) => v.id)} strategy={rectSortingStrategy}>
            <div className="grid">
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
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  )
}
