import { expect, it, vi } from 'vitest'
import { backgroundTask } from './background-task'

it('reports failed event maintenance without an unhandled rejection', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    backgroundTask('refresh', Promise.reject(new Error('Incomplete sync')))
    await Promise.resolve()
    expect(JSON.parse(log.mock.calls[0][0])).toEqual({
      source: 'mytube.background', task: 'refresh', error: 'Incomplete sync',
    })
  } finally {
    log.mockRestore()
  }
})
