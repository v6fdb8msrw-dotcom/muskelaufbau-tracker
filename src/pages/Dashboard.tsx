import { ArrowRight, Dumbbell, GlassWater, HardDrive, Info, Music, Pill, Plus, Scale, ShoppingBasket, Sparkles, UtensilsCrossed } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Sparkline } from '../components/charts'
import { useDayTotals, useIsMobile, useProgram, useShoppingWeek } from '../components/hooks'
import { NutrientRows } from '../components/NutrientRows'
import { Bar, Card, CardHead, Ring } from '../components/ui'
import { useUi } from '../components/UiContext'
import { EXERCISE_MAP } from '../data/exercises'
import { SESSION_MAP } from '../data/plan'
import { balanceSummary } from '../domain/balance'
import { foodIdeas, recipeIdeas } from '../domain/ideas'
import { analyzeRange } from '../domain/nutrition'
import { plannedSessionsForWeek, sessionStatus, setsForWeek } from '../domain/training'
import { weeklyTrend, withMovingAverage } from '../domain/weight'
import { diffDays, formatDate, formatDateLong, relativeDay, WEEKDAY_SHORT, weekDates } from '../lib/date'
import { euro, kg, ml, num } from '../lib/format'
import { buildCreatineLog, buildDrinkLog } from '../state/actions'
import { href } from '../state/router'
import { useStore } from '../state/store'
import { useToast } from '../state/toast'
import type { NutrientKey } from '../types'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 11) return 'Guten Morgen'
  if (h < 18) return 'Guten Tag'
  return 'Guten Abend'
}

const DASH_MICROS: NutrientKey[] = ['vitC', 'calcium', 'magnesium', 'iron', 'zinc', 'iodine', 'folate', 'epaDha']

export function Dashboard() {
  const store = useStore()
  const { data, settings, meta } = store
  const { openFood, openDrink, openWeight } = useUi()
  const { toast } = useToast()
  const { today, week, weekStart, next } = useProgram()
  const isMobile = useIsMobile()
  const totals = useDayTotals(today)
  const t = settings.targets
  const v = totals.profile.values
  const kcal = v.kcal ?? 0
  const protein = v.protein ?? 0
  const remainingKcal = t.kcal - kcal
  const remainingProtein = t.protein - protein
  const shopping = useShoppingWeek(weekStart)
  const range = useMemo(() => analyzeRange(data, today, 7), [data, today])
  const weights = useMemo(() => withMovingAverage(data.weights), [data.weights])
  const trend = useMemo(() => weeklyTrend(data.weights, today), [data.weights, today])
  const balance = useMemo(() => balanceSummary(data.workouts, data.arms, settings), [data.workouts, data.arms, settings])
  const weekSessions = useMemo(() => (week >= 1 ? plannedSessionsForWeek(settings, data.schedule, week) : []), [settings, data.schedule, week])
  const done = weekSessions.filter((s) => sessionStatus(s, data.workouts, today) === 'done').length
  const days = weekDates(weekStart)
  const daysLogged = days.filter((d) => data.foodLogs.some((f) => f.date === d)).length
  const [persisted, setPersisted] = useState<boolean>()
  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted)
  }, [])

  const proteinIdeas = remainingProtein > 12 ? foodIdeas('protein', settings, data.products, 3) : []
  const recipeIdea = remainingProtein > 25 && remainingKcal > 300 ? recipeIdeas('protein', settings, { maxKcal: remainingKcal + 150, limit: 1 })[0] : undefined
  const microGaps = range.usedDays.length >= 3
    ? (['vitC', 'fiber', 'calcium', 'magnesium'] as NutrientKey[]).filter((k) => {
        const a = range.averages[k]
        const ref = k === 'fiber' ? t.fiber : undefined
        return a.value !== undefined && (ref ? a.value < ref * 0.8 : (a.value ?? 0) < 0.7 * ({ vitC: 110, calcium: 1000, magnesium: 350 } as Record<string, number>)[k])
      })
    : []
  const nextSession = next ? SESSION_MAP[next.sessionId] : undefined
  const playlist = settings.spotify.savedPlaylists.find((p) => p.sessionId === next?.sessionId) ?? settings.spotify.savedPlaylists[0]
  const lastWeight = weights[weights.length - 1]
  const backupAge = meta.lastBackupAt ? diffDays(today, meta.lastBackupAt.slice(0, 10)) : undefined
  const entriesTotal = data.foodLogs.length + data.drinkLogs.length + data.workouts.length + data.weights.length

  async function quickDrink(amount: number) {
    await store.save('drinkLogs', buildDrinkLog({ drinkId: 'wasser', ml: amount, date: today }))
    toast(`Wasser: ${amount} ml eingetragen`)
  }

  return (
    <div className="page dashboard">
      <header className="page-head">
        <div>
          <div className="eyebrow">{formatDateLong(today)}</div>
          <h1>
            {greeting()}
            {settings.profile.name ? `, ${settings.profile.name}` : ''}.
          </h1>
          <p className="lead">
            {week >= 1 && week <= 16 ? `Woche ${week} von 16 deines Muskelaufbau-Programms.` : week < 1 ? `Dein Programm startet am ${formatDate(settings.program.startDate)}.` : 'Die 16 Wochen sind geschafft.'}
            {week >= 1 && week <= 2 && ' Einstiegsphase: höchstens zwei Arbeitssätze pro Übung.'}
          </p>
        </div>
        <div className="page-actions desktop-only">
          <button type="button" className="btn" onClick={() => openWeight()}>
            <Scale size={16} /> Gewicht
          </button>
          <button type="button" className="btn" onClick={() => openDrink()}>
            <GlassWater size={16} /> Trinken
          </button>
          <button type="button" className="btn btn-primary" onClick={() => openFood()}>
            <Plus size={16} /> Essen eintragen
          </button>
        </div>
      </header>

      {!settings.profile.confirmed && (
        <div className="notice warn" style={{ marginBottom: 18, alignItems: 'center' }}>
          <Info size={17} />
          <div className="grow">
            Auf diesem Gerät fehlen noch deine persönlichen Startwerte (Alter, Größe, Gewicht, Ziele). Trage sie ein oder importiere ein Backup von deinem Mac bzw. iPhone.
          </div>
          <a className="btn btn-sm" href={href('/einstellungen?tab=profil')}>
            Profil
          </a>
          <a className="btn btn-sm btn-dark" href={href('/einstellungen?tab=daten')}>
            Backup importieren
          </a>
        </div>
      )}

      {settings.supplements.creatineEnabled && settings.supplements.creatineReminder && !data.supplementLogs.some((x) => x.date === today && x.kind === 'creatine') && (
        <div className="notice" style={{ marginBottom: 18, alignItems: 'center' }}>
          <Pill size={17} />
          <div className="grow">Kreatin ist heute noch nicht eingetragen. Nur eintragen, wenn du es wirklich nimmst.</div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={async () => {
              await store.save('supplementLogs', buildCreatineLog(settings.supplements.creatineDoseG, today))
              toast(`Kreatin ${settings.supplements.creatineDoseG} g eingetragen`)
            }}
          >
            {settings.supplements.creatineDoseG} g eintragen
          </button>
        </div>
      )}

      <div className="dash-grid">
        {/* Kalorien & Makros */}
        <Card marble className="dash-hero" index={0}>
          <div className="hero-inner">
            <div className="hero-ring">
              <Ring value={kcal} max={t.kcal} size={isMobile ? 128 : 168} stroke={isMobile ? 10 : 12}>
                <div>
                  <div className="stat-value xl">{num(Math.abs(remainingKcal))}</div>
                  <div className="muted small">{remainingKcal >= 0 ? 'kcal offen' : 'kcal über Ziel'}</div>
                </div>
              </Ring>
            </div>
            <div className="hero-head">
              <div className="eyebrow">Heute gegessen</div>
              <div className="stat-value">
                {num(kcal)}
                <span className="stat-unit">/ {num(t.kcal)} kcal</span>
              </div>
              {totals.entryCount === 0 && <span className="badge" style={{ marginTop: 6 }}>noch keine Einträge</span>}
            </div>
            <div className="hero-macros">
              <MacroLine label="Protein" value={protein} target={t.protein} unit="g" strong />
              <MacroLine label="Kohlenhydrate" value={v.carbs ?? 0} target={t.carbs} unit="g" />
              <MacroLine label="Fett" value={v.fat ?? 0} target={t.fat} unit="g" />
              <MacroLine label="Ballaststoffe" value={v.fiber ?? 0} target={t.fiber} unit="g" partial={totals.profile.partial.includes('fiber')} />
            </div>
          </div>
        </Card>

        {/* Nächstes Training */}
        <Card dark className="dash-train" index={1}>
          <div className="eyebrow">Nächstes Training</div>
          {next && nextSession ? (
            <div className="stack" style={{ marginTop: 10 }}>
              <div>
                <div className="display" style={{ fontSize: 30, lineHeight: 1.1 }}>
                  {nextSession.title}
                </div>
                <div className="muted small" style={{ marginTop: 6 }}>
                  {relativeDay(next.date, today)} · Woche {next.week} · {nextSession.exercises.length} Übungen ·{' '}
                  {nextSession.exercises.reduce((s, e) => s + setsForWeek(e, next.week) * (e.perSide ? 2 : 1), 0)} Sätze
                </div>
              </div>
              <div className="row-wrap" style={{ gap: 6 }}>
                {nextSession.exercises.slice(0, 4).map((e) => (
                  <span key={e.exerciseId} className="badge" style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)', color: '#e9eaeb' }}>
                    {EXERCISE_MAP[e.exerciseId].name}
                  </span>
                ))}
              </div>
              <div className="row-wrap" style={{ marginTop: 'auto' }}>
                <a className="btn btn-primary" href={href(`/training/${next.key}`)}>
                  <Dumbbell size={16} /> {next.date === today ? 'Training starten' : 'Ansehen'}
                </a>
                {playlist && (
                  <a className="btn btn-ghost" style={{ color: '#e9eaeb' }} href={playlist.url} target="_blank" rel="noopener noreferrer">
                    <Music size={16} /> Playlist
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="muted" style={{ marginTop: 10 }}>
              Keine weitere Einheit im 16-Wochen-Plan. <a href={href('/plan')}>Zum Plan</a>
            </div>
          )}
        </Card>

        {/* Mobile Schnellaktionen */}
        <Card className="mobile-only dash-quick" index={2}>
          <div className="quick-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
            <button type="button" className="quick-btn" onClick={() => openFood()}>
              <UtensilsCrossed size={18} /> Essen
            </button>
            <button type="button" className="quick-btn" onClick={() => openDrink()}>
              <GlassWater size={18} /> Trinken
            </button>
            <button type="button" className="quick-btn" onClick={() => openWeight()}>
              <Scale size={18} /> Gewicht
            </button>
            {playlist ? (
              <a className="quick-btn" href={playlist.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <Music size={18} /> Playlist
              </a>
            ) : (
              <a className="quick-btn" href={href('/spotify')} style={{ textDecoration: 'none' }}>
                <Music size={18} /> Spotify
              </a>
            )}
          </div>
        </Card>

        {/* Trinken */}
        <Card className="dash-fluid" index={3}>
          <CardHead eyebrow="Trinkmenge" title={<span className="num">{ml(totals.fluidMl)}</span>} action={<a className="btn btn-sm btn-ghost" href={href('/trinken')}>Details</a>} />
          <Bar value={totals.fluidMl} max={t.fluidMl} size="thick" label="Trinkmenge" />
          <div className="row-between" style={{ marginTop: 10 }}>
            <span className="muted small">Ziel {ml(t.fluidMl)}</span>
            <div className="row" style={{ gap: 6 }}>
              <button type="button" className="btn btn-sm" onClick={() => quickDrink(250)}>
                +250
              </button>
              <button type="button" className="btn btn-sm" onClick={() => quickDrink(500)}>
                +500
              </button>
            </div>
          </div>
        </Card>

        {/* Wochenfortschritt */}
        <Card className="dash-week" index={4}>
          <CardHead eyebrow="Diese Woche" title={`${done} von ${weekSessions.length || 4} Trainings`} action={<a className="btn btn-sm btn-ghost" href={href('/woche')}>Korrektur</a>} />
          <div className="week-strip">
            {WEEKDAY_SHORT.map((label, i) => {
              const iso = days[i]
              const s = weekSessions.find((x) => x.date === iso)
              const st = s ? sessionStatus(s, data.workouts, today) : undefined
              return (
                <div key={label} className={`day-pill ${iso === today ? 'today' : ''} ${st === 'done' ? 'done' : st === 'missed' ? 'missed' : ''}`}>
                  {label}
                  <strong>{s ? '●' : '·'}</strong>
                </div>
              )
            })}
          </div>
          <div className="muted small" style={{ marginTop: 10 }}>
            Ernährung an {daysLogged} von 7 Tagen erfasst
          </div>
        </Card>

        {/* Gewicht */}
        <Card className="dash-weight" index={5}>
          <CardHead eyebrow="Gewicht" title={lastWeight ? kg(lastWeight.kg) : 'Noch kein Wert'} action={<button type="button" className="btn btn-sm" onClick={() => openWeight()}>Eintragen</button>} />
          {lastWeight ? (
            <div className="row-between">
              <div className="small">
                <div>
                  7-Tage-Schnitt <strong className="num">{kg(lastWeight.avg7)}</strong>
                </div>
                <div className="muted">
                  {trend.enoughData && trend.perWeek !== undefined
                    ? `${trend.perWeek >= 0 ? '+' : ''}${num(trend.perWeek * 1000)} g pro Woche`
                    : 'Trend nach zwei Wochen Messungen'}
                </div>
              </div>
              <Sparkline values={weights.slice(-21).map((w) => w.avg7)} />
            </div>
          ) : (
            <div className="muted small">Startgewicht laut Profil: {kg(settings.profile.startWeightKg)}</div>
          )}
        </Card>

        {/* Arm-Balance */}
        <Card className="dash-arms" index={6}>
          <CardHead eyebrow="Arm-Balance" title={balance.weaker ? `Schwächer: ${balance.weaker === 'left' ? 'links' : 'rechts'}` : 'Seite festlegen'} action={<a className="btn btn-sm btn-ghost" href={href('/fortschritt?tab=arme')}>Verlauf</a>} />
          {!balance.weaker ? (
            <div className="muted small">
              Lege in den <a href={href('/einstellungen?tab=training')}>Einstellungen</a> fest, welcher Arm schwächer ist. Dann beginnen einarmige Übungen immer mit dieser Seite.
            </div>
          ) : balance.ratio !== undefined ? (
            <div className="stack-sm">
              <div className="small">
                Schwächere Seite bewegt <strong className="num">{Math.round(balance.ratio * 100)} %</strong> des Volumens der stärkeren
              </div>
              <Bar value={balance.ratio} max={1} />
            </div>
          ) : (
            <div className="muted small">Noch keine einarmigen Sätze protokolliert.</div>
          )}
          {balance.measurement && (
            <div className="muted small" style={{ marginTop: 8 }}>
              Umfang ({balance.measurement.state}): L {num(balance.measurement.leftCm, 1)} cm · R {num(balance.measurement.rightCm, 1)} cm
            </div>
          )}
        </Card>

        {/* Budget */}
        <Card className="dash-budget" index={7}>
          <CardHead eyebrow="Einkaufsbudget" title={<span className="num">{euro(shopping.budgetCash)}</span>} action={<a className="btn btn-sm btn-ghost" href={href('/einkauf')}>Liste</a>} />
          <Bar value={shopping.budgetCash} max={settings.budget.max} variant={shopping.status === 'ueber' ? 'warn' : undefined} marker={settings.budget.min} />
          <div className="row-between small" style={{ marginTop: 10 }}>
            <span className="muted">
              Ziel {settings.budget.min}–{settings.budget.max} € · Mittag + Getränke
            </span>
            <span className="row" style={{ gap: 6 }}>
              <ShoppingBasket size={14} /> {shopping.lines.filter((l) => !l.checked && !l.transferred && l.toBuy > 0).length} offen
            </span>
          </div>
        </Card>

        {/* Ergänzungen */}
        <Card className="dash-ideas" index={8}>
          <CardHead eyebrow="Passende Ergänzungen" title={remainingProtein > 0 ? `Noch ${num(remainingProtein)} g Protein offen` : 'Protein-Ziel erreicht'} />
          <div className="stack">
            {proteinIdeas.length > 0 && (
              <div className="list">
                {proteinIdeas.map((i) => (
                  <div className="list-item" key={i.label}>
                    <span className="icon-tile neon">
                      <Sparkles size={16} />
                    </span>
                    <div className="grow">
                      <div className="title">{i.label}</div>
                      <div className="meta">
                        {i.amountLabel} · {num(i.value)} g Protein
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {recipeIdea && (
              <a className="notice neon" href={href(`/rezepte/${recipeIdea.recipe.id}`)} style={{ textDecoration: 'none' }}>
                <ArrowRight size={17} />
                <div>
                  Rezeptidee: <strong>{recipeIdea.recipe.name}</strong> · {num(recipeIdea.value)} g Protein, {num(recipeIdea.kcal)} kcal
                </div>
              </a>
            )}
            {microGaps.length > 0 && (
              <div className="muted small">
                Im 7-Tage-Schnitt eher niedrig: {microGaps.map((k) => ({ vitC: 'Vitamin C', fiber: 'Ballaststoffe', calcium: 'Calcium', magnesium: 'Magnesium' })[k as 'vitC']).join(', ')}.{' '}
                <a href={href('/naehrstoffe')}>Ideen ansehen</a>
              </div>
            )}
            {remainingProtein <= 0 && remainingKcal <= 0 && <div className="muted small">Kalorien und Protein für heute erreicht.</div>}
          </div>
        </Card>

        {/* Nährstoffe */}
        <Card className="dash-micro" index={9}>
          <CardHead
            eyebrow={range.provisional ? '7 Tage · vorläufig' : `7 Tage · ${range.usedDays.length} vollständige Tage`}
            title="Nährstoffübersicht"
            action={<a className="btn btn-sm btn-ghost" href={href('/naehrstoffe')}>Alle</a>}
          />
          {range.usedDays.length === 0 ? (
            <div className="muted small">Noch keine Daten in den letzten 7 Tagen.</div>
          ) : (
            <NutrientRows compact keys={DASH_MICROS} values={(k) => ({ value: range.averages[k].value, partial: range.averages[k].partial })} />
          )}
        </Card>

        {/* Speicher */}
        <Card className="dash-storage" index={10}>
          <CardHead eyebrow="Datenspeicherung" title="Lokal auf diesem Gerät" action={<HardDrive size={18} color="var(--ink-3)" />} />
          <div className="stack-sm small">
            <div className="row-between">
              <span className="muted">Einträge</span>
              <span className="num">{num(entriesTotal)}</span>
            </div>
            <div className="row-between">
              <span className="muted">Dauerhafter Speicher</span>
              <span>{persisted === undefined ? 'unbekannt' : persisted ? 'aktiv' : 'nicht bestätigt'}</span>
            </div>
            <div className="row-between">
              <span className="muted">Letztes Backup</span>
              <span className={backupAge === undefined || backupAge > 14 ? 'warn-text' : ''}>
                {backupAge === undefined ? 'noch keins' : backupAge === 0 ? 'heute' : `vor ${backupAge} Tagen`}
              </span>
            </div>
            <div className="muted tiny" style={{ marginTop: 4 }}>
              Keine automatische Synchronisierung: Mac und iPhone haben getrennte Daten. Übertragen per JSON-Export.
            </div>
            <a className="btn btn-sm" href={href('/einstellungen?tab=daten')} style={{ marginTop: 6 }}>
              Backup &amp; Export
            </a>
          </div>
        </Card>
      </div>
    </div>
  )
}

function MacroLine({ label, value, target, unit, strong, partial }: { label: string; value: number; target: number; unit: string; strong?: boolean; partial?: boolean }) {
  return (
    <div className="stack-sm" style={{ gap: 5 }}>
      <div className="row-between small">
        <span style={{ fontWeight: strong ? 700 : 600 }}>{label}</span>
        <span className="num muted">
          <strong style={{ color: 'var(--ink)' }}>
            {partial ? '≥ ' : ''}
            {num(value)}
          </strong>{' '}
          / {num(target)} {unit}
        </span>
      </div>
      <Bar value={value} max={target} size={strong ? undefined : 'thin'} variant={strong ? undefined : 'ink'} partial={partial} label={label} />
    </div>
  )
}
