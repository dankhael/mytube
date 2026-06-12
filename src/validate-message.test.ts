// Executable spec for specs/security-hardening.spec.md (SEC-1..SEC-13).
// The service worker is the trust boundary: anything running inside youtube.com
// can craft runtime.sendMessage payloads, so the compile-time Message union has
// to be enforced at runtime (security review finding S2).

import { describe, expect, it } from 'vitest'
import { ALL_ICONS, IconKey } from './category-icon'
import { Message } from './types'
import {
  ValidationResult,
  canonicalThumbnail,
  clampText,
  isIconKey,
  isYoutubeVideoId,
  validateIncomingMessage,
} from './validate-message'

const VALID_ID = 'dQw4w9WgXcQ'
const CANONICAL = `https://i.ytimg.com/vi/${VALID_ID}/mqdefault.jpg`

// What content/content.ts builds and sends for a card today (extractCard).
function saveVideoMessage(): Extract<Message, { action: 'SAVE_VIDEO' }> {
  return {
    action: 'SAVE_VIDEO',
    video: { id: VALID_ID, title: 'Vídeo real', thumbnail: CANONICAL, channelName: 'Canal X' },
    category: 'Tutoriais',
  }
}

function accepted(result: ValidationResult): Message {
  if (!result.ok) throw new Error(`expected ok result, got error: ${result.error}`)
  return result.message
}

function expectRejectedId(result: ValidationResult, offendingId: string): void {
  if (result.ok) throw new Error(`expected rejection of ${JSON.stringify(offendingId)}, got ok`)
  expect(result.error).toContain(offendingId)
  expect(result.error).toContain('[\\w-]{11}')
}

describe('security-hardening.spec — validate-message', () => {
  it('SEC-1: an 11-char [\\w-] id is a valid YouTube video id', () => {
    expect(isYoutubeVideoId(VALID_ID)).toBe(true)
  })

  it('SEC-2: wrong length, illegal chars and non-strings are not video ids', () => {
    const invalid: unknown[] = ['', 'abcdefghij', 'abcdefghijkl', '<script>abc', 'aaaa?bbbbbb', 42]
    for (const value of invalid) {
      expect(isYoutubeVideoId(value), `expected ${JSON.stringify(value)} to be rejected`).toBe(false)
    }
  })

  it('SEC-3: the canonical thumbnail candidate passes through unchanged', () => {
    expect(canonicalThumbnail(VALID_ID, CANONICAL)).toBe(CANONICAL)
  })

  it('SEC-4: any other thumbnail candidate is replaced by the canonical URL', () => {
    const candidates = ['https://evil.example/pixel.gif', 'https://i.ytimg.com/vi/otherVideo1/mqdefault.jpg', '']
    for (const candidate of candidates) {
      expect(canonicalThumbnail(VALID_ID, candidate)).toBe(CANONICAL)
    }
  })

  it('SEC-5: every member of ALL_ICONS is a valid icon key', () => {
    for (const key of ALL_ICONS) {
      expect(isIconKey(key), `expected ${key} to be accepted`).toBe(true)
    }
  })

  it('SEC-6: values outside the closed icon set are not icon keys', () => {
    const invalid: unknown[] = ['skull', '', undefined, 42]
    for (const value of invalid) {
      expect(isIconKey(value), `expected ${JSON.stringify(value)} to be rejected`).toBe(false)
    }
  })

  it('SEC-7: text longer than 300 chars is clamped, shorter passes unchanged', () => {
    expect(clampText('x'.repeat(400))).toBe('x'.repeat(300))
    expect(clampText('y'.repeat(300))).toBe('y'.repeat(300))
  })

  it('SEC-8: a SAVE_VIDEO with a malformed id is rejected naming value and shape', () => {
    const message = saveVideoMessage()
    message.video.id = 'bad?id!!'
    expectRejectedId(validateIncomingMessage(message), 'bad?id!!')
  })

  it('SEC-9: DELETE_VIDEO, MOVE_VIDEO and MARK_WATCHED reject malformed ids', () => {
    const messages: Message[] = [
      { action: 'DELETE_VIDEO', id: 'nope' },
      { action: 'MOVE_VIDEO', id: 'nope', category: 'Tutoriais' },
      { action: 'MARK_WATCHED', id: 'nope', watched: true },
    ]
    for (const message of messages) {
      expectRejectedId(validateIncomingMessage(message), 'nope')
    }
  })

  it('SEC-10: the payload the content script sends today passes through deep-equal', () => {
    const message = saveVideoMessage()
    const original = structuredClone(message)
    expect(accepted(validateIncomingMessage(message))).toEqual(original)
  })

  it('SEC-11: a non-canonical thumbnail is normalized to the canonical URL', () => {
    const message = saveVideoMessage()
    message.video.thumbnail = 'https://evil.example/pixel.gif'
    const validated = accepted(validateIncomingMessage(message))
    if (validated.action !== 'SAVE_VIDEO') throw new Error('action changed by validation')
    expect(validated.video.thumbnail).toBe(CANONICAL)
  })

  it('SEC-12: an icon outside the closed set reads as unset in category messages', () => {
    const add: Message = { action: 'ADD_CATEGORY', name: 'Caveiras', emoji: '💀', icon: 'skull' as IconKey }
    const update: Message = {
      action: 'UPDATE_CATEGORY',
      oldName: 'Caveiras',
      name: 'Caveiras',
      emoji: '💀',
      icon: 'skull' as IconKey,
    }
    for (const message of [add, update]) {
      const validated = accepted(validateIncomingMessage(message))
      if (!('icon' in validated)) throw new Error('expected a category message back')
      expect(validated.icon).toBeUndefined()
    }
  })

  it('SEC-13: storage-bound text fields are truncated to 300 chars', () => {
    const long = 'a'.repeat(400)
    const save = saveVideoMessage()
    save.video.title = long
    save.video.channelName = long
    save.category = long
    const validatedSave = accepted(validateIncomingMessage(save))
    if (validatedSave.action !== 'SAVE_VIDEO') throw new Error('action changed by validation')
    expect(validatedSave.video.title).toHaveLength(300)
    expect(validatedSave.video.channelName).toHaveLength(300)
    expect(validatedSave.category).toHaveLength(300)

    const add: Message = { action: 'ADD_CATEGORY', name: long, emoji: '📁' }
    const validatedAdd = accepted(validateIncomingMessage(add))
    if (validatedAdd.action !== 'ADD_CATEGORY') throw new Error('action changed by validation')
    expect(validatedAdd.name).toHaveLength(300)
  })
})
