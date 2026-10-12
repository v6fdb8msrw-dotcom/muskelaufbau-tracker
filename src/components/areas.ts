import {
  BookOpen,
  CalendarDays,
  ChefHat,
  ClipboardCheck,
  Dumbbell,
  FlaskConical,
  GlassWater,
  Music,
  NotebookPen,
  Settings2,
  ShoppingBasket,
  Target,
  TrendingUp,
  UtensilsCrossed,
} from 'lucide-react'
import type { ComponentType } from 'react'
import type { Route } from '../state/router'

export type Icon = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>

export interface AreaItem {
  path: string
  label: string
  icon: Icon
  /** Zusätzliche Pfade, die zu diesem Punkt gehören (z. B. Rezept-Details) */
  match?: (route: Route) => boolean
}

export interface Area {
  id: string
  title: string
  icon: Icon
  items: AreaItem[]
}

/** Bereiche der App. Die Startseite verlinkt sie als große Felder, Unterseiten zeigen die Punkte ihres Bereichs. */
export const AREAS: Area[] = [
  {
    id: 'heute',
    title: 'Heute',
    icon: NotebookPen,
    items: [
      { path: '/protokoll', label: 'Tagesprotokoll', icon: NotebookPen },
      { path: '/woche', label: 'Wochenkorrektur', icon: ClipboardCheck },
    ],
  },
  {
    id: 'training',
    title: 'Training',
    icon: Dumbbell,
    items: [
      { path: '/plan', label: 'Trainingsplan', icon: Dumbbell, match: (r) => r.segments[0] === 'training' },
      { path: '/kalender', label: 'Kalender', icon: CalendarDays },
      { path: '/uebungen', label: 'Übungen', icon: BookOpen },
      { path: '/core', label: 'Bauch & Core', icon: Target },
    ],
  },
  {
    id: 'ernaehrung',
    title: 'Ernährung',
    icon: ChefHat,
    items: [
      { path: '/rezepte', label: 'Rezepte', icon: ChefHat },
      { path: '/rezepte?tab=plan', label: 'Wochenplan', icon: UtensilsCrossed, match: (r) => r.segments[0] === 'rezepte' && r.query.get('tab') === 'plan' },
      { path: '/naehrstoffe', label: 'Nährstoffe & Mikronährstoffe', icon: FlaskConical },
      { path: '/einkauf', label: 'Einkaufsliste', icon: ShoppingBasket },
      { path: '/trinken', label: 'Trinken & Hydration', icon: GlassWater },
      {
        path: '/rezepte?tab=lebensmittel',
        label: 'Lebensmittel',
        icon: ChefHat,
        match: (r) => r.segments[0] === 'rezepte' && r.query.get('tab') === 'lebensmittel',
      },
    ],
  },
  { id: 'fortschritt', title: 'Fortschritt', icon: TrendingUp, items: [{ path: '/fortschritt', label: 'Fortschritt', icon: TrendingUp }] },
  { id: 'musik', title: 'Musik', icon: Music, items: [{ path: '/spotify', label: 'Spotify & Training Music', icon: Music }] },
  { id: 'einstellungen', title: 'Einstellungen', icon: Settings2, items: [{ path: '/einstellungen', label: 'Einstellungen', icon: Settings2 }] },
]

export function itemActive(item: AreaItem, route: Route): boolean {
  // Punkte mit Abfrage im Pfad (z. B. Wochenplan) entscheiden allein über match
  if (item.path.includes('?')) return item.match?.(route) ?? false
  if (item.match?.(route)) return true
  const base = item.path
  const pathMatch = route.path === base || route.path.startsWith(`${base}/`)
  // Rezepte: nur aktiv ohne Tab-Abfrage, sonst sind Wochenplan/Lebensmittel gemeint
  return pathMatch && !(base === '/rezepte' && route.query.get('tab'))
}

export function areaFor(route: Route): Area | undefined {
  return AREAS.find((a) => a.items.some((i) => itemActive(i, route)))
}
