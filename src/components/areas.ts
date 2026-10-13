import { BookOpen, ChefHat, Cookie, Dumbbell, NotebookPen, Settings2, ShoppingBasket, TrendingUp } from 'lucide-react'
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

/** Bereiche der App. Die Startseite verlinkt sie als Shortcuts, Unterseiten zeigen die Punkte ihres Bereichs. */
export const AREAS: Area[] = [
  {
    id: 'training',
    title: 'Training',
    icon: Dumbbell,
    items: [
      { path: '/plan', label: 'Training', icon: Dumbbell, match: (r) => r.segments[0] === 'training' },
      { path: '/uebungen', label: 'Übungen', icon: BookOpen },
    ],
  },
  {
    id: 'ernaehrung',
    title: 'Ernährung',
    icon: ChefHat,
    items: [
      { path: '/rezepte', label: 'Rezepte', icon: ChefHat },
      {
        path: '/rezepte?tab=einkauf',
        label: 'Einkauf',
        icon: ShoppingBasket,
        match: (r) => r.segments[0] === 'rezepte' && (r.query.get('tab') === 'einkauf' || r.query.get('tab') === 'plan'),
      },
      { path: '/rezepte?tab=snacks', label: 'Snacks', icon: Cookie, match: (r) => r.segments[0] === 'rezepte' && r.query.get('tab') === 'snacks' },
    ],
  },
  { id: 'protokoll', title: 'Protokoll', icon: NotebookPen, items: [{ path: '/protokoll', label: 'Protokoll', icon: NotebookPen }] },
  { id: 'fortschritt', title: 'Fortschritt', icon: TrendingUp, items: [{ path: '/fortschritt', label: 'Fortschritt', icon: TrendingUp }] },
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
