import { describe, expect, it } from 'vitest'
import { sendMessage } from './messages'
import type { MessageRuntime } from './browser-platform'
import type { Message } from './types'

class FakeRuntime implements MessageRuntime {
  lastError?: { message?: string }
  reply: unknown = { ok: true }
  failure?: Error
  sendMessage(_message: Message, callback: (reply: unknown) => void): void {
    if (this.failure) throw this.failure
    callback(this.reply)
  }
}

describe('shared message transport', () => {
  it('ARCH-2: returns valid success and application errors unchanged', async () => {
    const runtime = new FakeRuntime()
    expect(await sendMessage({ action: 'OPEN_HOME' }, { runtime })).toEqual({ ok: true })
    runtime.reply = { ok: false, error: 'quota exceeded' }
    expect(await sendMessage({ action: 'GET_ALL' }, { runtime })).toEqual(runtime.reply)
  })

  it('ARCH-2: callback errors do not tear down a live content script', async () => {
    const runtime = new FakeRuntime()
    runtime.lastError = { message: 'Receiving end does not exist' }
    let orphaned = false
    expect(await sendMessage({ action: 'GET_ALL' }, {
      runtime, onUnavailable: () => { orphaned = true },
    })).toEqual({ ok: false, error: runtime.lastError.message })
    expect(orphaned).toBe(false)
  })

  it('ARCH-2: synchronous invalidation tears down once and resolves an error', async () => {
    const runtime = new FakeRuntime()
    runtime.failure = new Error('Extension context invalidated')
    let calls = 0
    expect(await sendMessage({ action: 'GET_ALL' }, {
      runtime, onUnavailable: () => { calls++ },
    })).toEqual({ ok: false, error: 'Extension context invalidated' })
    expect(calls).toBe(1)
  })

  it('RECOVER-1: passes an export through and rejects a malformed one', async () => {
    const runtime = new FakeRuntime()
    runtime.reply = { ok: true, syncKeys: { 'mytube:meta': 'anything at all' } }
    expect(await sendMessage({ action: 'EXPORT_SYNC_KEYS' }, { runtime })).toEqual(runtime.reply)
    runtime.reply = { ok: true, syncKeys: null }
    expect(await sendMessage({ action: 'EXPORT_SYNC_KEYS' }, { runtime })).toMatchObject({ ok: false })
  })

  it('RECOVER-3: passes a preview through and rejects malformed ones', async () => {
    const runtime = new FakeRuntime()
    const preview = {
      metadata: 'valid', verifiedVideos: 1, unverifiedVideos: 0, unavailableChunks: 0,
      chunks: [{ key: 'mytube:videos:0', state: 'intact', videoCount: 1, possiblyRewritten: false }],
    }
    runtime.reply = { ok: true, recoveryPreview: preview }
    expect(await sendMessage({ action: 'PREVIEW_SYNC_RECOVERY' }, { runtime })).toEqual(runtime.reply)
    for (const recoveryPreview of [null, {}, { ...preview, chunks: [null] }, { ...preview, verifiedVideos: '1' }, { ...preview, unverifiedVideos: undefined }]) {
      runtime.reply = { ok: true, recoveryPreview }
      expect(await sendMessage({ action: 'PREVIEW_SYNC_RECOVERY' }, { runtime })).toMatchObject({ ok: false })
    }
  })

  it('ARCH-2: rejects absent and malformed envelopes instead of crashing callers', async () => {
    const runtime = new FakeRuntime()
    for (const reply of [undefined, null, {}, { ok: 'yes' }, { ok: false }, { ok: true, data: null }, { ok: true, ids: [null] }]) {
      runtime.reply = reply
      expect(await sendMessage({ action: 'GET_ALL' }, { runtime })).toMatchObject({ ok: false })
    }
  })
})
