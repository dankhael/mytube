// @vitest-environment jsdom
// Home side of specs/sync-recovery.spec.md, slice 1.

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RecoveryTools from './RecoveryTools'
import type { Message, MessageResponse, SyncRecoveryPreview } from '../../src/types'

const PREVIEW: SyncRecoveryPreview = {
  metadata: 'valid',
  verifiedVideos: 31,
  unverifiedVideos: 30,
  unavailableChunks: 1,
  chunks: [
    { key: 'mytube:videos:0', state: 'intact', videoCount: 31, possiblyRewritten: false },
    { key: 'mytube:videos:1', state: 'mismatching', videoCount: 30, possiblyRewritten: true },
    { key: 'mytube:videos:2', state: 'missing', videoCount: 0, possiblyRewritten: false },
  ],
}

// The service worker, as the component reaches it.
class ScriptedWorker {
  received: Message[] = []
  constructor(public reply: MessageResponse) {}
  send = async (message: Message): Promise<MessageResponse> => {
    this.received.push(message)
    return this.reply
  }
}

class RecordingFileSaver {
  saved: { filename: string; text: string }[] = []
  save = (filename: string, text: string): void => {
    this.saved.push({ filename, text })
  }
}

afterEach(cleanup)

describe('RecoveryTools', () => {
  it('RECOVER-1: export saves the keys exactly as the worker returned them', async () => {
    const syncKeys = { 'mytube:meta': { generation: 3 }, 'mytube:videos:0': { videos: 'tampered' } }
    const worker = new ScriptedWorker({ ok: true, syncKeys })
    const files = new RecordingFileSaver()
    render(<RecoveryTools language="en" send={worker.send} saveFile={files.save} now={() => new Date('2026-11-04T12:00:00Z')} />)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Export backup' }))

    expect(worker.received).toEqual([{ action: 'EXPORT_SYNC_KEYS' }])
    expect(files.saved).toHaveLength(1)
    expect(files.saved[0].filename).toBe('mytube-backup-2026-11-04.json')
    expect(JSON.parse(files.saved[0].text)).toEqual(syncKeys)
  })

  it('RECOVER-1: a failed export says so and saves nothing', async () => {
    const worker = new ScriptedWorker({ ok: false, error: 'storage unavailable' })
    const files = new RecordingFileSaver()
    render(<RecoveryTools language="en" send={worker.send} saveFile={files.save} />)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Export backup' }))

    expect(files.saved).toEqual([])
    expect(screen.getByRole('status').textContent).toContain("Couldn't export")
  })

  it('RECOVER-3: check lists every chunk with its state, videos and the totals', async () => {
    const worker = new ScriptedWorker({ ok: true, recoveryPreview: PREVIEW })
    render(<RecoveryTools language="en" send={worker.send} />)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Check library' }))

    expect(worker.received).toEqual([{ action: 'PREVIEW_SYNC_RECOVERY' }])
    const rows = within(screen.getByRole('list')).getAllByRole('listitem').map((row) => row.textContent)
    expect(rows[0]).toContain('Part 1: intact, 31 videos')
    expect(rows[1]).toContain('Part 2: not verified, 30 videos')
    expect(rows[2]).toContain('Part 3: missing, 0 videos')
    expect(screen.getByText('Verified: 31 videos. Present but not verified: 30 videos. Unavailable: 1 of 3 parts.')).toBeTruthy()
  })

  it('RECOVER-3: zero verified still shows the videos that are present', async () => {
    const recoveryPreview = { ...PREVIEW, verifiedVideos: 0, unverifiedVideos: 1 }
    render(<RecoveryTools language="en" send={new ScriptedWorker({ ok: true, recoveryPreview }).send} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Check library' }))
    expect(screen.getByText(/Verified: 0 videos\. Present but not verified: 1 video\./)).toBeTruthy()
  })

  it('RECOVER-4: the rewritten-text note appears only on the flagged chunk, with no repair offered', async () => {
    const worker = new ScriptedWorker({ ok: true, recoveryPreview: PREVIEW })
    render(<RecoveryTools language="en" send={worker.send} />)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Check library' }))

    const rows = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(rows[1].textContent).toContain('30 videos. Has replaced characters')
    expect(rows[1].textContent).toContain('may have been rewritten')
    expect(rows[0].textContent).not.toContain('may have been rewritten')
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Export backup', 'Check library'])
  })

  it('RECOVER-3: a single video reads as singular', async () => {
    const recoveryPreview: SyncRecoveryPreview = {
      ...PREVIEW, verifiedVideos: 1, unverifiedVideos: 0, unavailableChunks: 0,
      chunks: [{ key: 'mytube:videos:0', state: 'intact', videoCount: 1, possiblyRewritten: false }],
    }
    render(<RecoveryTools language="en" send={new ScriptedWorker({ ok: true, recoveryPreview }).send} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Check library' }))
    expect(screen.getByRole('listitem').textContent).toBe('Part 1: intact, 1 video')
    expect(screen.getByText(/^Verified: 1 video\./)).toBeTruthy()
  })

  it('RECOVER-3: says when the index itself is the problem', async () => {
    const recoveryPreview: SyncRecoveryPreview = { ...PREVIEW, metadata: 'missing' }
    render(<RecoveryTools language="en" send={new ScriptedWorker({ ok: true, recoveryPreview }).send} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Check library' }))
    expect(screen.getByText(/index is missing/)).toBeTruthy()
  })

  it('RECOVER-3: a failed check says so and shows no stale list', async () => {
    const worker = new ScriptedWorker({ ok: true, recoveryPreview: PREVIEW })
    render(<RecoveryTools language="en" send={worker.send} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Check library' }))
    worker.reply = { ok: false, error: 'nope' }

    await user.click(screen.getByRole('button', { name: 'Check library' }))

    expect(screen.getByRole('status').textContent).toContain("Couldn't check")
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('shows its copy in the chosen language', async () => {
    const worker = new ScriptedWorker({ ok: true, recoveryPreview: PREVIEW })
    render(<RecoveryTools language="pt-BR" send={worker.send} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Verificar biblioteca' }))
    expect(screen.getByRole('button', { name: 'Exportar backup' })).toBeTruthy()
    expect(screen.getByText(/Parte 3: ausente, 0 vídeos/)).toBeTruthy()
    expect(screen.getByText(/Presentes, mas não verificados: 30 vídeos/)).toBeTruthy()
  })
})
