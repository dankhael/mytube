import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Category } from '../../src/types'
import { ALL_ICONS, IconKey, resolveCategoryIcon } from '../../src/category-icon'
import CategoryIcon from './CategoryIcon'

interface Props {
  // When `existing` is provided the modal is in edit mode.
  existing?: Category
  onClose: () => void
  onSubmit: (name: string, icon: IconKey) => void
}

export default function AddCategoryModal({ existing, onClose, onSubmit }: Props) {
  const [name, setName] = useState(existing?.name ?? '')
  // Preselect the category's current (or auto-mapped) icon.
  const [icon, setIcon] = useState<IconKey>(
    resolveCategoryIcon({ name: existing?.name ?? '', icon: existing?.icon }),
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onSubmit(trimmed, icon)
  }

  return (
    <ModalShell title={existing ? 'Editar categoria' : 'Nova categoria'} onClose={onClose}>
      <label className="mb-2 block text-sm text-yt-muted">Nome</label>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="Ex.: Tutoriais de React"
        className="w-full rounded-lg border border-yt-border bg-[#121212] px-3 py-2 text-yt-text outline-none focus:border-[#3ea6ff]"
      />

      <label className="mb-2 mt-4 block text-sm text-yt-muted">Ícone</label>
      <div className="flex flex-wrap gap-2">
        {ALL_ICONS.map((key) => (
          <button
            key={key}
            type="button"
            aria-label={key}
            aria-pressed={icon === key}
            onClick={() => setIcon(key)}
            className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
              icon === key
                ? 'bg-accent/20 text-accent ring-2 ring-accent'
                : 'bg-[#121212] text-yt-text hover:bg-yt-hover'
            }`}
          >
            <CategoryIcon icon={key} size={20} />
          </button>
        ))}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-full px-4 py-2 text-sm text-yt-text hover:bg-yt-hover">
          Cancelar
        </button>
        <button
          onClick={submit}
          disabled={!name.trim()}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition hover:brightness-110 disabled:opacity-40"
        >
          {existing ? 'Salvar' : 'Criar'}
        </button>
      </div>
    </ModalShell>
  )
}

export function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-yt-border bg-yt-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-yt-muted hover:bg-yt-hover hover:text-yt-text">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
