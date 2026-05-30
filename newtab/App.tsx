import { useCallback, useEffect, useMemo, useState } from 'react'
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
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { Plus, Eye, EyeOff, Youtube, AlertTriangle } from 'lucide-react'
import { Category, StorageData, Video } from '../src/types'
import { getBytesInUse, mutate, send } from './api'
import CategorySection from './components/CategorySection'
import AddCategoryModal from './components/AddCategoryModal'
import SaveToModal from './components/SaveToModal'

const STORAGE_LIMIT = 102_400 // chrome.storage.sync quota in bytes
const WARN_RATIO = 0.8

export default function App() {
  const [data, setData] = useState<StorageData | null>(null)
  const [showWatched, setShowWatched] = useState(true)
  const [bytes, setBytes] = useState(0)

  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [moving, setMoving] = useState<Video | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const refreshBytes = useCallback(() => {
    getBytesInUse().then(setBytes)
  }, [])

  const load = useCallback(async () => {
    const res = await send({ action: 'GET_ALL' })
    if (res.ok && 'data' in res && res.data) setData(res.data)
    refreshBytes()
  }, [refreshBytes])

  useEffect(() => {
    load()
    const listener = (changes: { [k: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'sync' && changes.mytube) {
        setData(changes.mytube.newValue as StorageData)
        refreshBytes()
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [load, refreshBytes])

  const apply = useCallback(async (next: Promise<StorageData | null>) => {
    const result = await next
    if (result) {
      setData(result)
      refreshBytes()
    }
  }, [refreshBytes])

  // ---- handlers ----
  const openVideo = (id: string) =>
    window.open(`https://www.youtube.com/watch?v=${id}`, '_blank', 'noopener')

  const deleteVideo = (id: string) => apply(mutate({ action: 'DELETE_VIDEO', id }))
  const toggleWatched = (v: Video) =>
    apply(mutate({ action: 'MARK_WATCHED', id: v.id, watched: !v.watched }))
  const moveVideo = (id: string, category: string) => {
    setMoving(null)
    apply(mutate({ action: 'MOVE_VIDEO', id, category }))
  }
  const reorderVideos = (category: string, orderedIds: string[]) =>
    apply(mutate({ action: 'REORDER_VIDEOS', category, order: orderedIds }))

  const addCategory = (name: string, emoji: string) => {
    setShowAdd(false)
    apply(mutate({ action: 'ADD_CATEGORY', name, emoji }))
  }
  const updateCategory = (name: string, emoji: string) => {
    if (!editing) return
    setEditing(null)
    apply(mutate({ action: 'UPDATE_CATEGORY', oldName: editing.name, name, emoji }))
  }
  const deleteCategory = (cat: Category) => {
    const count = data?.videos.filter((v) => v.category === cat.name).length ?? 0
    let deleteVideos = false
    if (count > 0) {
      // Two-step confirm: keep videos (move to "Sem categoria") or delete them too.
      const alsoDelete = window.confirm(
        `Deletar "${cat.name}"?\n\nOK = apagar a categoria E seus ${count} vídeos.\nCancelar = manter os vídeos (movê-los para "Sem categoria").`,
      )
      deleteVideos = alsoDelete
    } else if (!window.confirm(`Deletar a categoria "${cat.name}"?`)) {
      return
    }
    apply(mutate({ action: 'DELETE_CATEGORY', name: cat.name, deleteVideos }))
  }

  const onCategoryDragEnd = (event: DragEndEvent) => {
    if (!data) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const names = data.categories.map((c) => `cat:${c.name}`)
    const oldIndex = names.indexOf(active.id as string)
    const newIndex = names.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(data.categories, oldIndex, newIndex)
    setData({ ...data, categories: reordered }) // optimistic
    apply(mutate({ action: 'REORDER_CATEGORIES', order: reordered.map((c) => c.name) }))
  }

  const videosByCategory = useMemo(() => {
    const map = new Map<string, Video[]>()
    if (!data) return map
    for (const cat of data.categories) map.set(cat.name, [])
    for (const v of data.videos) {
      if (!showWatched && v.watched) continue
      if (!map.has(v.category)) map.set(v.category, [])
      map.get(v.category)!.push(v)
    }
    return map
  }, [data, showWatched])

  if (!data) {
    return <div className="flex h-full items-center justify-center text-yt-muted">Carregando…</div>
  }

  const totalVideos = data.videos.length
  const isEmpty = totalVideos === 0
  const overQuota = bytes / STORAGE_LIMIT >= WARN_RATIO

  return (
    <div className="min-h-full bg-yt-bg">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-yt-border bg-yt-bg/95 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Youtube className="h-7 w-7 text-yt-red" />
          <span className="text-xl font-bold tracking-tight">MyTube</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowWatched((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-yt-border px-3 py-1.5 text-sm text-yt-text transition hover:bg-yt-hover"
            title={showWatched ? 'Ocultar assistidos' : 'Mostrar assistidos'}
          >
            {showWatched ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {showWatched ? 'Assistidos' : 'Ocultos'}
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 rounded-full bg-yt-red px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-red-600"
          >
            <Plus className="h-4 w-4" /> Categoria
          </button>
        </div>
      </header>

      {overQuota && (
        <div className="flex items-center gap-2 bg-amber-500/10 px-6 py-2 text-sm text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          Armazenamento quase cheio ({Math.round((bytes / STORAGE_LIMIT) * 100)}% de 100KB). Remova
          alguns vídeos para continuar sincronizando.
        </div>
      )}

      <main className="mx-auto max-w-[1400px] px-6 py-8">
        {isEmpty ? (
          <WelcomeScreen />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onCategoryDragEnd}>
            <SortableContext
              items={data.categories.map((c) => `cat:${c.name}`)}
              strategy={verticalListSortingStrategy}
            >
              {data.categories.map((cat) => (
                <CategorySection
                  key={cat.name}
                  category={cat}
                  videos={videosByCategory.get(cat.name) ?? []}
                  onOpenVideo={openVideo}
                  onMoveVideo={setMoving}
                  onToggleWatched={toggleWatched}
                  onDeleteVideo={deleteVideo}
                  onReorderVideos={reorderVideos}
                  onEditCategory={setEditing}
                  onDeleteCategory={deleteCategory}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </main>

      {showAdd && <AddCategoryModal onClose={() => setShowAdd(false)} onSubmit={addCategory} />}
      {editing && (
        <AddCategoryModal existing={editing} onClose={() => setEditing(null)} onSubmit={updateCategory} />
      )}
      {moving && (
        <SaveToModal
          video={moving}
          categories={data.categories}
          onClose={() => setMoving(null)}
          onMove={moveVideo}
        />
      )}
    </div>
  )
}

function WelcomeScreen() {
  return (
    <div className="mx-auto mt-20 max-w-xl text-center">
      <Youtube className="mx-auto mb-6 h-16 w-16 text-yt-red" />
      <h1 className="mb-3 text-3xl font-bold">Sua home do YouTube, curada por você.</h1>
      <p className="text-yt-muted">
        Navegue pelo YouTube e clique no botão{' '}
        <span className="rounded bg-yt-card px-2 py-0.5 text-yt-text">+ Salvar</span> nos vídeos para
        organizá-los aqui em categorias. Chega de “Watch Later” virar cemitério.
      </p>
      <a
        href="https://www.youtube.com"
        className="mt-8 inline-block rounded-full bg-yt-red px-6 py-2.5 font-semibold text-white transition hover:bg-red-600"
      >
        Abrir o YouTube
      </a>
    </div>
  )
}
