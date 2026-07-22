// @vitest-environment jsdom
// Regression: the "move video to…" modal showed the legacy `emoji` (📁) instead
// of the category's resolved icon — same drift as the content-script picker
// (see content/picker-item.test.ts). Rows must render the resolved monochrome
// icon, matching the home tiles (HICON-4 extended to this surface).

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { IconKey } from '../../src/category-icon'
import { Video } from '../../src/types'
import CategoryIcon from './CategoryIcon'
import SaveToModal from './SaveToModal'

// The exact markup CategoryIcon produces for a key — avoids coupling the test
// to lucide's internal class-naming scheme.
function iconMarkup(icon: IconKey): string {
  const { container, unmount } = render(<CategoryIcon icon={icon} size={16} />)
  const markup = container.querySelector('svg')!.outerHTML
  unmount()
  return markup
}

afterEach(cleanup)

const video: Video = {
  id: 'dQw4w9WgXcQ',
  title: 'Final da Série B',
  thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
  channelName: 'CazéTV',
  category: 'Esportes',
  addedAt: 1_700_000_000_000,
  watched: false,
}

describe('SaveToModal category icons', () => {
  it('renders each category with its resolved icon, never the stored emoji', () => {
    render(
      <SaveToModal
        video={video}
        categories={[
          { name: 'Esportes', emoji: '📁' }, // auto-maps to trophy
          { name: 'Games', emoji: '📁', icon: 'gamepad' }, // explicit icon wins
        ]}
        onClose={vi.fn()}
        onMove={vi.fn()}
      />,
    )
    expect(screen.queryByText('📁')).toBeNull()
    const rows = screen.getAllByRole('button', { name: /Esportes|Games/ })
    expect(rows[0].querySelector('svg')?.outerHTML).toBe(iconMarkup('trophy'))
    expect(rows[1].querySelector('svg')?.outerHTML).toBe(iconMarkup('gamepad'))
  })
})
