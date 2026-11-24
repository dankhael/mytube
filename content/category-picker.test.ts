// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendMessage } from '../src/messages'
import { DEFAULT_DATA, Message, MessageResponse } from '../src/types'
import {
  CategoryPickerDeps,
  loadPickerCategories,
  openCategoryPicker,
  pickerLoadError,
} from './category-picker'

// Answers every message from a list, in order, repeating the last reply.
class FakeWorker {
  constructor(private readonly replies: MessageResponse[]) {}
  send = async (_message: Message): Promise<MessageResponse> =>
    this.replies.length > 1 ? this.replies.shift()! : this.replies[0]
}

// Holds every reply until the test releases it, like a worker still waking up.
class FakeSlowWorker {
  private pending: (() => void)[] = []
  send = (_message: Message): Promise<MessageResponse> =>
    new Promise((resolve) => this.pending.push(() => resolve(LOADED)))
  release(): void {
    this.pending.splice(0).forEach((reply) => reply())
  }
}

// What the browser does to a script whose extension was reloaded: the call throws.
class OrphanedRuntime {
  lastError = undefined
  sendMessage(): void {
    throw new Error('Extension context invalidated.')
  }
}

// Stands in for content.ts: records what it mounts, and tears down like the real
// script does when the transport reports the extension is gone.
class FakePickerHost {
  readonly mounted: HTMLElement[] = []
  tornDown = false
  closes = 0
  deps(send: CategoryPickerDeps['send']): CategoryPickerDeps {
    return {
      send,
      isTornDown: () => this.tornDown,
      language: () => 'en',
      closeDropdowns: () => { this.closes++ },
      closeCount: () => this.closes,
      mount: (dropdown) => { this.mounted.push(dropdown) },
    }
  }
}

const REJECTED: MessageResponse = { ok: false, error: 'Incomplete sync chunk' }
const LOADED: MessageResponse = { ok: true, data: structuredClone(DEFAULT_DATA) }
const anchor = () => document.createElement('button')
const itemNames = (menu: HTMLElement) =>
  [...menu.querySelectorAll('.mytube-dropdown-item')].map((item) => item.textContent)

afterEach(() => document.body.replaceChildren())

describe('loadPickerCategories', () => {
  it('returns the stored categories', async () => {
    const categories = await loadPickerCategories(new FakeWorker([LOADED]).send)
    expect(categories).toEqual(DEFAULT_DATA.categories)
  })

  it('regression: a failed read is null, not an empty library', async () => {
    expect(await loadPickerCategories(new FakeWorker([REJECTED]).send)).toBeNull()
  })

  it('a library with no categories stays an empty list, not an error', async () => {
    const empty: MessageResponse = { ok: true, data: { ...DEFAULT_DATA, categories: [] } }
    expect(await loadPickerCategories(new FakeWorker([empty]).send)).toEqual([])
  })
})

describe('pickerLoadError', () => {
  it('shows the error in the interface language', () => {
    const box = pickerLoadError('pt-BR', vi.fn())
    expect(box.getAttribute('role')).toBe('alert')
    expect(box.textContent).toContain('Não foi possível carregar suas categorias.')
  })

  it('offers a retry that stays inside the menu', () => {
    const onRetry = vi.fn()
    const outsideClick = vi.fn()
    const box = pickerLoadError('en', onRetry)
    document.body.appendChild(box)
    document.addEventListener('click', outsideClick)
    box.querySelector('button')!.click()
    document.removeEventListener('click', outsideClick)
    expect(onRetry).toHaveBeenCalledOnce()
    expect(outsideClick).not.toHaveBeenCalled()
  })
})

describe('openCategoryPicker', () => {
  it('mounts the categories, then "+ New category", and hands back the choice', async () => {
    const host = new FakePickerHost()
    const onPick = vi.fn()
    await openCategoryPicker(anchor(), onPick, 'content.saveTo', host.deps(new FakeWorker([LOADED]).send))
    const menu = host.mounted[0]
    expect(itemNames(menu).at(-1)).toBe('+ New category')
    menu.querySelector<HTMLElement>('.mytube-dropdown-item')!.click()
    expect(onPick).toHaveBeenCalledWith(DEFAULT_DATA.categories[0].name)
  })

  it('a failed read shows the error instead of "+ New category"', async () => {
    const host = new FakePickerHost()
    await openCategoryPicker(anchor(), vi.fn(), 'content.saveTo', host.deps(new FakeWorker([REJECTED]).send))
    expect(host.mounted[0].querySelector('[role="alert"]')).not.toBeNull()
    expect(itemNames(host.mounted[0])).toEqual(['Try again'])
  })

  it('the retry reopens the picker with the categories once they can be read', async () => {
    const host = new FakePickerHost()
    const worker = new FakeWorker([REJECTED, LOADED])
    await openCategoryPicker(anchor(), vi.fn(), 'content.saveTo', host.deps(worker.send))
    host.mounted[0].querySelector('button')!.click()
    await vi.waitFor(() => expect(host.mounted).toHaveLength(2))
    expect(itemNames(host.mounted[1])).toContain('+ New category')
  })

  it('regression: an orphaned script mounts nothing after its teardown (M4)', async () => {
    const host = new FakePickerHost()
    const runtime = new OrphanedRuntime()
    const send = (message: Message) => sendMessage(message, {
      runtime: runtime as never,
      onUnavailable: () => { host.tornDown = true },
    })
    await openCategoryPicker(anchor(), vi.fn(), 'content.saveTo', host.deps(send))
    expect(host.tornDown).toBe(true)
    expect(host.mounted).toEqual([])
  })
})

// Nothing is in the DOM while the categories load, so the pills' "already open?"
// check sees a closed menu and a second click opens a second picker.
describe('openCategoryPicker while loading', () => {
  it('regression: a second open replaces the first, so one menu mounts', async () => {
    const host = new FakePickerHost()
    const worker = new FakeSlowWorker()
    const first = openCategoryPicker(anchor(), vi.fn(), 'content.saveTo', host.deps(worker.send))
    const second = openCategoryPicker(anchor(), vi.fn(), 'content.saveTo', host.deps(worker.send))

    worker.release()
    await Promise.all([first, second])

    expect(host.mounted).toHaveLength(1)
  })

  it('regression: closing during the load means no menu appears afterwards', async () => {
    const host = new FakePickerHost()
    const worker = new FakeSlowWorker()
    const deps = host.deps(worker.send)
    const opening = openCategoryPicker(anchor(), vi.fn(), 'content.saveTo', deps)

    deps.closeDropdowns() // the user clicked elsewhere
    worker.release()
    await opening

    expect(host.mounted).toHaveLength(0)
  })
})
