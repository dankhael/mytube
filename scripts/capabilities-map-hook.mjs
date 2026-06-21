// Stop gate: refuses to finish while the capability map has drifted from the specs.
// If the working tree has changes to any specs/*.spec.md but specs/CAPABILITIES.md
// is untouched, the map is stale — exit 2 (blocking, stderr fed back to the agent)
// so CAPABILITIES.md gets updated in the same PR that lands the spec (see CLAUDE.md).
//
// It's a Stop hook, not PostToolUse, on purpose: you edit the spec before the map,
// so a per-edit check would block the legitimate mid-work sequence. This only fires
// at the end of a turn, the right checkpoint for "don't leave the repo drifted."
// Node-based so it behaves identically under PowerShell, cmd, or bash.

import { spawnSync } from 'node:child_process'

let input = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => (input += chunk))
process.stdin.on('end', () => {
  // Honor the loop guard: if we already blocked once this chain, don't block again.
  let stopHookActive = false
  try {
    stopHookActive = JSON.parse(input)?.stop_hook_active === true
  } catch {
    // No/malformed payload — treat as a normal first stop.
  }
  if (stopHookActive) process.exit(0)

  const res = spawnSync('git', ['status', '--porcelain', '--', 'specs/'], {
    encoding: 'utf8',
    shell: true,
  })
  // Not a repo / git unavailable — nothing to gate on.
  if (res.status !== 0) process.exit(0)

  const changed = (res.stdout ?? '')
    .split('\n')
    .map((line) => line.slice(3).trim())
    // Renames render as "old -> new"; the new path is what matters.
    .map((path) => (path.includes(' -> ') ? path.split(' -> ')[1] : path))
    .filter(Boolean)

  const specChanged = changed.some(
    (p) => /specs\/.+\.spec\.md$/.test(p) && !p.endsWith('_TEMPLATE.spec.md'),
  )
  const mapChanged = changed.some((p) => p.endsWith('specs/CAPABILITIES.md'))

  if (specChanged && !mapChanged) {
    process.stderr.write(
      '[capabilities-map] A specs/*.spec.md changed but specs/CAPABILITIES.md was not ' +
        'updated. Update the matching capability bullet (or table row) so the map ' +
        "doesn't drift, then finish. See CLAUDE.md → Workflow.\n",
    )
    process.exit(2)
  }
  process.exit(0)
})
