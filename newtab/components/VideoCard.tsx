import { useEffect, useRef, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, MoreVertical, Play, Trash2, FolderInput, Eye, EyeOff } from 'lucide-react'
import { Video } from '../../src/types'

interface Props {
  video: Video
  onOpen: (id: string) => void
  onMove: (video: Video) => void
  onToggleWatched: (video: Video) => void
  onDelete: (id: string) => void
}

export default function VideoCard({ video, onOpen, onMove, onToggleWatched, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: video.id,
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onContextMenu={(e) => {
        e.preventDefault()
        setMenuOpen(true)
      }}
      className="group relative cursor-pointer select-none rounded-xl bg-yt-card transition-colors hover:bg-yt-hover"
    >
      <div className="relative aspect-video overflow-hidden rounded-lg" onClick={() => onOpen(video.id)}>
        <img
          src={video.thumbnail}
          alt={video.title}
          loading="lazy"
          className={`h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02] ${
            video.watched ? 'opacity-40' : ''
          }`}
        />
        {/* play affordance on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/70">
            <Play className="h-6 w-6 fill-white text-white" />
          </span>
        </div>
        {video.watched && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/80 px-2 py-0.5 text-xs text-green-400">
            <Check className="h-3 w-3" /> Assistido
          </span>
        )}
      </div>

      <div className="px-1 py-2">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-yt-text" title={video.title}>
          {video.title}
        </p>
        <p className="mt-1 truncate text-xs text-yt-muted">{video.channelName}</p>
      </div>

      {/* ⋯ menu button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setMenuOpen((v) => !v)
        }}
        className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white opacity-0 transition hover:bg-black/90 group-hover:opacity-100"
        title="Opções"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute right-1 top-9 z-30 w-44 overflow-hidden rounded-lg border border-yt-border bg-[#212121] py-1 text-sm shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem icon={<FolderInput className="h-4 w-4" />} onClick={() => { setMenuOpen(false); onMove(video) }}>
            Mover para…
          </MenuItem>
          <MenuItem
            icon={video.watched ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            onClick={() => { setMenuOpen(false); onToggleWatched(video) }}
          >
            {video.watched ? 'Marcar não assistido' : 'Marcar como assistido'}
          </MenuItem>
          <MenuItem icon={<Trash2 className="h-4 w-4" />} danger onClick={() => { setMenuOpen(false); onDelete(video.id) }}>
            Remover
          </MenuItem>
        </div>
      )}
    </div>
  )
}

function MenuItem({
  children,
  icon,
  onClick,
  danger,
}: {
  children: React.ReactNode
  icon: React.ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-yt-hover ${
        danger ? 'text-red-400' : 'text-yt-text'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}
