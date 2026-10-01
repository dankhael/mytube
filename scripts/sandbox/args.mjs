// Command-line flags for the throwaway test browser (npm run sandbox).

/**
 * Chromium flags for an isolated profile that loads only `extensionDir`.
 * @example sandboxArgs('/repo/dist', '/repo/.sandbox-profile', 'https://www.youtube.com/')
 */
export function sandboxArgs(extensionDir, profileDir, startUrl) {
  return [
    // Own profile dir: never touches the real browser's cookies, history or the
    // store-installed MyTube; delete the folder to start from scratch.
    `--user-data-dir=${profileDir}`,
    `--disable-extensions-except=${extensionDir}`,
    `--load-extension=${extensionDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    startUrl,
  ]
}
