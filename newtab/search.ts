// Home search — pure helpers so the filter is Node-testable.

import { Video } from '../src/types'

export function matchesQuery(video: Video, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    video.title.toLowerCase().includes(q) || video.channelName.toLowerCase().includes(q)
  )
}

export function filterVideos(videos: Video[], query: string): Video[] {
  if (!query.trim()) return videos
  return videos.filter((v) => matchesQuery(v, query))
}
