// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { backupFilename, downloadTextFile } from './download-file'

// jsdom's Blob has no text().
function blobText(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.readAsText(blob)
  })
}

class FakeObjectUrls {
  created: Blob[] = []
  revoked: string[] = []
  createObjectURL(blob: Blob): string {
    this.created.push(blob)
    return 'blob:fake-url'
  }
  revokeObjectURL(url: string): void {
    this.revoked.push(url)
  }
}

describe('downloadTextFile', () => {
  it('saves the exact text under the given name and releases the URL', async () => {
    const urls = new FakeObjectUrls()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('backup.json')
      expect(this.href).toBe('blob:fake-url')
    })
    vi.useFakeTimers()

    downloadTextFile('backup.json', '{"a":1}', urls)

    expect(click).toHaveBeenCalledOnce()
    expect(urls.revoked).toEqual([])
    vi.runAllTimers()
    vi.useRealTimers()
    expect(urls.revoked).toEqual(['blob:fake-url'])
    expect(await blobText(urls.created[0])).toBe('{"a":1}')
    click.mockRestore()
  })
})

describe('backupFilename', () => {
  it('names the backup after the day it was taken', () => {
    expect(backupFilename(new Date('2026-11-04T12:00:00Z'))).toBe('mytube-backup-2026-11-04.json')
  })
})
