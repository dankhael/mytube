// Sample library used by every populated screenshot. Seeded through the real
// message contract (`SAVE_VIDEO` & friends) so the shots show the extension's
// own reducer output, never hand-written storage.

function video(id, title, channelName, category, duration = undefined) {
  return {
    action: 'SAVE_VIDEO',
    category,
    video: { id, title, channelName, duration, thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` },
  }
}

export const SAMPLE_VIDEOS = [
  video('dQw4w9WgXcQ', 'Rick Astley - Never Gonna Give You Up (Official Video)', 'Rick Astley', 'Music', '3:33'),
  video(
    'M7lc1UVf-VE',
    'YouTube Developers Live: Embedded Web Player Customization',
    'Google for Developers',
    'Tutorials',
  ),
  video('jNQXAC9IVRw', 'Me at the zoo', 'jawed', 'Entertainment', '0:19'),
  video(
    'aqz-KE-bpKQ',
    'Big Buck Bunny 60fps 4K - Official Blender Foundation Short Film',
    'Blender',
    'Design',
    '10:34',
  ),
  video('ysz5S6PUM-U', 'Chilled Serenity #5', 'Xquisite', 'Music'),
]

export async function sendMessage(page, message) {
  const response = await page.evaluate(
    (payload) => new Promise((resolve) => chrome.runtime.sendMessage(payload, resolve)),
    message,
  )
  if (!response?.ok) throw new Error(`Seed message failed: ${JSON.stringify({ message, response })}`)
  return response
}

export function updateSettings(page, settings) {
  return sendMessage(page, { action: 'UPDATE_SETTINGS', settings })
}

export async function clearStore(page) {
  await page.evaluate(() => chrome.storage.sync.clear())
  await page.reload()
  await page.getByRole('heading', { name: /curated by you/i }).waitFor()
}

// Two categories on top of the seeded defaults, five videos, one already
// watched — enough for the category grid, the smart sections and the chips row
// to all have something to show.
export async function seedLibrary(page) {
  await sendMessage(page, { action: 'ADD_CATEGORY', name: 'Design', emoji: '🎨', icon: 'palette' })
  await sendMessage(page, { action: 'ADD_CATEGORY', name: 'Music', emoji: '🎵', icon: 'music' })
  for (const message of SAMPLE_VIDEOS) await sendMessage(page, message)
  await sendMessage(page, { action: 'MARK_WATCHED', id: 'jNQXAC9IVRw', watched: true })
  await page.reload()
  await page.getByRole('heading', { name: 'Welcome back.' }).waitFor()
}

export async function waitForImages(page) {
  await page
    .waitForFunction(() => Array.from(document.images).every((image) => image.complete), null, {
      timeout: 10_000,
    })
    .catch(() => undefined)
}
