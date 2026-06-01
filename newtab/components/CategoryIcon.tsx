import {
  BookOpen,
  Bookmark,
  Box,
  Code,
  Dumbbell,
  Film,
  FlaskConical,
  Gamepad2,
  Inbox,
  LayoutGrid,
  type LucideIcon,
  Music,
  Newspaper,
  Palette,
  Rocket,
  Trophy,
  Utensils,
} from 'lucide-react'
import { IconKey } from '../../src/category-icon'

// Home-side icon rendering (lucide-react). The IconKey is resolved upstream via
// resolveCategoryIcon, so this is a pure key → component lookup.
const ICONS: Record<IconKey, LucideIcon> = {
  grid: LayoutGrid,
  gamepad: Gamepad2,
  box: Box,
  book: BookOpen,
  inbox: Inbox,
  music: Music,
  film: Film,
  code: Code,
  dumbbell: Dumbbell,
  utensils: Utensils,
  palette: Palette,
  rocket: Rocket,
  flask: FlaskConical,
  newspaper: Newspaper,
  trophy: Trophy,
  bookmark: Bookmark,
}

export default function CategoryIcon({ icon, size = 18 }: { icon: IconKey; size?: number }) {
  const Glyph = ICONS[icon] ?? Bookmark
  return <Glyph size={size} />
}
