// Saving a card, apart from content.ts so the failure path is testable: a rejected
// save used to look like a dead button, with nothing telling the user to try again.

import { Message, MessageResponse } from '../src/types'
import { CardData } from './extract-card'

export type SendToWorker = (message: Message) => Promise<MessageResponse>

export interface SaveCardCallbacks {
  onSaved: () => void
  onFailed: () => void
}

/**
 * Saves `card` into `category` and reports which way it went.
 * @example await saveCardVideo(card, 'Music', sendMessage, { onSaved, onFailed })
 */
export async function saveCardVideo(
  card: CardData,
  category: string,
  send: SendToWorker,
  callbacks: SaveCardCallbacks,
): Promise<void> {
  const { id, title, thumbnail, channelName, channelThumbnail, duration } = card
  const video = { id, title, thumbnail, channelName, channelThumbnail, duration }
  const res = await send({ action: 'SAVE_VIDEO', video, category })
  if (res.ok) callbacks.onSaved()
  else callbacks.onFailed()
}
