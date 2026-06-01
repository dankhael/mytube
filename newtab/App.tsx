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
import { Plus, Eye, EyeOff, AlertTriangle, Search, Sparkles, Hourglass } from 'lucide-react'
import Logo from './components/Logo'
import { Category, StorageData, Video } from '../src/types'
import { IconKey } from '../src/category-icon'
import { getBytesInUse, mutate, send } from './api'
import CategorySection from './components/CategorySection'
import SmartSection from './components/SmartSection'
import AddCategoryModal from './components/AddCategoryModal'
import SaveToModal from './components/SaveToModal'
import { selectGatheringDust, selectRecentlyAdded } from './smart-sections'
import { filterVideos } from './search'

const STORAGE_LIMIT = 102_400 // chrome.storage.sync quota in bytes
const WARN_RATIO = 0.8

export default function App() {
  const [data, setData] = useState<StorageData | null>(null)
  const [showWatched, setShowWatched] = useState(true)
  const [query, setQuery] = useState('')
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

  const addCategory = (name: string, icon: IconKey) => {
    setShowAdd(false)
    // emoji is legacy; keep a default so stored Category stays well-formed.
    apply(mutate({ action: 'ADD_CATEGORY', name, emoji: '📁', icon }))
  }
  const updateCategory = (name: string, icon: IconKey) => {
    if (!editing) return
    setEditing(null)
    apply(mutate({ action: 'UPDATE_CATEGORY', oldName: editing.name, name, emoji: editing.emoji, icon }))
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

  // Videos visible after the search filter (drives every section).
  const searched = useMemo(() => (data ? filterVideos(data.videos, query) : []), [data, query])

  const videosByCategory = useMemo(() => {
    const map = new Map<string, Video[]>()
    if (!data) return map
    for (const cat of data.categories) map.set(cat.name, [])
    for (const v of searched) {
      if (!showWatched && v.watched) continue
      if (!map.has(v.category)) map.set(v.category, [])
      map.get(v.category)!.push(v)
    }
    return map
  }, [data, searched, showWatched])

  // Derived, cross-cutting sections (watched always excluded — see the spec).
  const recentlyAdded = useMemo(() => selectRecentlyAdded(searched), [searched])
  const gatheringDust = useMemo(() => selectGatheringDust(searched), [searched])

  if (!data) {
    return <div className="flex h-full items-center justify-center text-yt-muted">Carregando…</div>
  }

  const isEmpty = data.videos.length === 0
  const unwatched = data.videos.filter((v) => !v.watched).length
  const overQuota = bytes / STORAGE_LIMIT >= WARN_RATIO

  return (
    <div className="home">
      <div className="home-inner">
        {overQuota && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            Armazenamento quase cheio ({Math.round((bytes / STORAGE_LIMIT) * 100)}% de 100KB). Remova
            alguns vídeos para continuar sincronizando.
          </div>
        )}

        <div className="home-head">
          <div className="greet">
            <div className="brand">
              <Logo size={28} />
              <span className="word">
                My<b>Tube</b>
              </span>
            </div>
            <h1>Welcome back.</h1>
            <p>
              Você tem <b>{unwatched} vídeos</b> esperando na sua biblioteca.
            </p>
          </div>

          <div className="head-right">
            <label className="searchbar">
              <Search size={18} style={{ color: 'var(--text-3)', flex: 'none' }} />
              <input
                placeholder="Buscar na biblioteca…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button
              className="ghost-btn"
              onClick={() => setShowWatched((v) => !v)}
              title={showWatched ? 'Ocultar assistidos' : 'Mostrar assistidos'}
            >
              {showWatched ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {showWatched ? 'Assistidos' : 'Ocultos'}
            </button>
            <button className="accent-btn" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4" /> Categoria
            </button>
          </div>
        </div>

        {isEmpty ? (
          <WelcomeScreen />
        ) : (
          <>
            <SmartSection
              icon={Sparkles}
              title="Recentemente adicionados"
              videos={recentlyAdded}
              onOpenVideo={openVideo}
              onMoveVideo={setMoving}
              onToggleWatched={toggleWatched}
              onDeleteVideo={deleteVideo}
            />

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

            <SmartSection
              icon={Hourglass}
              title="Pegando poeira"
              videos={gatheringDust}
              onOpenVideo={openVideo}
              onMoveVideo={setMoving}
              onToggleWatched={toggleWatched}
              onDeleteVideo={deleteVideo}
            />
          </>
        )}
      </div>

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
      <div className="mx-auto mb-6 w-fit">
        <Logo size={64} />
      </div>
      <h1 className="mb-3 font-display text-3xl font-bold">Sua home do YouTube, curada por você.</h1>
      <p className="text-yt-muted">
        Navegue pelo YouTube e clique no botão{' '}
        <span className="rounded bg-yt-card px-2 py-0.5 text-yt-text">+ Salvar</span> nos vídeos para
        organizá-los aqui em categorias. Chega de “Watch Later” virar cemitério.
      </p>
      <a
        href="https://www.youtube.com"
        className="accent-btn mt-8 inline-flex"
        style={{ display: 'inline-flex' }}
      >
        Abrir o YouTube
      </a>
    </div>
  )
}
