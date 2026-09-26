// Thin wrapper over the ffmpeg / ffprobe binaries on PATH — the only place the
// promo pipeline shells out, so a missing binary fails with one clear message.

import { spawn } from 'node:child_process'

function run(binary, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => (stdout += chunk))
    child.stderr.on('data', (chunk) => (stderr += chunk))
    child.on('error', (error) =>
      reject(new Error(`${binary} not runnable (need it on PATH): ${error.message}`)),
    )
    child.on('close', (code) => {
      if (code === 0) return resolve(stdout)
      reject(new Error(`${binary} exited ${code} for args ${JSON.stringify(args)}:\n${stderr.slice(-2000)}`))
    })
  })
}

export function ffmpeg(args) {
  return run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args])
}

// Duration in seconds of a media file, e.g. `await probeSeconds('clip.mp4') // 6.4`.
export async function probeSeconds(file) {
  const out = await run('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'csv=p=0',
    file,
  ])
  const seconds = Number.parseFloat(out)
  if (!Number.isFinite(seconds)) throw new Error(`ffprobe gave no duration for ${file}: got "${out.trim()}"`)
  return seconds
}

// Shared H.264 settings: visually lossless intermediates, yuv420p for players.
export const H264 = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p']
