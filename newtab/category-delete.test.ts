import { describe, expect, it } from 'vitest'
import { askCategoryDelete } from './category-delete'
import { Category, UNCATEGORIZED } from '../src/types'

// Records the prompts and answers every one with a scripted reply, standing in
// for window.confirm (CLAUDE.md: named fakes over inline stubs).
class FakeConfirmDialog {
  readonly prompts: string[] = []
  constructor(private readonly reply: boolean) {}
  ask = (message: string): boolean => {
    this.prompts.push(message)
    return this.reply
  }
}

const ORDINARY: Category = { name: 'Jogos', emoji: '🎮' }
const BUCKET: Category = { name: UNCATEGORIZED, emoji: '📁' }

describe('askCategoryDelete', () => {
  it('an empty category: OK keeps the flag off, Cancel aborts', () => {
    expect(askCategoryDelete(ORDINARY, 0, 'en', new FakeConfirmDialog(true).ask)).toEqual({
      deleteVideos: false,
    })
    expect(askCategoryDelete(ORDINARY, 0, 'en', new FakeConfirmDialog(false).ask)).toBeNull()
  })

  it('a category with videos: OK deletes them, Cancel keeps them (two-way dialog unchanged)', () => {
    expect(askCategoryDelete(ORDINARY, 3, 'en', new FakeConfirmDialog(true).ask)).toEqual({
      deleteVideos: true,
    })
    expect(askCategoryDelete(ORDINARY, 3, 'en', new FakeConfirmDialog(false).ask)).toEqual({
      deleteVideos: false,
    })
  })

  it('CATDEL-7: the bucket with videos has one confirm: OK deletes, Cancel aborts', () => {
    const dialog = new FakeConfirmDialog(true)
    expect(askCategoryDelete(BUCKET, 3, 'en', dialog.ask)).toEqual({ deleteVideos: true })
    expect(dialog.prompts).toHaveLength(1)
    expect(dialog.prompts[0]).toContain('3')
    expect(askCategoryDelete(BUCKET, 3, 'en', new FakeConfirmDialog(false).ask)).toBeNull()
  })

  it('names the bucket by its localized label, not the stored key', () => {
    const withVideos = new FakeConfirmDialog(true)
    askCategoryDelete(BUCKET, 2, 'pt-BR', withVideos.ask)
    expect(withVideos.prompts[0]).toContain('Sem categoria')
    const empty = new FakeConfirmDialog(true)
    askCategoryDelete(BUCKET, 0, 'pt-BR', empty.ask)
    expect(empty.prompts[0]).toContain('Sem categoria')
  })
})
