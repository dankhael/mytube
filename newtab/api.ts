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

export type MutationOutcome = { ok: true; data: StorageData } | { ok: false; error: string }

// Most mutations return the fresh StorageData; failures must stay observable
// (finding R3): the structured error is logged here — single choke point —
// and returned so the caller can surface it to the user.
export async function mutate(message: Message): Promise<MutationOutcome> {
  const res = await send(message)
  if (res.ok && 'data' in res && res.data) return { ok: true, data: res.data }
  const error = res.ok ? 'response carried no data' : res.error
  console.error(JSON.stringify({ source: 'mytube.newtab', action: message.action, error }))
  return { ok: false, error }
}

export async function getBytesInUse(): Promise<number> {
  return chrome.storage.sync.getBytesInUse('mytube')
}
