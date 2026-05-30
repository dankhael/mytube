// Video metadata fallback. When DOM scraping on a YouTube surface fails (new
// "lockup" layouts, lazy renders), we backfill title/channel from YouTube's
// public oEmbed endpoint by videoId — no API key, same-origin from the content
// script, host-permitted from the service worker.

export const MISSING_TITLE = 'Sem título'
export const MISSING_CHANNEL = 'Canal desconhecido'

export interface VideoMetadata {
  title: string
  channelName: string
}

// Pure: true when title/channel are absent or still the scraping placeholders.
export function needsEnrichment(v: { title?: string; channelName?: string }): boolean {
  return (
    !v.title || v.title === MISSING_TITLE || !v.channelName || v.channelName === MISSING_CHANNEL
  )
}

// Best-effort network lookup. Returns null on any failure (private/region-locked
// videos answer 401) so callers can keep whatever they already have.
export async function fetchVideoMetadata(id: string): Promise<VideoMetadata | null> {
  try {
    const target = `https://www.youtube.com/watch?v=${id}`
    const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(target)}`
    const res = await fetch(url)
    if (!res.ok) return null
    const json = (await res.json()) as { title?: string; author_name?: string }
    const title = json.title?.trim() ?? ''
    const channelName = json.author_name?.trim() ?? ''
    if (!title && !channelName) return null
    return { title, channelName }
  } catch {
    return null
  }
}
