import { Pencil, Plus, Ruler, Scale } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BarChart, LineChart } from '../components/charts'
import { ConfirmButton } from '../components/ConfirmButton'
import { useProgram } from '../components/hooks'
import { ArmDialog, WeightDialog } from '../components/MeasureDialogs'
import { Card, CardHead, Empty, Notice, PageHead, Seg, Tabs } from '../components/ui'
import { ARM_BALANCE_EXERCISES, EXERCISE_MAP } from '../data/exercises'
import { PLAN_RULES } from '../data/plan'
import { balanceHistory, balanceSummary } from '../domain/balance'
import { allPlannedSessions, sessionStatus } from '../domain/training'
import { calorieSuggestion, sortedWeights, weeklyTrend, withMovingAverage } from '../domain/weight'
import { addDays, formatDate } from '../lib/date'
import { kg, num } from '../lib/format'
import { applySuggestion, ignoreSuggestion } from '../state/actions'
import { href, navigate, type Route } from '../state/router'
import { useStore } from '../state/store'
import { useToast } from '../state/toast'
import type { ArmMeasurement, WeightEntry } from '../types'
import { exerciseSeries } from './Exercises'

type Tab = 'gewicht' | 'kraft' | 'arme' | 'training'

export default function Progress({ route }: { route: Route }) {
  const tab = (route.query.get('tab') as Tab) ?? 'gewicht'
  return (
    <div className="page">
      <PageHead eyebrow="16 Wochen Muskelaufbau" title="Fortschritt" lead="Gewicht mit 7-Tage-Durchschnitt, Kraftentwicklung, Links-rechts-Balance deiner Arme und Trainingstreue." />
      <Tabs
        value={tab}
        onChange={(t) => navigate(`/fortschritt?tab=${t}`)}
        options={[
          { value: 'gewicht', label: 'Gewicht' },
          { value: 'kraft', label: 'Kraft' },
          { value: 'arme', label: 'Arm-Balance' },
          { value: 'training', label: 'Trainingstreue' },
        ]}
      />
      {tab === 'gewicht' && <WeightTab />}
      {tab === 'kraft' && <StrengthTab />}
      {tab === 'arme' && <ArmsTab />}
      {tab === 'training' && <AdherenceTab />}
    </div>
  )
}

function WeightTab() {
  const store = useStore()
  const { data, settings } = store
  const { toast } = useToast()
  const { today } = useProgram()
  const [dialog, setDialog] = useState<{ entry?: WeightEntry } | null>(null)
  const points = useMemo(() => withMovingAverage(data.weights), [data.weights])
  const trend = useMemo(() => weeklyTrend(data.weights, today), [data.weights, today])
  const suggestion = calorieSuggestion(data.weights, settings, today)
  const sugState = suggestion && data.suggestions.find((s) => s.id === suggestion.id)
  const start = settings.profile.startWeightKg
  const last = points[points.length - 1]
  const weeksIn = Math.max(0, (new Date(today).getTime() - new Date(settings.program.startDate).getTime()) / (7 * 86400000))
  const band = { from: start + (settings.targets.gainMinG / 1000) * weeksIn, to: start + (settings.targets.gainMaxG / 1000) * weeksIn }
  const list = [...sortedWeights(data.weights)].reverse()

  return (
    <div className="stack-lg">
      <div className="grid grid-4">
        <Card index={0}>
          <div className="eyebrow">Start</div>
          <div className="stat-value">{kg(start)}</div>
          <div className="stat-sub">laut Profil</div>
        </Card>
        <Card index={1}>
          <div className="eyebrow">7-Tage-Schnitt</div>
          <div className="stat-value">{last ? kg(last.avg7) : '–'}</div>
          <div className="stat-sub">{last ? `letzte Messung ${kg(last.kg)}` : 'noch keine Messung'}</div>
        </Card>
        <Card index={2}>
          <div className="eyebrow">Seit Start</div>
          <div className="stat-value">{last ? `${last.avg7 - start >= 0 ? '+' : ''}${num((last.avg7 - start) * 1000)} g` : '–'}</div>
          <div className="stat-sub">Ziel +{settings.targets.gainMinG}–{settings.targets.gainMaxG} g pro Woche</div>
        </Card>
        <Card index={3}>
          <div className="eyebrow">Trend</div>
          <div className="stat-value">{trend.enoughData && trend.perWeek !== undefined ? `${trend.perWeek >= 0 ? '+' : ''}${num(trend.perWeek * 1000)} g` : '–'}</div>
          <div className="stat-sub">pro Woche (7-Tage-Mittel)</div>
        </Card>
      </div>

      {suggestion && !sugState && (
        <Card index={4} marble>
          <CardHead eyebrow="Vorschlag zur Kalorienanpassung" title={`${suggestion.delta > 0 ? '+' : ''}${suggestion.delta} kcal pro Tag`} />
          <p className="small">{suggestion.reason}</p>
          <p className="small" style={{ marginTop: 6 }}>
            Aktuelles Ziel: {num(settings.targets.kcal)} kcal → neu {num(suggestion.newKcal)} kcal. Das Ziel ändert sich erst, wenn du zustimmst.
          </p>
          <div className="suggestion-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={async () => {
                await applySuggestion(store, suggestion.id, { type: 'setKcal', value: suggestion.newKcal })
                toast(`Kalorienziel auf ${num(suggestion.newKcal)} kcal gesetzt`)
              }}
            >
              Übernehmen
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => ignoreSuggestion(store, suggestion.id)}>
              Ignorieren
            </button>
          </div>
        </Card>
      )}

      <Card index={5}>
        <CardHead
          eyebrow="Verlauf"
          title="Gewicht und 7-Tage-Durchschnitt"
          action={
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setDialog({})}>
              <Scale size={15} /> Eintragen
            </button>
          }
        />
        <LineChart
          series={[
            { id: 'kg', label: 'Messwert', points: points.map((p) => ({ x: p.date, y: p.kg })), variant: 'silver', dots: true },
            { id: 'avg', label: '7-Tage-Schnitt', points: points.map((p) => ({ x: p.date, y: p.avg7 })), variant: 'neon' },
          ]}
          unit="kg"
          band={points.length > 1 && weeksIn > 0.5 ? band : undefined}
          empty={<Empty icon={<Scale size={28} />}>Trage dein Gewicht ein, am besten morgens nach dem Aufstehen.</Empty>}
        />
        {points.length > 0 && (
          <div className="legend" style={{ marginTop: 8 }}>
            <span>
              <span className="dot" /> Einzelmessung (schwankt normal um 0,5–1 kg)
            </span>
            <span>
              <span className="dot neon" /> 7-Tage-Durchschnitt
            </span>
            {weeksIn > 0.5 && (
              <span>
                <span className="dot" style={{ background: 'rgba(60,240,124,0.3)' }} /> geplanter Bereich bis heute
              </span>
            )}
          </div>
        )}
      </Card>

      <Card index={6}>
        <CardHead eyebrow="Messungen" title={`${list.length} ${list.length === 1 ? 'Eintrag' : 'Einträge'}`} />
        {list.length === 0 ? (
          <div className="muted small">Noch keine Messungen.</div>
        ) : (
          <div className="list">
            {list.slice(0, 30).map((w) => (
              <div className="list-item" key={w.id}>
                <div className="grow">
                  <div className="title num">{kg(w.kg)}</div>
                  <div className="meta">
                    {formatDate(w.date)}
                    {w.note ? ` · ${w.note}` : ''}
                  </div>
                </div>
                <button type="button" className="btn btn-ghost btn-icon sm" onClick={() => setDialog({ entry: w })} aria-label="Bearbeiten">
                  <Pencil size={15} />
                </button>
                <ConfirmButton onConfirm={() => store.remove('weights', w.id)} />
              </div>
            ))}
          </div>
        )}
      </Card>
      {dialog && <WeightDialog entry={dialog.entry} onClose={() => setDialog(null)} />}
    </div>
  )
}

const STRENGTH = ['floor-press', 'rudern', 'schulterdruecken', 'bizepscurl', 'hammer-curl', 'trizeps-ueberkopf', 'seitheben', 'liegestuetze']

function StrengthTab() {
  const { data } = useStore()
  const charts = STRENGTH.map((id) => ({ ex: EXERCISE_MAP[id], series: exerciseSeries(data.workouts, EXERCISE_MAP[id]) }))
  if (!data.workouts.length) {
    return (
      <Card>
        <Empty action={<a className="btn btn-primary" href={href('/plan')}>Zum Trainingsplan</a>}>Noch keine Trainings protokolliert.</Empty>
      </Card>
    )
  }
  return (
    <div className="grid grid-2">
      {charts.map(({ ex, series }, i) => (
        <Card key={ex.id} index={i}>
          <CardHead eyebrow={ex.bodyweight ? 'Meiste Wiederholungen' : 'Geschätztes 1RM'} title={ex.name} action={<a className="btn btn-sm btn-ghost" href={href(`/uebungen/${ex.id}`)}>Details</a>} />
          {series.every((s) => !s.points.length) ? (
            <div className="muted small">Noch keine Daten.</div>
          ) : (
            <LineChart series={series} height={170} unit={ex.bodyweight ? '' : 'kg'} decimals={ex.bodyweight ? 0 : 1} />
          )}
        </Card>
      ))}
    </div>
  )
}

function ArmsTab() {
  const store = useStore()
  const { data, settings } = store
  const { toast } = useToast()
  const { week } = useProgram()
  const [exId, setExId] = useState(ARM_BALANCE_EXERCISES[0])
  const [state, setState] = useState<ArmMeasurement['state']>('angespannt')
  const [dialog, setDialog] = useState<{ entry?: ArmMeasurement } | null>(null)
  const summary = useMemo(() => balanceSummary(data.workouts, data.arms, settings), [data.workouts, data.arms, settings])
  const history = useMemo(() => balanceHistory(data.workouts, exId), [data.workouts, exId])
  const arms = [...data.arms].filter((a) => a.state === state).sort((a, b) => a.date.localeCompare(b.date))
  const weaker = settings.arms.weakerSide

  return (
    <div className="stack-lg">
      <div className="grid grid-3">
        <Card index={0} marble>
          <CardHead eyebrow="Schwächere Seite" title={weaker ? (weaker === 'left' ? 'Links' : 'Rechts') : 'Noch nicht gewählt'} />
          <Seg
            value={weaker ?? ('none' as 'left' | 'right' | 'none')}
            onChange={(v) => store.updateSettings((s) => ({ ...s, arms: { weakerSide: v === 'none' ? null : v } }))}
            options={[
              { value: 'left', label: 'Links' },
              { value: 'right', label: 'Rechts' },
              { value: 'none', label: 'Offen' },
            ]}
          />
          <div className="muted tiny" style={{ marginTop: 10 }}>
            Einarmige Übungen starten mit dieser Seite. Die stärkere Seite macht dieselbe Anzahl sauberer Wiederholungen, nicht mehr.
          </div>
        </Card>
        <Card index={1}>
          <CardHead eyebrow="Volumen-Verhältnis" title={summary.ratio !== undefined ? `${Math.round(summary.ratio * 100)} %` : '–'} />
          <div className="muted small">Schwächere Seite im Vergleich zur stärkeren, letzte Einheit je Übung.</div>
          <div className="list" style={{ marginTop: 8 }}>
            {summary.perExercise.map((p) => (
              <div className="list-item" key={p.exerciseId}>
                <div className="grow">
                  <div className="title" style={{ fontSize: 13.5 }}>
                    {p.name}
                  </div>
                  <div className="meta">
                    {num(p.weakerKg, 1)} kg vs. {num(p.strongerKg, 1)} kg
                  </div>
                </div>
                {p.ratio !== undefined && <span className="badge">{Math.round(p.ratio * 100)} %</span>}
              </div>
            ))}
          </div>
        </Card>
        <Card index={2}>
          <CardHead eyebrow="Zusatzsatz" title={settings.program.extraWeakSet ? 'Aktiv' : 'Nicht aktiv'} />
          <div className="small muted" style={{ marginBottom: 10 }}>
            Nach 6–8 Wochen darf die schwächere Seite bei einarmigen Armübungen optional einen zusätzlichen Satz bekommen.
          </div>
          {settings.program.extraWeakSet ? (
            <button type="button" className="btn btn-sm" onClick={() => store.updateSettings((s) => ({ ...s, program: { ...s.program, extraWeakSet: false } }))}>
              Deaktivieren
            </button>
          ) : week >= PLAN_RULES.extraWeakSetFromWeek - 1 && weaker ? (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={async () => {
                await store.updateSettings((s) => ({ ...s, program: { ...s.program, extraWeakSet: true } }))
                toast('Zusatzsatz für die schwächere Seite aktiviert')
              }}
            >
              Zusatzsatz aktivieren
            </button>
          ) : (
            <div className="muted tiny">Wird ab Woche {PLAN_RULES.extraWeakSetFromWeek - 1} vorgeschlagen{weaker ? '' : ' (schwächere Seite festlegen)'}.</div>
          )}
        </Card>
      </div>

      <Card index={3}>
        <CardHead
          eyebrow="Kraft links und rechts"
          title="Bestes Gewicht pro Einheit"
          action={<Seg value={exId} onChange={setExId} options={ARM_BALANCE_EXERCISES.map((id) => ({ value: id, label: EXERCISE_MAP[id].name.replace('Einarmiges ', '').replace('Einarmige ', '') }))} />}
        />
        <LineChart
          series={[
            { id: 'l', label: 'Links', points: history.filter((h) => h.left.sets).map((h) => ({ x: h.date, y: h.left.bestKg })), variant: 'neon', dots: true },
            { id: 'r', label: 'Rechts', points: history.filter((h) => h.right.sets).map((h) => ({ x: h.date, y: h.right.bestKg })), variant: 'main', dots: true },
          ]}
          unit="kg"
          empty={<Empty>Noch keine einarmigen Sätze für diese Übung.</Empty>}
        />
        <div className="legend" style={{ marginTop: 8 }}>
          <span>
            <span className="dot neon" /> Links
          </span>
          <span>
            <span className="dot" style={{ background: 'var(--ink)' }} /> Rechts
          </span>
        </div>
      </Card>

      <Card index={4}>
        <CardHead
          eyebrow="Oberarmumfang"
          title="Links vs. rechts"
          action={
            <div className="row-wrap">
              <Seg value={state} onChange={setState} options={[{ value: 'angespannt', label: 'Angespannt' }, { value: 'entspannt', label: 'Entspannt' }]} />
              <button type="button" className="btn btn-sm btn-primary" onClick={() => setDialog({})}>
                <Ruler size={15} /> Messen
              </button>
            </div>
          }
        />
        <LineChart
          series={[
            { id: 'l', label: 'Links', points: arms.map((a) => ({ x: a.date, y: a.leftCm })), variant: 'neon', dots: true },
            { id: 'r', label: 'Rechts', points: arms.map((a) => ({ x: a.date, y: a.rightCm })), variant: 'main', dots: true },
          ]}
          unit="cm"
          empty={<Empty icon={<Ruler size={28} />}>Noch keine Messungen ({state}).</Empty>}
        />
        {data.arms.length > 0 && (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Zustand</th>
                  <th className="num">Links</th>
                  <th className="num">Rechts</th>
                  <th className="num">Differenz</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {[...data.arms]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((a) => (
                    <tr key={a.id}>
                      <td>{formatDate(a.date)}</td>
                      <td className="muted">{a.state}</td>
                      <td className="num">{num(a.leftCm, 1)} cm</td>
                      <td className="num">{num(a.rightCm, 1)} cm</td>
                      <td className="num">{num(Math.abs(a.leftCm - a.rightCm), 1)} cm</td>
                      <td className="num">
                        <button type="button" className="btn btn-ghost btn-icon sm" onClick={() => setDialog({ entry: a })} aria-label="Bearbeiten">
                          <Pencil size={14} />
                        </button>
                        <ConfirmButton onConfirm={() => store.remove('arms', a.id)} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {dialog && <ArmDialog entry={dialog.entry} onClose={() => setDialog(null)} />}
    </div>
  )
}

function AdherenceTab() {
  const { data, settings } = useStore()
  const { today, week } = useProgram()
  const sessions = useMemo(() => allPlannedSessions(settings, data.schedule), [settings, data.schedule])
  const perWeek = Array.from({ length: settings.program.weeks }, (_, i) => {
    const w = i + 1
    const list = sessions.filter((s) => s.week === w)
    const done = list.filter((s) => sessionStatus(s, data.workouts, today) === 'done').length
    return { label: String(w), value: w <= week ? done : undefined, highlight: w === week }
  })
  const done = sessions.filter((s) => sessionStatus(s, data.workouts, today) === 'done').length
  const missed = sessions.filter((s) => sessionStatus(s, data.workouts, today) === 'missed').length
  const free = data.workouts.filter((w) => !w.plannedKey).length
  const notes = [...data.workouts].filter((w) => w.notes).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)
  return (
    <div className="stack-lg">
      <div className="grid grid-4">
        <Card index={0}>
          <div className="eyebrow">Erledigt</div>
          <div className="stat-value">{done}</div>
          <div className="stat-sub">von {sessions.length} geplanten Einheiten</div>
        </Card>
        <Card index={1}>
          <div className="eyebrow">Verpasst</div>
          <div className="stat-value">{missed}</div>
          <div className="stat-sub">kein Problem, einfach weitermachen</div>
        </Card>
        <Card index={2}>
          <div className="eyebrow">Freie Trainings</div>
          <div className="stat-value">{free}</div>
          <div className="stat-sub">zusätzlich protokolliert</div>
        </Card>
        <Card index={3}>
          <div className="eyebrow">Programm</div>
          <div className="stat-value">{Math.max(0, Math.min(week, settings.program.weeks))}/16</div>
          <div className="stat-sub">bis {formatDate(addDays(settings.program.startDate, settings.program.weeks * 7 - 1))}</div>
        </Card>
      </div>
      <Card index={4}>
        <CardHead eyebrow="Einheiten pro Woche" title="Trainingstreue" />
        <BarChart data={perWeek} target={4} />
      </Card>
      {notes.length > 0 && (
        <Card index={5}>
          <CardHead eyebrow="Notizen" title="Deine letzten Trainingsnotizen" />
          <div className="list">
            {notes.map((w) => (
              <div className="list-item" key={w.id}>
                <div className="grow">
                  <div className="title">{w.title}</div>
                  <div className="meta">
                    {formatDate(w.date)} · {w.notes}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      {!data.workouts.length && (
        <Notice>
          Noch keine Trainings. <a href={href('/plan')}>Zum Plan</a> <Plus size={12} />
        </Notice>
      )}
    </div>
  )
}
