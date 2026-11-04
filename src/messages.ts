import { browserPlatform, type MessageRuntime } from './browser-platform'
import type { Message, MessageResponse } from './types'

interface MessageOptions {
  runtime?: MessageRuntime
  onUnavailable?: () => void
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isRecoveryPreview(value: unknown): boolean {
  return isObject(value) && typeof value.metadata === 'string'
    && typeof value.verifiedVideos === 'number' && typeof value.unverifiedVideos === 'number'
    && typeof value.unavailableChunks === 'number'
    && Array.isArray(value.chunks) && value.chunks.every((chunk: unknown) =>
      isObject(chunk) && typeof chunk.key === 'string' && typeof chunk.state === 'string'
      && typeof chunk.videoCount === 'number')
}

function responseEnvelope(value: unknown): value is MessageResponse {
  if (!value || typeof value !== 'object' || !('ok' in value)) return false
  if (value.ok === false) return 'error' in value && typeof value.error === 'string'
  if (value.ok !== true) return false
  if ('data' in value) {
    const data = value.data
    return !!data && typeof data === 'object' && 'videos' in data && Array.isArray(data.videos)
      && 'categories' in data && Array.isArray(data.categories)
      && 'settings' in data && !!data.settings && typeof data.settings === 'object'
  }
  if ('syncKeys' in value) return isObject(value.syncKeys)
  if ('recoveryPreview' in value) return isRecoveryPreview(value.recoveryPreview)
  return !('ids' in value) || (Array.isArray(value.ids) && value.ids.every((entry: unknown) =>
    !!entry && typeof entry === 'object' && 'id' in entry && typeof entry.id === 'string'
    && 'category' in entry && typeof entry.category === 'string'))
}

// lastError is only available during the callback; never read it later.
function settledReply(runtime: MessageRuntime, response: unknown): MessageResponse {
  const error = runtime.lastError
  if (error) return { ok: false, error: error.message || 'Runtime message failed' }
  return responseEnvelope(response) ? response : { ok: false, error: 'Invalid background response' }
}

/** Shared transport for popup/home/content; sendMessage({ action: 'GET_ALL' }). */
export function sendMessage(message: Message, options: MessageOptions = {}): Promise<MessageResponse> {
  return new Promise((resolve) => {
    try {
      const runtime = options.runtime ?? browserPlatform().runtime
      runtime.sendMessage(message, (response: unknown) => resolve(settledReply(runtime, response)))
    } catch (error) {
      resolve({ ok: false, error: error instanceof Error ? error.message : String(error) })
      options.onUnavailable?.()
    }
  })
}
