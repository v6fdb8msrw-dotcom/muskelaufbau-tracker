import { ArrowLeftRight, ArrowUpRight, ChefHat, ClipboardCheck, Dumbbell, GlassWater, Music, NotebookPen, Pill, Scale, Settings2, ShoppingBasket, TrendingUp, UtensilsCrossed } from 'lucide-react'
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import type { Icon } from '../components/areas'
import { BrandMark } from '../components/BrandMark'
import { prefersReducedMotion, useClock, useCountUp, useDayTotals, useIsMobile, useProgram, useWeekBudget } from '../components/hooks'
import { useUi } from '../components/UiContext'
import { SESSION_MAP } from '../data/plan'
import { RECIPES } from '../data/recipes'
import { ESN_CREATINE } from '../data/supplements'
import { recipeIdeas } from '../domain/ideas'
import { plannedSessionsForWeek, sessionStatus } from '../domain/training'
import { buildWeeklyReport } from '../domain/weekly'
import { withMovingAverage } from '../domain/weight'
import { diffDays, formatDateLong, relativeDay } from '../lib/date'
import { clamp, num } from '../lib/format'
import { buildCreatineLog, buildDrinkLog } from '../state/actions'
import { href } from '../state/router'
import { useStore } from '../state/store'
import { useToast } from '../state/toast'

function greeting(h: number): string {
  if (h < 5) return 'Gute Nacht'
  if (h < 11) return 'Guten Morgen'
  if (h < 18) return 'Guten Tag'
  return 'Guten Abend'
}

export function Home() {
  const store = useStore()
  const { data, settings, meta } = store
  const { openFood, openWeight, openSync } = useUi()
  const { toast } = useToast()
  const { today, week, weekStart, next } = useProgram()
  const clock = useClock()
  const isMobile = useIsMobile()
  const totals = useDayTotals(today)
  const budget = useWeekBudget(weekStart)
  const t = settings.targets
  const v = totals.profile.values
  const kcal = v.kcal ?? 0
  const protein = v.protein ?? 0
  const remaining = t.kcal - kcal
  const proteinOpen = t.protein - protein

  const weights = useMemo(() => withMovingAverage(data.weights), [data.weights])
  const sessions = useMemo(() => (week >= 1 ? plannedSessionsForWeek(settings, data.schedule, week) : []), [settings, data.schedule, week])
  const report = useMemo(() => buildWeeklyReport(data, settings, weekStart, today), [data, settings, weekStart, today])
  const openSuggestions = report.suggestions.filter((s) => !data.suggestions.some((x) => x.id === s.id))
  const done = sessions.filter((s) => sessionStatus(s, data.workouts, today) === 'done').length
  const lastWeight = weights[weights.length - 1]
  const nextSession = next ? SESSION_MAP[next.sessionId] : undefined
  const playlist = settings.spotify.savedPlaylists.find((p) => p.sessionId === next?.sessionId) ?? settings.spotify.savedPlaylists[0]
  const creatineToday = data.supplementLogs.some((s) => s.date === today && s.kind === 'creatine')
  const openItems = data.shoppingItems.filter((i) => i.week === weekStart && !i.checked).length
  const lastCopy = [meta.lastSyncAt, meta.lastBackupAt].filter(Boolean).sort().pop()
  const copyAge = lastCopy ? diffDays(today, lastCopy.slice(0, 10)) : undefined
  const recipeIdea = proteinOpen > 25 && remaining > 300 ? recipeIdeas('protein', settings, { maxKcal: remaining + 150, limit: 1 })[0] : undefined
  const hh = String(clock.getHours()).padStart(2, '0')
  const mm = String(clock.getMinutes()).padStart(2, '0')
  const euro2 = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  async function addWater(ml: number) {
    await store.save('drinkLogs', buildDrinkLog({ drinkId: 'wasser', ml, date: today }))
    toast(`Wasser: ${ml} ml eingetragen`)
  }

  async function addCreatine() {
    await store.save('supplementLogs', buildCreatineLog(settings.supplements.creatineDoseG, today))
    toast(`Kreatin ${settings.supplements.creatineDoseG} g eingetragen`)
  }

  const links: { to?: string; onClick?: () => void; icon: Icon; label: string; value: string; warn?: boolean }[] = [
    { to: '/plan', icon: Dumbbell, label: 'Training', value: `${done}/${sessions.length || 4} Einheiten` },
    { to: '/rezepte', icon: ChefHat, label: 'Rezepte', value: `${RECIPES.length} Rezepte` },
    { to: '/protokoll', icon: NotebookPen, label: 'Protokoll', value: `${num(kcal)} kcal heute` },
    { to: '/einkauf', icon: ShoppingBasket, label: 'Einkauf', value: openItems ? `${openItems} offen · ${euro2(budget.free)} €` : `${euro2(budget.free)} € frei`, warn: budget.status === 'ueber' },
    { to: '/trinken', icon: GlassWater, label: 'Trinken', value: `${num(totals.fluidMl / 1000, 1)} von ${num(t.fluidMl / 1000, 1)} l` },
    { to: '/woche', icon: ClipboardCheck, label: 'Woche', value: openSuggestions.length ? `${openSuggestions.length} Vorschläge` : 'alles im Plan' },
    { to: '/fortschritt', icon: TrendingUp, label: 'Fortschritt', value: `${num(lastWeight ? lastWeight.avg7 : settings.profile.startWeightKg, 1)} kg` },
    { to: '/spotify', icon: Music, label: 'Musik', value: `${settings.spotify.savedPlaylists.length} Playlists` },
    {
      onClick: openSync,
      icon: ArrowLeftRight,
      label: 'Sync',
      value: copyAge === undefined ? 'iPhone ↔ Mac' : copyAge === 0 ? 'heute abgeglichen' : `vor ${copyAge} Tagen`,
      warn: copyAge === undefined || copyAge > 14,
    },
  ]

  return (
    <div className="home">
      <div className="home-aurora" aria-hidden>
        <span />
        <span />
        <span />
      </div>

      {/* ---------- Alles auf einem dunklen Bildschirm ---------- */}
      <section className="hud hud-screen" aria-label="Übersicht">
        <div className="hud-grid" aria-hidden />
        <Corners />

        <header className="hud-top">
          <a className="brand" href={href('/')}>
            <span className="brand-mark">
              <BrandMark size={22} />
            </span>
            <span>
              <div className="brand-name">Muscle Studio</div>
              <div className="brand-sub">{week >= 1 && week <= settings.program.weeks ? `Woche ${week} von ${settings.program.weeks}` : week < 1 ? 'Vor dem Start' : 'Programm beendet'}</div>
            </span>
          </a>
          <div className="hud-top-right">
            <span className="hud-clock num" aria-label="Uhrzeit">
              {hh}
              <span className="blink">:</span>
              {mm}
            </span>
            <a className="btn btn-icon hud-ghost" href={href('/einstellungen')} aria-label="Einstellungen">
              <Settings2 size={18} />
            </a>
          </div>
        </header>

        <div className="hud-body">
          <div className="hud-left">
            <div className="hud-eyebrow">{formatDateLong(today)}</div>
            <h1 className="hud-title">
              {greeting(clock.getHours())}
              {settings.profile.name ? `, ${settings.profile.name}` : ''}.
            </h1>
            <Timeline week={week} weeks={settings.program.weeks} />
          </div>

          <div className="hud-nextwrap">
            {next && nextSession ? (
              <div className="hud-next">
                <div className="hud-label">Nächstes Training · {relativeDay(next.date, today)}</div>
                <div className="hud-next-title">{nextSession.title}</div>
                <div className="row-wrap" style={{ marginTop: 12 }}>
                  <a className="btn btn-primary" href={href(`/training/${next.key}`)}>
                    <Dumbbell size={16} /> {next.date === today ? 'Training starten' : 'Ansehen'}
                  </a>
                  {playlist && (
                    <a className="btn hud-ghost" href={playlist.url} target="_blank" rel="noopener noreferrer">
                      <Music size={16} /> Playlist
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="hud-next">
                <div className="hud-label">Training</div>
                <div className="hud-next-meta">Keine weitere Einheit im Plan.</div>
              </div>
            )}
          </div>

          <div className="hud-center">
            <OrbitRings
              size={isMobile ? 230 : 280}
              rings={[
                { value: kcal, max: t.kcal, label: 'Kalorien' },
                { value: protein, max: t.protein, label: 'Protein' },
                { value: totals.fluidMl, max: t.fluidMl, label: 'Trinken' },
              ]}
            >
              <CountUp value={Math.abs(remaining)} className="orbit-value" />
              <div className="orbit-caption">{remaining >= 0 ? 'kcal offen' : 'kcal über Ziel'}</div>
            </OrbitRings>
            <div className="orbit-legend">
              <span>
                <i className="lg lg-1" /> Kalorien
              </span>
              <span>
                <i className="lg lg-2" /> Protein
              </span>
              <span>
                <i className="lg lg-3" /> Trinken
              </span>
            </div>
          </div>

          <div className="hud-right">
            <HudStat label="Protein" value={protein} target={t.protein} unit="g" strong />
            <HudStat label="Trinken" value={totals.fluidMl / 1000} target={t.fluidMl / 1000} unit="l" decimals={1} />
            {recipeIdea && (
              <a className="hud-idea" href={href(`/rezepte/${recipeIdea.recipe.id}`)}>
                <span>
                  Noch {num(proteinOpen)} g Protein: <strong>{recipeIdea.recipe.name}</strong> bringt {num(recipeIdea.value)} g
                </span>
                <ArrowUpRight size={15} />
              </a>
            )}
            <div className="hud-actions">
              <button type="button" className="hud-action" onClick={() => openFood()}>
                <UtensilsCrossed size={17} />
                <span>Essen</span>
              </button>
              <button type="button" className="hud-action" onClick={() => addWater(250)}>
                <GlassWater size={17} />
                <span>+250 ml</span>
              </button>
              <button type="button" className="hud-action" onClick={() => openWeight()}>
                <Scale size={17} />
                <span>Gewicht</span>
              </button>
              {settings.supplements.creatineEnabled && (
                <button type="button" className={`hud-action ${creatineToday ? 'done' : ''}`} onClick={addCreatine} title={ESN_CREATINE.name}>
                  <Pill size={17} />
                  <span>{creatineToday ? 'Kreatin ✓' : `Kreatin ${num(settings.supplements.creatineDoseG)} g`}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Shortcuts in alle Bereiche */}
        <nav className="hud-nav" aria-label="Bereiche">
          {links.map((l, i) => {
            const content = (
              <>
                <span className="hud-link-icon">
                  <l.icon size={18} strokeWidth={1.9} />
                </span>
                <span className="hud-link-text">
                  <span className="hud-link-label">{l.label}</span>
                  <span className={`hud-link-value ${l.warn ? 'warn' : ''}`}>{l.value}</span>
                </span>
              </>
            )
            const style = { ['--i' as string]: i } as CSSProperties
            return l.to ? (
              <a key={l.label} className="hud-link" href={href(l.to)} style={style}>
                {content}
              </a>
            ) : (
              <button key={l.label} type="button" className="hud-link" onClick={l.onClick} style={style}>
                {content}
              </button>
            )
          })}
        </nav>
      </section>
    </div>
  )
}

/* ---------- Bausteine ---------- */

function CountUp({ value, decimals = 0, className }: { value: number; decimals?: number; className?: string }) {
  const v = useCountUp(value)
  return <span className={`num ${className ?? ''}`}>{num(v, decimals)}</span>
}

function Corners() {
  return (
    <>
      <i className="hud-corner tl" aria-hidden />
      <i className="hud-corner tr" aria-hidden />
      <i className="hud-corner bl" aria-hidden />
      <i className="hud-corner br" aria-hidden />
    </>
  )
}

function Timeline({ week, weeks }: { week: number; weeks: number }) {
  return (
    <div className="timeline" aria-label={`Woche ${week} von ${weeks}`}>
      <div className="timeline-bar">
        {Array.from({ length: weeks }, (_, i) => {
          const w = i + 1
          const state = w < week ? 'past' : w === week ? 'now' : 'future'
          return <span key={w} className={`seg ${state}`} style={{ ['--d' as string]: `${i * 45}ms` }} />
        })}
      </div>
      <div className="timeline-caption">
        <span>
          Woche <strong className="num">{clamp(week, 0, weeks)}</strong>/{weeks}
        </span>
        <span>{week >= 1 && week <= weeks ? `noch ${weeks - week} Wochen` : week < 1 ? 'startet bald' : 'geschafft'}</span>
      </div>
    </div>
  )
}

function OrbitRings({ size, rings, children }: { size: number; rings: { value: number; max: number; label: string }[]; children: ReactNode }) {
  const [mounted, setMounted] = useState(prefersReducedMotion())
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])
  const c = size / 2
  const stroke = size * 0.045
  const radii = rings.map((_, i) => c - stroke * 1.6 - i * stroke * 2.1)
  return (
    <div className="orbit" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <defs>
          <linearGradient id="orbitNeon" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7dffb0" />
            <stop offset="1" stopColor="#17d861" />
          </linearGradient>
          <linearGradient id="orbitSilver" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#9aa1a9" />
          </linearGradient>
          <linearGradient id="orbitAqua" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#c9fff0" />
            <stop offset="1" stopColor="#3cf0c8" />
          </linearGradient>
        </defs>
        <circle className="orbit-dash" cx={c} cy={c} r={c - 4} fill="none" />
        <g className="orbit-ticks">
          {Array.from({ length: 60 }, (_, i) => {
            const a = (i / 60) * Math.PI * 2
            const r1 = c - 10
            const r2 = c - (i % 5 === 0 ? 16 : 13)
            return <line key={i} x1={c + Math.cos(a) * r1} y1={c + Math.sin(a) * r1} x2={c + Math.cos(a) * r2} y2={c + Math.sin(a) * r2} />
          })}
        </g>
        {rings.map((ring, i) => {
          const r = radii[i] - 14
          const circ = 2 * Math.PI * r
          const p = ring.max > 0 ? clamp(ring.value / ring.max, 0, 1) : 0
          const grad = ['url(#orbitNeon)', 'url(#orbitSilver)', 'url(#orbitAqua)'][i]
          return (
            <g key={ring.label} transform={`rotate(-90 ${c} ${c})`}>
              <circle cx={c} cy={c} r={r} fill="none" className="orbit-track" strokeWidth={stroke} />
              <circle
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke={grad}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={mounted ? circ * (1 - p) : circ}
                className={`orbit-arc arc-${i}`}
                style={{ transitionDelay: `${i * 140}ms` }}
              >
                <title>
                  {ring.label}: {Math.round(p * 100)} %
                </title>
              </circle>
            </g>
          )
        })}
      </svg>
      <div className="orbit-center">{children}</div>
    </div>
  )
}

function HudStat({ label, value, target, unit, decimals = 0, strong }: { label: string; value: number; target: number; unit: string; decimals?: number; strong?: boolean }) {
  const shown = useCountUp(value)
  const p = target > 0 ? clamp(value / target, 0, 1) : 0
  return (
    <div className={`hud-stat ${strong ? 'strong' : ''}`}>
      <div className="row-between">
        <span className="hud-stat-label">{label}</span>
        <span className="hud-stat-value num">
          <strong>{num(shown, decimals)}</strong> / {num(target, decimals)} {unit}
        </span>
      </div>
      <div className="hud-bar">
        <span style={{ width: `${p * 100}%` }} />
      </div>
    </div>
  )
}
