import { useEffect, useRef, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, MoreVertical, Play, Trash2, FolderInput, Eye, EyeOff } from 'lucide-react'
import { Video } from '../../src/types'

export interface CardActions {
  video: Video
  onOpen: (id: string) => void
  onMove: (video: Video) => void
  onToggleWatched: (video: Video) => void
  onDelete: (id: string) => void
}

interface ViewProps extends CardActions {
  // Drag wiring from the sortable wrapper; omitted in read-only smart sections.
  innerRef?: (node: HTMLElement | null) => void
  rootProps?: React.HTMLAttributes<HTMLElement>
  style?: React.CSSProperties
}

// Presentational card matching the redesign (thumb + hover lift/play, avatar,
// title/channel, hover actions + context menu). No DnD itself.
export function VideoCardView({
  video,
  onOpen,
  onMove,
  onToggleWatched,
  onDelete,
  innerRef,
  rootProps,
  style,
}: ViewProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  // Avatar URLs rot (Google rotates them); on load failure we drop to the
  // initial-letter avatar instead of showing a broken image (AVATAR-7).
  const [avatarFailed, setAvatarFailed] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  const initial = video.channelName.trim().charAt(0).toUpperCase() || '•'
  const showPhoto = Boolean(video.channelThumbnail) && !avatarFailed
  const stop = (e: React.MouseEvent) => e.stopPropagation()

  return (
    <div
      ref={innerRef}
      style={style}
      {...rootProps}
      className="vcard"
      onClick={() => onOpen(video.id)}
      onContextMenu={(e) => {
        e.preventDefault()
        setMenuOpen(true)
      }}
    >
      <div className="vthumb">
        <img className="art" src={video.thumbnail} alt={video.title} loading="lazy" />
        <div className="scrim" />
        {video.watched ? (
          <span className="watched-tag">
            <Check size={12} /> Assistido
          </span>
        ) : (
          <span className="unwatch-dot" title="Ainda não assistido" />
        )}
        <div className="play">
          <Play size={22} className="fill-current" />
        </div>

        <div className="vactions">
          <button
            className="vact"
            title={video.watched ? 'Marcar não assistido' : 'Marcar como assistido'}
            onClick={(e) => {
              stop(e)
              onToggleWatched(video)
            }}
          >
            {video.watched ? <EyeOff size={16} /> : <Check size={17} />}
          </button>
          <button
            className="vact"
            title="Mover…"
            onClick={(e) => {
              stop(e)
              onMove(video)
            }}
          >
            <FolderInput size={16} />
          </button>
          <button
            className="vact"
            title="Mais"
            onClick={(e) => {
              stop(e)
              setMenuOpen((v) => !v)
            }}
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* Anchored to .vcard, not .vthumb: .vthumb is overflow:hidden and would
          clip the menu's last item ("Remover") below the artwork. */}
      {menuOpen && (
        <div className="vmenu" ref={menuRef} onClick={stop}>
          <button onClick={() => { setMenuOpen(false); onMove(video) }}>
            <FolderInput size={15} /> Mover para…
          </button>
          <button onClick={() => { setMenuOpen(false); onToggleWatched(video) }}>
            {video.watched ? <Eye size={15} /> : <Check size={15} />}
            {video.watched ? 'Marcar não assistido' : 'Marcar como assistido'}
          </button>
          <button className="danger" onClick={() => { setMenuOpen(false); onDelete(video.id) }}>
            <Trash2 size={15} /> Remover
          </button>
        </div>
      )}

      <div className="vmeta">
        {showPhoto ? (
          <img
            className="avatar avatar-img"
            src={video.channelThumbnail}
            alt={video.channelName}
            loading="lazy"
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          <div className="avatar">{initial}</div>
        )}
        <div className="txt">
          <p className="vtitle" title={video.title}>
            {video.title}
          </p>
          <div className="vchan">{video.channelName}</div>
        </div>
      </div>
    </div>
  )
}

// Draggable card used inside category sections (sortable within a DndContext).
export default function VideoCard(props: CardActions) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.video.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  return (
    <VideoCardView
      {...props}
      innerRef={setNodeRef}
      rootProps={{ ...attributes, ...listeners }}
      style={style}
    />
  )
}
