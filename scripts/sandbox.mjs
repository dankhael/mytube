// Opens a separate Chromium (Playwright's bundled build) with the freshly built
// extension, in its own profile under .sandbox-profile/ — for manual testing
// without touching the everyday browser or its store-installed MyTube. Launched
// as a plain process, not under Playwright automation, so signing into YouTube
// works like a normal browser. Branded Chrome ignores --load-extension since
// v137, hence the Playwright build.

import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { sandboxArgs } from './sandbox/args.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = sandboxArgs(join(root, 'dist'), join(root, '.sandbox-profile'), 'https://www.youtube.com/')

spawn(chromium.executablePath(), args, { detached: true, stdio: 'ignore' }).unref()
console.log('Sandbox Chromium opened (profile: .sandbox-profile/). After rebuilding, reload the extension in chrome://extensions.')
