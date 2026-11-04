// Home-facing mutation results and quota reads over the shared browser transport.

import { StorageData, Message } from '../src/types'
import { sendMessage as send } from '../src/messages'
import { browserPlatform } from '../src/browser-platform'

export { send }

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
  return browserPlatform().sync.getBytesInUse(null)
}
