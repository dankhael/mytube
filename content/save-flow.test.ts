import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_DATA, Message, MessageResponse } from '../src/types'
import { CardData } from './extract-card'
import { saveCardVideo } from './save-flow'

// Answers every message the same way and records what it received.
class FakeWorker {
  readonly received: Message[] = []
  constructor(private readonly reply: MessageResponse) {}
  send = async (message: Message): Promise<MessageResponse> => {
    this.received.push(message)
    return this.reply
  }
}

const CARD: CardData = { id: 'aaaaaaaaaaa', title: 'T', thumbnail: 't', channelName: 'C' }
const REJECTED: MessageResponse = { ok: false, error: 'Incomplete sync chunk' }
const LOADED: MessageResponse = { ok: true, data: structuredClone(DEFAULT_DATA) }

describe('saveCardVideo', () => {
  it('sends the card to the category and reports success', async () => {
    const worker = new FakeWorker(LOADED)
    const onSaved = vi.fn()
    const onFailed = vi.fn()
    await saveCardVideo(CARD, 'Music', worker.send, { onSaved, onFailed })
    expect(worker.received[0]).toMatchObject({ action: 'SAVE_VIDEO', category: 'Music', video: { id: CARD.id } })
    expect(onSaved).toHaveBeenCalledOnce()
    expect(onFailed).not.toHaveBeenCalled()
  })

  it('regression: a rejected save reports failure instead of doing nothing', async () => {
    const onSaved = vi.fn()
    const onFailed = vi.fn()
    await saveCardVideo(CARD, 'Music', new FakeWorker(REJECTED).send, { onSaved, onFailed })
    expect(onFailed).toHaveBeenCalledOnce()
    expect(onSaved).not.toHaveBeenCalled()
  })
})
