import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { applyDisplayPrefs } from './components/displayPrefs'
import { Shell } from './components/Shell'
import { UiProvider } from './components/UiContext'
import { Home } from './pages/Home'
import { handleCallback } from './spotify/auth'
import { readDisplayPrefs } from './storage/localPrefs'
import { navigate, useRoute, type Route } from './state/router'
import { StoreProvider, useStore } from './state/store'
import { ToastProvider, useToast } from './state/toast'

const DailyLog = lazy(() => import('./pages/DailyLog'))
const Weekly = lazy(() => import('./pages/Weekly'))
const Plan = lazy(() => import('./pages/Plan'))
const CalendarPage = lazy(() => import('./pages/Calendar'))
const Exercises = lazy(() => import('./pages/Exercises'))
const Core = lazy(() => import('./pages/Core'))
const Recipes = lazy(() => import('./pages/Recipes'))
const Nutrients = lazy(() => import('./pages/Nutrients'))
const Shopping = lazy(() => import('./pages/Shopping'))
const Hydration = lazy(() => import('./pages/Hydration'))
const Progress = lazy(() => import('./pages/Progress'))
const Spotify = lazy(() => import('./pages/Spotify'))
const SettingsPage = lazy(() => import('./pages/Settings'))
const WorkoutLogger = lazy(() => import('./pages/WorkoutLogger'))

function Page({ route }: { route: Route }) {
  const [first] = route.segments
  switch (first) {
    case undefined:
      return <Home />
    case 'protokoll':
      return <DailyLog route={route} />
    case 'woche':
      return <Weekly route={route} />
    case 'plan':
      return <Plan />
    case 'kalender':
      return <CalendarPage />
    case 'uebungen':
      return <Exercises route={route} />
    case 'core':
      return <Core />
    case 'rezepte':
      return <Recipes route={route} />
    case 'naehrstoffe':
      return <Nutrients />
    case 'einkauf':
      return <Shopping route={route} />
    case 'trinken':
      return <Hydration />
    case 'fortschritt':
      return <Progress route={route} />
    case 'spotify':
      return <Spotify />
    case 'einstellungen':
      return <SettingsPage route={route} />
    case 'training':
      return <WorkoutLogger key={route.segments[1] ?? 'frei'} route={route} />
    default:
      return <Home />
  }
}

function Loading() {
  return <div className="page muted small" style={{ padding: 40 }} aria-busy="true" />
}

/** Darf die Seite für ein Update neu laden, ohne dass Eingaben verloren gehen? */
function safeToReload(): boolean {
  if (document.querySelector('.overlay')) return false
  const el = document.activeElement
  return !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)
}

function AppInner() {
  const route = useRoute()
  const { ready, error } = useStore()
  const { toast } = useToast()
  const [updateReady, setUpdateReady] = useState(false)
  const updater = useRef<((reload?: boolean) => Promise<void>) | undefined>(undefined)

  useEffect(() => {
    applyDisplayPrefs(readDisplayPrefs())
  }, [])

  // Rückleitung von Spotify verarbeiten (?code=…&state=…)
  useEffect(() => {
    void handleCallback().then((r) => {
      if (!r.handled) return
      if (r.error) toast(r.error, 'error')
      else toast('Mit Spotify verbunden')
      navigate('/spotify')
    })
  }, [toast])

  // Service Worker registrieren (nur im Build). Neue Versionen werden automatisch übernommen,
  // sobald nichts Ungespeichertes offen ist (kein Dialog, kein Eingabefeld im Fokus).
  // Sonst erscheint ein Hinweis, und das Update folgt beim nächsten Wechsel in die App.
  useEffect(() => {
    if (!import.meta.env.PROD) return
    let registration: ServiceWorkerRegistration | undefined
    let timer: number | undefined
    let pending = false
    const apply = () => {
      try {
        sessionStorage.setItem('ms.updated', '1')
      } catch {
        // ohne sessionStorage gibt es nur keinen Hinweis nach dem Neuladen
      }
      void updater.current?.(true)
    }
    const check = () => {
      if (pending && safeToReload()) return apply()
      if (document.visibilityState === 'visible') void registration?.update().catch(() => undefined)
    }
    void import('virtual:pwa-register').then(({ registerSW }) => {
      updater.current = registerSW({
        // Die Registrierung wird nachgeladen; das load-Ereignis ist dann meist schon vorbei
        immediate: true,
        onNeedRefresh: () => {
          pending = true
          if (safeToReload()) apply()
          else setUpdateReady(true)
        },
        onOfflineReady: () => toast('Offline bereit: Die App funktioniert jetzt auch ohne Internet'),
        onRegisteredSW: (_url, reg) => {
          registration = reg
          // Auf dem iPhone bleibt die App oft im Hintergrund offen: regelmäßig und beim Zurückkehren nachsehen
          timer = window.setInterval(check, 30 * 60 * 1000)
        },
      })
    })
    document.addEventListener('visibilitychange', check)
    return () => {
      document.removeEventListener('visibilitychange', check)
      window.clearInterval(timer)
    }
  }, [toast])

  useEffect(() => {
    try {
      if (sessionStorage.getItem('ms.updated')) {
        sessionStorage.removeItem('ms.updated')
        toast('Muscle Studio ist auf dem neuesten Stand')
      }
    } catch {
      // ignorieren
    }
  }, [toast])

  useEffect(() => {
    if (error) toast(error, 'error')
  }, [error, toast])

  if (!ready) return <Loading />

  return (
    <UiProvider>
      <Shell route={route} updateReady={updateReady} onUpdate={() => void updater.current?.(true)}>
        <Suspense fallback={<Loading />}>
          <Page route={route} />
        </Suspense>
      </Shell>
    </UiProvider>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <StoreProvider>
        <AppInner />
      </StoreProvider>
    </ToastProvider>
  )
}
