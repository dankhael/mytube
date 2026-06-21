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
import { Category, StorageData, UNCATEGORIZED, Video } from '../src/types'
import { IconKey } from '../src/category-icon'
import { MutationOutcome, getBytesInUse, mutate, send } from './api'
import CategorySection from './components/CategorySection'
import ErrorToast from './components/ErrorToast'
import SmartSection from './components/SmartSection'
import AddCategoryModal from './components/AddCategoryModal'
import SaveToModal from './components/SaveToModal'
import { selectGatheringDust, selectRecentlyAdded } from './smart-sections'
import { filterVideos } from './search'
import { bindingQuotaLimit, shouldWarnQuota } from './quota'
import { SYNC_QUOTA_LIMITS, isMyTubeKey } from '../src/storage-backend'
import { applyAccent } from '../src/theme'
import { applyAccentFavicon } from './favicon'
import { DEFAULT_LANGUAGE, t } from '../src/i18n'
import { LanguageProvider, useT } from './i18n-context'

// The lower of the total quota and any per-item ceiling the layout imposes (R1).
const QUOTA_LIMIT = bindingQuotaLimit(SYNC_QUOTA_LIMITS)

export default function App() {
  const [data, setData] = useState<StorageData | null>(null)
  const [showWatched, setShowWatched] = useState(true)
  const [query, setQuery] = useState('')
  const [bytes, setBytes] = useState(0)
  const accent = data?.settings.accent

  // Recolor the home from the persisted accent; re-runs if it changes elsewhere
  // (e.g. the popup picker, synced via storage.onChanged → load) — THEME-7/8.
  // The tab favicon tracks it too, so the browser tab icon matches (THEME-10).
  useEffect(() => {
    if (!accent) return
    applyAccent(document.documentElement, accent)
    applyAccentFavicon(document, accent)
  }, [accent])

  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [moving, setMoving] = useState<Video | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)

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
      // The snapshot spans many mytube:* keys now (finding R1); re-read the whole
      // thing through the worker (which sanitizes, S6) on any of them changing.
      if (area === 'sync' && Object.keys(changes).some(isMyTubeKey)) void load()
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [load, refreshBytes])

  const apply = useCallback(async (next: Promise<MutationOutcome>) => {
    const result = await next
    if (result.ok) {
      setData(result.data)
      refreshBytes()
      return
    }
    // The mutation did not persist (finding R3): surface it and re-read the
    // store so optimistic UI (e.g. drag reorder) never claims success.
    setMutationError(result.error)
    void load()
  }, [refreshBytes, load])

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
    const lang = data?.settings.language ?? DEFAULT_LANGUAGE
    const count = data?.videos.filter((v) => v.category === cat.name).length ?? 0
    let deleteVideos = false
    if (count > 0) {
      // Two-step confirm: keep videos (move to the uncategorized bucket) or
      // delete them too. {uncategorized} is the real category the reducer moves
      // orphans into (UNCATEGORIZED), so the dialog names the actual destination.
      const alsoDelete = window.confirm(
        t('cat.confirmDeleteWithVideos', lang, {
          name: cat.name,
          count,
          uncategorized: UNCATEGORIZED,
        }),
      )
      deleteVideos = alsoDelete
    } else if (!window.confirm(t('cat.confirmDelete', lang, { name: cat.name }))) {
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
    return (
      <div className="flex h-full items-center justify-center text-yt-muted">
        {t('home.loading', DEFAULT_LANGUAGE)}
      </div>
    )
  }

  const lang = data.settings.language
  const tr = (key: Parameters<typeof t>[0], vars?: Record<string, string | number>) =>
    t(key, lang, vars)
  const isEmpty = data.videos.length === 0
  const unwatched = data.videos.filter((v) => !v.watched).length
  const overQuota = shouldWarnQuota(bytes, QUOTA_LIMIT)

  return (
    <LanguageProvider lang={lang}>
    <div className="home">
      {mutationError && (
        <ErrorToast message={mutationError} onDismiss={() => setMutationError(null)} />
      )}
      <div className="home-inner">
        {overQuota && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            {tr('home.quotaWarning', { percent: Math.round((bytes / QUOTA_LIMIT) * 100) })}
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
            <h1>{tr('home.welcomeBack')}</h1>
            <p>
              {tr('home.greetingPre')}{' '}
              <b>
                {unwatched} {tr(unwatched === 1 ? 'common.video' : 'common.videos')}
              </b>{' '}
              {tr('home.greetingPost')}
            </p>
          </div>

          <div className="head-right">
            <label className="searchbar">
              <Search size={18} style={{ color: 'var(--text-3)', flex: 'none' }} />
              <input
                placeholder={tr('home.searchPlaceholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button
              className="ghost-btn"
              onClick={() => setShowWatched((v) => !v)}
              title={showWatched ? tr('home.hideWatched') : tr('home.showWatched')}
            >
              {showWatched ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {showWatched ? tr('home.watched') : tr('home.hidden')}
            </button>
            <button className="accent-btn" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4" /> {tr('home.category')}
            </button>
          </div>
        </div>

        {isEmpty ? (
          <WelcomeScreen />
        ) : (
          <>
            <SmartSection
              icon={Sparkles}
              title={tr('home.recentlyAdded')}
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
              title={tr('home.gatheringDust')}
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
    </LanguageProvider>
  )
}

function WelcomeScreen() {
  const tr = useT()
  return (
    <div className="mx-auto mt-20 max-w-xl text-center">
      <div className="mx-auto mb-6 w-fit">
        <Logo size={64} />
      </div>
      <h1 className="mb-3 font-display text-3xl font-bold">{tr('welcome.title')}</h1>
      <p className="text-yt-muted">
        {tr('welcome.bodyPre')}{' '}
        <span className="rounded bg-yt-card px-2 py-0.5 text-yt-text">{tr('welcome.savePill')}</span>{' '}
        {tr('welcome.bodyPost')}
      </p>
      <a
        href="https://www.youtube.com"
        className="accent-btn mt-8 inline-flex"
        style={{ display: 'inline-flex' }}
      >
        {tr('welcome.openYoutube')}
      </a>
    </div>
  )
}
