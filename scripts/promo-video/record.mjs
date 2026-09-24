// Records every browser scene of the storyboard into `<clipsDir>/<id>.mp4`.
// Order is dictated by state, not by the storyboard: seed the library, save
// from YouTube, then film the home that now holds those saves.

import { extensionId } from '../store-assets/browser.mjs'
import { prepareHome, recordHomeScenes, recordThemeFlip } from './home-scenes.mjs'
import { recordPopup } from './popup-scene.mjs'
import { launchRecordingBrowser } from './session.mjs'
import { recordHomeReminder, recordPlaylistImport, recordSaveCard } from './youtube-scenes.mjs'

/**
 * Films all browser scenes; `only` limits the run to some scene ids for retakes.
 * @example
 *   await recordAllScenes('dist', 'build/promo-video/clips', new Set(['home-search']))
 */
export async function recordAllScenes(extensionPath, clipsDir, only = null) {
  const wants = (id) => !only || only.has(id)
  const context = await launchRecordingBrowser(extensionPath)
  try {
    const id = await extensionId(context)
    const home = await prepareHome(context, id)
    if (wants('yt-save')) await recordSaveCard(context, clipsDir)
    // Out of the cut (see storyboard.mjs), so only filmed when asked for by id.
    if (only?.has('yt-playlist')) await recordPlaylistImport(context, clipsDir)
    if (['home-library', 'home-search', 'home-category', 'home-move'].some(wants)) {
      await recordHomeScenes(home, clipsDir)
    }
    if (wants('popup')) await recordPopup(context, id, home, clipsDir)
    if (wants('yt-reminder')) await recordHomeReminder(context, home, clipsDir)
    if (wants('home-theme')) await recordThemeFlip(context, id, clipsDir)
  } finally {
    await context.close()
  }
}
