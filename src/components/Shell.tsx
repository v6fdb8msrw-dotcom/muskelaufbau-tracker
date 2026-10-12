import { ArrowLeft, Plus, RefreshCw, Settings2 } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { href, type Route } from '../state/router'
import { areaFor, itemActive } from './areas'
import { BrandMark } from './BrandMark'
import { useUi } from './UiContext'

/**
 * App-Rahmen ohne Seitenmenü: Die Startseite ist die Übersicht mit großen Feldern.
 * Unterseiten bekommen eine schlanke Leiste mit „Übersicht“, den Punkten ihres Bereichs und den Einstellungen.
 */
export function Shell({ route, children, updateReady, onUpdate }: { route: Route; children: ReactNode; updateReady: boolean; onUpdate: () => void }) {
  const { openQuick } = useUi()
  const isHome = route.segments.length === 0
  const area = areaFor(route)
  const navRef = useRef<HTMLElement>(null)

  // Aktiven Punkt in der Bereichsleiste sichtbar halten (auf dem iPhone scrollt sie seitlich)
  useEffect(() => {
    const nav = navRef.current
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]')
    if (nav && active) nav.scrollLeft = active.offsetLeft - nav.clientWidth / 2 + active.clientWidth / 2
  }, [route.path, route.query])

  return (
    <div className={`app ${isHome ? 'is-home' : ''}`}>
      {!isHome && (
        <header className="appbar">
          <div className="appbar-row">
            <a className="appbar-back" href={href('/')} aria-label="Zur Übersicht">
              <ArrowLeft size={18} />
              <span className="brand-mark sm">
                <BrandMark size={15} />
              </span>
              <span className="appbar-label">Übersicht</span>
            </a>
            {area && area.items.length > 1 && (
              <nav className="area-nav" aria-label={area.title} ref={navRef}>
                {area.items.map((it) => (
                  <a key={it.path} href={href(it.path)} aria-current={itemActive(it, route) ? 'page' : undefined}>
                    <it.icon size={15} strokeWidth={1.9} />
                    {it.label}
                  </a>
                ))}
              </nav>
            )}
            {area && area.items.length === 1 && <div className="appbar-title">{area.title}</div>}
            <div className="appbar-actions">
              <a className="btn btn-icon" href={href('/einstellungen')} aria-label="Einstellungen" aria-current={route.segments[0] === 'einstellungen' ? 'page' : undefined}>
                <Settings2 size={18} />
              </a>
            </div>
          </div>
        </header>
      )}

      <main className={isHome ? 'main main-home' : 'main'}>
        {updateReady && (
          <div className="notice neon update-banner">
            <RefreshCw size={17} />
            <div className="grow">Eine neue Version von Muscle Studio ist bereit. Deine lokalen Daten bleiben beim Aktualisieren erhalten.</div>
            <button type="button" className="btn btn-sm btn-dark" onClick={onUpdate}>
              Aktualisieren
            </button>
          </div>
        )}
        <div key={route.path + (route.query.get('tab') ?? '')}>{children}</div>
      </main>

      {/* Auf der Startseite sind alle Aktionen im dunklen Bildschirm */}
      {!isHome && route.segments[0] !== 'einstellungen' && (
        <button type="button" className="fab" onClick={openQuick} aria-label="Schnell erfassen">
          <Plus size={26} strokeWidth={2.4} />
        </button>
      )}
    </div>
  )
}
