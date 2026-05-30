// PostToolUse gate: runs the Vitest suite after the agent edits a source file.
// Reads the hook payload (JSON) on stdin, runs `vitest run` only when a relevant
// .ts/.tsx file changed, and exits 2 (blocking, stderr fed back to the agent) on
// failure so the model can't "finish" with the suite red. Node-based so it works
// the same under PowerShell, cmd, or bash.

import { spawnSync } from 'node:child_process'

let input = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => (input += chunk))
process.stdin.on('end', () => {
  let filePath = ''
  try {
    filePath = JSON.parse(input)?.tool_input?.file_path ?? ''
  } catch {
    // No/!malformed payload — nothing to gate on.
  }

  const norm = filePath.replace(/\\/g, '/')
  const isSource = /\/(src|newtab|background|content|popup)\/[^?]*\.(ts|tsx)$/.test(norm)
  if (!isSource) process.exit(0)

  const res = spawnSync('npx', ['vitest', 'run'], { encoding: 'utf8', shell: true })
  if (res.status === 0) process.exit(0)

  process.stderr.write((res.stdout ?? '') + (res.stderr ?? ''))
  process.stderr.write(`\n[test-hook] Vitest failed after editing ${norm} — fix the tests before continuing.\n`)
  process.exit(2)
})
