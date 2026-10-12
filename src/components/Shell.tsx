import {
  BookOpen,
  CalendarDays,
  ChefHat,
  ClipboardCheck,
  Dumbbell,
  FlaskConical,
  GlassWater,
  HardDrive,
  LayoutDashboard,
  Menu,
  Music,
  NotebookPen,
  Plus,
  RefreshCw,
  Settings2,
  ShoppingBasket,
  Target,
  TrendingUp,
} from 'lucide-react'
import { useState, type ComponentType, type ReactNode } from 'react'
import { formatDate } from '../lib/date'
import { href, navigate, type Route } from '../state/router'
import { useStore } from '../state/store'
import { BrandMark } from './BrandMark'
import { useProgram } from './hooks'
import { Modal } from './ui'
import { useUi } from './UiContext'

type Icon = ComponentType<{ size?: number; strokeWidth?: number }>

export const NAV: { group: string; items: { path: string; label: string; icon: Icon }[] }[] = [
  {
    group: 'Heute',
    items: [
      { path: '/', label: 'Übersicht', icon: LayoutDashboard },
      { path: '/protokoll', label: 'Tagesprotokoll', icon: NotebookPen },
      { path: '/woche', label: 'Wochenkorrektur', icon: ClipboardCheck },
    ],
  },
  {
    group: 'Training',
    items: [
      { path: '/plan', label: 'Trainingsplan', icon: Dumbbell },
      { path: '/kalender', label: 'Kalender', icon: CalendarDays },
      { path: '/uebungen', label: 'Übungen', icon: BookOpen },
      { path: '/core', label: 'Bauch & Core', icon: Target },
    ],
  },
  {
    group: 'Ernährung',
    items: [
      { path: '/rezepte', label: 'Ernährung & Rezepte', icon: ChefHat },
      { path: '/naehrstoffe', label: 'Nährstoffe & Mikronährstoffe', icon: FlaskConical },
      { path: '/einkauf', label: 'Einkaufsliste', icon: ShoppingBasket },
      { path: '/trinken', label: 'Trinken & Hydration', icon: GlassWater },
    ],
  },
  {
    group: 'Mehr',
    items: [
      { path: '/fortschritt', label: 'Fortschritt', icon: TrendingUp },
      { path: '/spotify', label: 'Spotify', icon: Music },
      { path: '/einstellungen', label: 'Einstellungen', icon: Settings2 },
    ],
  },
]

function isActive(route: Route, path: string): boolean {
  if (path === '/') return route.path === '/'
  return route.path === path || route.path.startsWith(`${path}/`) || (path === '/plan' && route.path.startsWith('/training'))
}

export function Shell({ route, children, updateReady, onUpdate }: { route: Route; children: ReactNode; updateReady: boolean; onUpdate: () => void }) {
  const { meta, repo } = useStore()
  const { openQuick } = useUi()
  const { week, today } = useProgram()
  const [more, setMore] = useState(false)

  return (
    <div className="app">
      <aside className="sidebar" aria-label="Navigation">
        <a className="brand" href={href('/')}>
          <span className="brand-mark">
            <BrandMark size={22} />
          </span>
          <span className="brand-text">
            <div className="brand-name">Muscle Studio</div>
            <div className="brand-sub">{week >= 1 && week <= 16 ? `Woche ${week} von 16` : week > 16 ? 'Programm beendet' : 'Vor dem Start'}</div>
          </span>
        </a>
        <nav className="nav">
          {NAV.map((g) => (
            <div key={g.group} className="nav">
              <div className="nav-group-label eyebrow">{g.group}</div>
              {g.items.map((it) => (
                <a key={it.path} className="nav-link" href={href(it.path)} aria-current={isActive(route, it.path) ? 'page' : undefined} title={it.label}>
                  <it.icon size={18} strokeWidth={1.8} />
                  <span>{it.label}</span>
                </a>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="row" style={{ gap: 8, color: 'var(--ink-2)', fontWeight: 650 }}>
            <HardDrive size={14} /> Nur auf diesem Gerät
          </div>
          <div style={{ marginTop: 4 }}>
            {repo.label.replace('Lokal auf diesem Gerät ', '')} · Backup:{' '}
            {meta.lastBackupAt ? formatDate(meta.lastBackupAt.slice(0, 10)) : <a href={href('/einstellungen?tab=daten')}>noch keins</a>}
          </div>
        </div>
      </aside>

      <header className="topbar">
        <a className="brand" href={href('/')}>
          <span className="brand-mark">
            <BrandMark size={19} />
          </span>
          <span>
            <div className="brand-name">Muscle Studio</div>
          </span>
        </a>
        <div className="row" style={{ gap: 10 }}>
          <div className="muted small" style={{ textAlign: 'right', lineHeight: 1.25 }}>
            {formatDate(today)}
            {week >= 1 && week <= 16 && <div className="tiny">Woche {week}/16</div>}
          </div>
          <button type="button" className="btn btn-icon" onClick={() => setMore(true)} aria-label="Alle Bereiche">
            <Menu size={19} />
          </button>
        </div>
      </header>

      <main className="main">
        {updateReady && (
          <div className="notice neon" style={{ maxWidth: 'var(--content-max)', margin: '0 auto 18px', alignItems: 'center' }}>
            <RefreshCw size={17} />
            <div className="grow">Eine neue Version von Muscle Studio ist bereit. Deine lokalen Daten bleiben beim Aktualisieren erhalten.</div>
            <button type="button" className="btn btn-sm btn-dark" onClick={onUpdate}>
              Aktualisieren
            </button>
          </div>
        )}
        <div key={route.path}>{children}</div>
      </main>

      <nav className="bottom-nav" aria-label="Hauptnavigation">
        {[
          { path: '/', label: 'Heute', icon: LayoutDashboard },
          { path: '/protokoll', label: 'Protokoll', icon: NotebookPen },
        ].map((it) => (
          <a key={it.path} href={href(it.path)} aria-current={isActive(route, it.path) ? 'page' : undefined}>
            <it.icon size={20} strokeWidth={1.9} />
            {it.label}
          </a>
        ))}
        <button type="button" className="nav-add" onClick={openQuick} aria-label="Schnell erfassen">
          <span>
            <Plus size={24} strokeWidth={2.4} />
          </span>
        </button>
        {[
          { path: '/plan', label: 'Training', icon: Dumbbell },
          { path: '/rezepte', label: 'Rezepte', icon: ChefHat },
        ].map((it) => (
          <a key={it.path} href={href(it.path)} aria-current={isActive(route, it.path) ? 'page' : undefined}>
            <it.icon size={20} strokeWidth={1.9} />
            {it.label}
          </a>
        ))}
      </nav>

      {more && (
        <Modal title="Alle Bereiche" onClose={() => setMore(false)}>
          <div className="stack-lg">
            {NAV.map((g) => (
              <div key={g.group}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                  {g.group}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  {g.items.map((it) => (
                    <button key={it.path} type="button" className="quick-btn" style={{ flexDirection: 'row', justifyContent: 'flex-start', padding: '12px 12px' }} onClick={() => {
                        setMore(false)
                        navigate(it.path)
                      }}
                    >
                      <it.icon size={18} />
                      {it.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
