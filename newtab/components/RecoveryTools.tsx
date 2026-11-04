import { useState } from 'react'
import { type Language, type MessageKey, t } from '../../src/i18n'
import type { Message, MessageResponse, SyncChunkReport, SyncChunkState, SyncRecoveryPreview } from '../../src/types'
import { send as sendToWorker } from '../api'
import { backupFilename, downloadTextFile } from '../download-file'

type SendToWorker = (message: Message) => Promise<MessageResponse>
type SaveFile = (filename: string, text: string) => void

interface RecoveryToolsProps {
  language: Language
  send?: SendToWorker
  saveFile?: SaveFile
  now?: () => Date
}

const STATE_LABEL: Record<SyncChunkState, MessageKey> = {
  intact: 'recovery.state.intact',
  mismatching: 'recovery.state.mismatching',
  malformed: 'recovery.state.malformed',
  missing: 'recovery.state.missing',
}

const BUTTON_CLASS = 'flex-none rounded-md border border-red-400/40 px-3 py-1 hover:bg-red-500/20 focus-visible:outline focus-visible:outline-2'

function videoCount(count: number, language: Language): string {
  return `${count} ${t(count === 1 ? 'common.video' : 'common.videos', language)}`
}

function previewSummary(preview: SyncRecoveryPreview, language: Language): string {
  return t('recovery.summary', language, {
    verified: videoCount(preview.verifiedVideos, language),
    unverified: videoCount(preview.unverifiedVideos, language),
    chunks: preview.unavailableChunks,
    total: preview.chunks.length,
  })
}

// Resolves to what went wrong, or null once the file is on its way.
async function exportBackup(send: SendToWorker, saveFile: SaveFile, date: Date): Promise<MessageKey | null> {
  const response = await send({ action: 'EXPORT_SYNC_KEYS' })
  if (!response.ok || !('syncKeys' in response)) return 'recovery.exportFailed'
  saveFile(backupFilename(date), JSON.stringify(response.syncKeys, null, 2))
  return null
}

async function fetchPreview(send: SendToWorker): Promise<SyncRecoveryPreview | null> {
  const response = await send({ action: 'PREVIEW_SYNC_RECOVERY' })
  return response.ok && 'recoveryPreview' in response ? response.recoveryPreview : null
}

function ChunkRow({ chunk, number, language }: { chunk: SyncChunkReport; number: number; language: Language }) {
  const state = t(STATE_LABEL[chunk.state], language)
  return (
    <li>
      {t('recovery.part', language, { number, state, videos: videoCount(chunk.videoCount, language) })}
      {chunk.possiblyRewritten && <>. {t('recovery.rewritten', language)}</>}
    </li>
  )
}

function PreviewReport({ preview, language }: { preview: SyncRecoveryPreview; language: Language }) {
  return (
    <div className="w-full">
      {preview.metadata !== 'valid' && <p>{t(`recovery.metadata.${preview.metadata}`, language)}</p>}
      <p>{previewSummary(preview, language)}</p>
      <ul className="mt-1 list-inside list-disc">
        {preview.chunks.map((chunk, index) => (
          <ChunkRow key={chunk.key} chunk={chunk} number={index + 1} language={language} />
        ))}
      </ul>
    </div>
  )
}

/**
 * Slice 1 of spec sync-recovery: both actions only read, so neither asks to confirm,
 * and there is deliberately nothing here that repairs.
 * @example <RecoveryTools language="en" />
 */
export default function RecoveryTools({
  language, send = sendToWorker, saveFile = downloadTextFile, now = () => new Date(),
}: RecoveryToolsProps) {
  const [preview, setPreview] = useState<SyncRecoveryPreview | null>(null)
  const [failure, setFailure] = useState<MessageKey | null>(null)
  const runExport = async () => setFailure(await exportBackup(send, saveFile, now()))
  const runCheck = async () => {
    const report = await fetchPreview(send)
    setPreview(report)
    setFailure(report ? null : 'recovery.checkFailed')
  }
  return (
    <>
      <button className={BUTTON_CLASS} onClick={() => void runExport()}>{t('recovery.export', language)}</button>
      <button className={BUTTON_CLASS} onClick={() => void runCheck()}>{t('recovery.check', language)}</button>
      {failure && <p role="status" className="w-full">{t(failure, language)}</p>}
      {preview && <PreviewReport preview={preview} language={language} />}
    </>
  )
}
