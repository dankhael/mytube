// Saves text as a local file. A blob link needs no manifest permission and nothing
// leaves the machine (spec sync-recovery, Decisions).

type ObjectUrls = Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>

/**
 * Starts a download of `text` named `filename`.
 * @example downloadTextFile('backup.json', '{"a":1}')
 */
export function downloadTextFile(filename: string, text: string, urls: ObjectUrls = URL): void {
  const url = urls.createObjectURL(new Blob([text], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  // Revoking in the same tick can cancel the download before it starts.
  setTimeout(() => urls.revokeObjectURL(url), 0)
}

/** @example backupFilename(new Date('2026-11-04')) // 'mytube-backup-2026-11-04.json' */
export function backupFilename(date: Date): string {
  return `mytube-backup-${date.toISOString().slice(0, 10)}.json`
}
