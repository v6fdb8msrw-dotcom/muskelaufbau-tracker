import {
  ArrowUpRight,
  ClipboardCheck,
  Dumbbell,
  GlassWater,
  HardDrive,
  Music,
  NotebookPen,
  Pill,
  Plus,
  Scale,
  Settings2,
  ShoppingBasket,
  Sparkles,
  TrendingUp,
  UtensilsCrossed,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import type { Icon } from '../components/areas'
import { BrandMark } from '../components/BrandMark'
import { Sparkline } from '../components/charts'
import { prefersReducedMotion, useClock, useCountUp, useDayTotals, useIsMobile, useProgram, useShoppingWeek } from '../components/hooks'
import { NutrientRows } from '../components/NutrientRows'
import { useUi } from '../components/UiContext'
import { ESN_CREATINE } from '../data/supplements'
import { EXERCISE_MAP } from '../data/exercises'
import { SESSION_MAP } from '../data/plan'
import { RECIPE_MAP } from '../data/recipes'
import { balanceSummary } from '../domain/balance'
import { foodIdeas, recipeIdeas } from '../domain/ideas'
import { analyzeRange } from '../domain/nutrition'
import { planForWeek } from '../domain/shopping'
import { plannedSessionsForWeek, sessionStatus, setsForWeek } from '../domain/training'
import { buildWeeklyReport } from '../domain/weekly'
import { weeklyTrend, withMovingAverage } from '../domain/weight'
import { addDays, diffDays, formatDate, formatDateLong, relativeDay, WEEKDAY_SHORT, weekDates } from '../lib/date'
import { clamp, euro, num } from '../lib/format'
import { buildCreatineLog, buildDrinkLog } from '../state/actions'
import { href } from '../state/router'
import { useStore } from '../state/store'
import { useToast } from '../state/toast'
import type { NutrientKey } from '../types'

function greeting(h: number): string {
  if (h < 5) return 'Gute Nacht'
  if (h < 11) return 'Guten Morgen'
  if (h < 18) return 'Guten Tag'
  return 'Guten Abend'
}

const MICROS: NutrientKey[] = ['vitC', 'calcium', 'magnesium', 'iron', 'zinc', 'iodine']

export function Home() {
  const store = useStore()
  const { data, settings, meta } = store
  const { openFood, openWeight, openDrink } = useUi()
  const { toast } = useToast()
  const { today, week, weekStart, next } = useProgram()
  const clock = useClock()
  const isMobile = useIsMobile()
  const totals = useDayTotals(today)
  const shopping = useShoppingWeek(weekStart)
  const t = settings.targets
  const v = totals.profile.values
  const kcal = v.kcal ?? 0
  const protein = v.protein ?? 0
  const remaining = t.kcal - kcal

  const range = useMemo(() => analyzeRange(data, today, 7), [data, today])
  const weights = useMemo(() => withMovingAverage(data.weights), [data.weights])
  const trend = useMemo(() => weeklyTrend(data.weights, today), [data.weights, today])
  const balance = useMemo(() => balanceSummary(data.workouts, data.arms, settings), [data.workouts, data.arms, settings])
  const sessions = useMemo(() => (week >= 1 ? plannedSessionsForWeek(settings, data.schedule, week) : []), [settings, data.schedule, week])
  const report = useMemo(() => buildWeeklyReport(data, settings, weekStart, today), [data, settings, weekStart, today])
  const openSuggestions = report.suggestions.filter((s) => !data.suggestions.some((x) => x.id === s.id))
  const done = sessions.filter((s) => sessionStatus(s, data.workouts, today) === 'done').length
  const weekPlan = planForWeek(data.mealPlan, weekStart).filter((m) => m.slot === 'mittag')
  const nextMeal = data.mealPlan
    .filter((m) => m.date >= today && !data.foodLogs.some((f) => f.planId === m.id))
    .sort((a, b) => a.date.localeCompare(b.date))[0]
  const lastWeight = weights[weights.length - 1]
  const nextSession = next ? SESSION_MAP[next.sessionId] : undefined
  const playlist = settings.spotify.savedPlaylists.find((p) => p.sessionId === next?.sessionId) ?? settings.spotify.savedPlaylists[0]
  const entriesToday = totals.entryCount
  const dayComplete = data.days.some((d) => d.date === today && d.complete)
  const creatineToday = data.supplementLogs.some((s) => s.date === today && s.kind === 'creatine')
  const backupAge = meta.lastBackupAt ? diffDays(today, meta.lastBackupAt.slice(0, 10)) : undefined
  const proteinIdeas = t.protein - protein > 12 ? foodIdeas('protein', settings, data.products, 3) : []
  const recipeIdea = t.protein - protein > 25 && remaining > 300 ? recipeIdeas('protein', settings, { maxKcal: remaining + 150, limit: 1 })[0] : undefined
  const days = weekDates(weekStart)
  const hh = String(clock.getHours()).padStart(2, '0')
  const mm = String(clock.getMinutes()).padStart(2, '0')

  async function addWater(ml: number) {
    await store.save('drinkLogs', buildDrinkLog({ drinkId: 'wasser', ml, date: today }))
    toast(`Wasser: ${ml} ml eingetragen`)
  }

  async function addCreatine() {
    await store.save('supplementLogs', buildCreatineLog(settings.supplements.creatineDoseG, today))
    toast(`Kreatin ${settings.supplements.creatineDoseG} g eingetragen`)
  }

  return (
    <div className="home">
      <div className="home-aurora" aria-hidden>
        <span />
        <span />
        <span />
      </div>

      <header className="home-header">
        <a className="brand" href={href('/')}>
          <span className="brand-mark">
            <BrandMark size={22} />
          </span>
          <span>
            <div className="brand-name">Muscle Studio</div>
            <div className="brand-sub">{week >= 1 && week <= settings.program.weeks ? `Woche ${week} von ${settings.program.weeks}` : week < 1 ? 'Vor dem Start' : 'Programm beendet'}</div>
          </span>
        </a>
        <div className="home-header-right">
          <span className="home-clock num" aria-label="Uhrzeit">
            {hh}
            <span className="blink">:</span>
            {mm}
          </span>
          <a className="btn btn-icon glass-btn" href={href('/einstellungen')} aria-label="Einstellungen">
            <Settings2 size={18} />
          </a>
        </div>
      </header>

      {/* ---------- HUD ---------- */}
      <section className="hud" aria-label="Heute">
        <div className="hud-grid" aria-hidden />
        <div className="hud-sweep" aria-hidden />
        <Corners />

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
              <div className="hud-next-meta">
                {nextSession.exercises.length} Übungen · {nextSession.exercises.reduce((s, e) => s + setsForWeek(e, next.week) * (e.perSide ? 2 : 1), 0)} Sätze ·{' '}
                {nextSession.exercises
                  .slice(0, 2)
                  .map((e) => EXERCISE_MAP[e.exerciseId].name.replace('Kurzhantel-', '').replace('Einarmiges ', ''))
                  .join(', ')}
              </div>
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
            size={isMobile ? 230 : 300}
            rings={[
              { value: kcal, max: t.kcal, label: 'Kalorien' },
              { value: protein, max: t.protein, label: 'Protein' },
              { value: totals.fluidMl, max: t.fluidMl, label: 'Trinken' },
            ]}
          >
            <CountUp value={Math.abs(remaining)} className="orbit-value" />
            <div className="orbit-caption">{remaining >= 0 ? 'kcal offen' : 'kcal über Ziel'}</div>
            <div className="orbit-sub num">
              {num(kcal)} / {num(t.kcal)}
            </div>
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
          <HudStat label="Kohlenhydrate" value={v.carbs ?? 0} target={t.carbs} unit="g" />
          <HudStat label="Fett" value={v.fat ?? 0} target={t.fat} unit="g" />
          <HudStat label="Ballaststoffe" value={v.fiber ?? 0} target={t.fiber} unit="g" />
          <HudStat label="Trinken" value={totals.fluidMl / 1000} target={t.fluidMl / 1000} unit="l" decimals={1} />
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
      </section>

      {/* ---------- Bereiche ---------- */}
      <section className="tiles" aria-label="Bereiche">
        <AreaTile
          index={0}
          href="/plan"
          icon={Dumbbell}
          title="Training"
          stat={`${done}/${sessions.length || 4}`}
          unit="Einheiten"
          caption={nextSession ? `Nächstes: ${nextSession.short}, ${relativeDay(next!.date, today)}` : 'Plan, Kalender, Übungen'}
          links={[
            ['Plan', '/plan'],
            ['Kalender', '/kalender'],
            ['Übungen', '/uebungen'],
            ['Core', '/core'],
          ]}
        >
          <div className="tile-week">
            {WEEKDAY_SHORT.map((d, i) => {
              const s = sessions.find((x) => x.date === days[i])
              const st = s ? sessionStatus(s, data.workouts, today) : undefined
              return (
                <span key={d} className={`tw ${s ? 'has' : ''} ${st ?? ''} ${days[i] === today ? 'now' : ''}`} title={d}>
                  {d[0]}
                </span>
              )
            })}
          </div>
        </AreaTile>

        <AreaTile
          index={1}
          href="/rezepte"
          icon={UtensilsCrossed}
          title="Ernährung"
          stat={`${weekPlan.length}`}
          unit="Mittagessen geplant"
          caption={nextMeal ? `${relativeDay(nextMeal.date, today)}: ${RECIPE_MAP[nextMeal.recipeId]?.name}` : '100 Rezepte, Wochenplan, Nährstoffe'}
          links={[
            ['Rezepte', '/rezepte'],
            ['Wochenplan', '/rezepte?tab=plan'],
            ['Nährstoffe', '/naehrstoffe'],
          ]}
        />

        <AreaTile
          index={2}
          href="/protokoll"
          icon={NotebookPen}
          title="Tagesprotokoll"
          stat={String(entriesToday)}
          unit={entriesToday === 1 ? 'Eintrag heute' : 'Einträge heute'}
          caption={dayComplete ? 'Tag als vollständig markiert' : t.protein - protein > 0 ? `Noch ${num(t.protein - protein)} g Protein offen` : 'Protein-Ziel erreicht'}
        >
          <MiniBar value={kcal} max={t.kcal} />
        </AreaTile>

        <AreaTile
          index={3}
          href="/woche"
          icon={ClipboardCheck}
          title="Wochenkorrektur"
          stat={String(openSuggestions.length)}
          unit={openSuggestions.length === 1 ? 'Vorschlag' : 'Vorschläge'}
          caption={openSuggestions[0]?.title ?? (report.good[0] ? report.good[0] : 'Alles im Plan')}
        />

        <AreaTile
          index={4}
          href="/trinken"
          icon={GlassWater}
          title="Trinken"
          stat={num(totals.fluidMl / 1000, 1)}
          unit={`von ${num(t.fluidMl / 1000, 1)} l`}
          caption={settings.supplements.proteinPowderAvailable ? 'Getränke, Shakes, Kreatin' : 'Getränke und Supplements'}
          action={
            <button
              type="button"
              className="tile-quick"
              onClick={(e) => {
                e.preventDefault()
                openDrink()
              }}
              aria-label="Getränk eintragen"
            >
              <Plus size={15} />
            </button>
          }
        >
          <MiniBar value={totals.fluidMl} max={t.fluidMl} />
        </AreaTile>

        <AreaTile
          index={5}
          href="/einkauf"
          icon={ShoppingBasket}
          title="Einkauf"
          stat={euro(shopping.budgetCash).replace(/\s?€/, '')}
          unit={`€ von ${settings.budget.max} €`}
          caption={`${shopping.lines.filter((l) => !l.checked && !l.transferred && l.toBuy > 0).length} Produkte offen`}
        >
          <MiniBar value={shopping.budgetCash} max={settings.budget.max} warn={shopping.status === 'ueber'} />
        </AreaTile>

        <AreaTile
          index={6}
          href="/fortschritt"
          icon={TrendingUp}
          title="Fortschritt"
          stat={lastWeight ? num(lastWeight.avg7, 1) : num(settings.profile.startWeightKg, 1)}
          unit={lastWeight ? 'kg im 7-Tage-Schnitt' : 'kg Startgewicht'}
          caption={
            trend.enoughData && trend.perWeek !== undefined
              ? `${trend.perWeek >= 0 ? '+' : ''}${num(trend.perWeek * 1000)} g pro Woche`
              : balance.ratio !== undefined
                ? `Arm-Balance ${Math.round(balance.ratio * 100)} %`
                : 'Gewicht, Kraft, Arm-Balance'
          }
        >
          {weights.length > 1 && <Sparkline values={weights.slice(-21).map((w) => w.avg7)} width={120} height={30} />}
        </AreaTile>

        <AreaTile
          index={7}
          href="/spotify"
          icon={Music}
          title="Musik"
          stat={String(settings.spotify.savedPlaylists.length)}
          unit={settings.spotify.savedPlaylists.length === 1 ? 'Playlist' : 'Playlists'}
          caption={playlist ? `Für ${nextSession?.short ?? 'dein Training'}: ${playlist.name}` : 'Spotify verbinden oder Links speichern'}
        />
      </section>

      {/* ---------- Unten ---------- */}
      <section className="home-lower">
        <div className="glass-panel lower-ideas">
          <div className="panel-head">
            <span className="hud-label dark">Passende Ergänzungen</span>
            <Sparkles size={16} />
          </div>
          <div className="panel-title">{t.protein - protein > 0 ? `Noch ${num(t.protein - protein)} g Protein offen` : 'Protein-Ziel erreicht'}</div>
          <div className="list">
            {proteinIdeas.map((i) => (
              <div className="list-item" key={i.label}>
                <span className="idea-dot" />
                <div className="grow">
                  <div className="title">{i.label}</div>
                  <div className="meta">
                    {i.amountLabel} · {num(i.value)} g Protein
                  </div>
                </div>
              </div>
            ))}
          </div>
          {recipeIdea && (
            <a className="idea-link" href={href(`/rezepte/${recipeIdea.recipe.id}`)}>
              <span>
                Rezeptidee: <strong>{recipeIdea.recipe.name}</strong> · {num(recipeIdea.value)} g Protein
              </span>
              <ArrowUpRight size={16} />
            </a>
          )}
          {proteinIdeas.length === 0 && !recipeIdea && <div className="muted small">Für heute passt es. Weitere Ideen unter Nährstoffe.</div>}
        </div>

        <div className="glass-panel lower-micro">
          <div className="panel-head">
            <span className="hud-label dark">{range.provisional ? 'Nährstoffe · 7 Tage (vorläufig)' : 'Nährstoffe · 7 Tage'}</span>
            <a className="panel-link" href={href('/naehrstoffe')}>
              Alle <ArrowUpRight size={14} />
            </a>
          </div>
          {range.usedDays.length === 0 ? (
            <div className="muted small">Noch keine Einträge in den letzten 7 Tagen.</div>
          ) : (
            <NutrientRows compact keys={MICROS} values={(k) => ({ value: range.averages[k].value, partial: range.averages[k].partial })} />
          )}
        </div>

        <div className="glass-panel lower-data">
          <div className="panel-head">
            <span className="hud-label dark">Daten</span>
            <HardDrive size={16} />
          </div>
          <div className="panel-title">Lokal auf diesem Gerät</div>
          <div className="stack-sm small">
            <div className="row-between">
              <span className="muted">Letztes Backup</span>
              <span className={backupAge === undefined || backupAge > 14 ? 'warn-text' : ''}>
                {backupAge === undefined ? 'noch keins' : backupAge === 0 ? 'heute' : `vor ${backupAge} Tagen`}
              </span>
            </div>
            <div className="row-between">
              <span className="muted">Einträge</span>
              <span className="num">{num(data.foodLogs.length + data.drinkLogs.length + data.workouts.length + data.weights.length)}</span>
            </div>
            <div className="muted tiny">Keine automatische Synchronisierung zwischen Mac und iPhone, Übertragung per Backup.</div>
          </div>
          <a className="btn btn-sm" href={href('/einstellungen?tab=daten')} style={{ marginTop: 12 }}>
            Backup & Export
          </a>
        </div>
      </section>

      <footer className="home-foot muted tiny">
        Programm seit {formatDate(settings.program.startDate)} · bis {formatDate(addDays(settings.program.startDate, settings.program.weeks * 7 - 1))} · Ziel {num(t.kcal)} kcal · {t.protein} g Protein
      </footer>
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

function MiniBar({ value, max, warn }: { value: number; max: number; warn?: boolean }) {
  const p = max > 0 ? clamp(value / max, 0, 1) : 0
  return (
    <div className={`tile-bar ${warn ? 'warn' : ''}`}>
      <span style={{ width: `${p * 100}%` }} />
    </div>
  )
}

function AreaTile({
  index,
  href: to,
  icon: IconCmp,
  title,
  stat,
  unit,
  caption,
  links,
  action,
  children,
}: {
  index: number
  href: string
  icon: Icon
  title: string
  stat: string
  unit: string
  caption: string
  links?: [string, string][]
  action?: ReactNode
  children?: ReactNode
}) {
  const ref = useRef<HTMLAnchorElement>(null)
  const onMove = (e: PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType !== 'mouse' || prefersReducedMotion()) return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.setProperty('--mx', `${x * 100}%`)
    el.style.setProperty('--my', `${y * 100}%`)
    el.style.setProperty('--rx', `${(0.5 - y) * 7}deg`)
    el.style.setProperty('--ry', `${(x - 0.5) * 9}deg`)
  }
  const onLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }
  return (
    <a ref={ref} className="tile" href={href(to)} style={{ ['--i' as string]: index } as CSSProperties} onPointerMove={onMove} onPointerLeave={onLeave}>
      <span className="tile-sheen" aria-hidden />
      <div className="tile-top">
        <span className="tile-orb">
          <IconCmp size={20} strokeWidth={1.9} />
        </span>
        <span className="tile-title">{title}</span>
        {action ?? <ArrowUpRight className="tile-arrow" size={18} />}
      </div>
      <div className="tile-stat">
        <span className="tile-value num">{stat}</span>
        <span className="tile-unit">{unit}</span>
      </div>
      <div className="tile-caption">{caption}</div>
      {children && <div className="tile-viz">{children}</div>}
      {links && (
        <div className="tile-links">
          {links.map(([label, path]) => (
            <span
              key={path}
              role="link"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                window.location.hash = path
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  window.location.hash = path
                }
              }}
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </a>
  )
}

