// Thin wrapper around chrome.runtime.sendMessage for the new tab page.

import { Message, MessageResponse, StorageData } from '../src/types'

export function send(message: Message): Promise<MessageResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: MessageResponse) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message || 'unknown' })
        return
      }
      resolve(response)
    })
  })
}

// Most mutations return the fresh StorageData; this unwraps it or returns null.
export async function mutate(message: Message): Promise<StorageData | null> {
  const res = await send(message)
  if (res.ok && 'data' in res && res.data) return res.data
  return null
}

export async function getBytesInUse(): Promise<number> {
  return chrome.storage.sync.getBytesInUse('mytube')
}
