// Browser event callbacks cannot await our background maintenance. Always
// observe rejections, especially while remote sync is temporarily incomplete.
export function backgroundTask(name: string, task: Promise<unknown>): void {
  void task.catch((error: unknown) => {
    console.error(JSON.stringify({
      source: 'mytube.background', task: name,
      error: error instanceof Error ? error.message : String(error),
    }))
  })
}
