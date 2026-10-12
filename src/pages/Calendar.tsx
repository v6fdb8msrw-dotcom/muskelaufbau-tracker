import { useMemo, useState } from 'react'
import { useProgram } from '../components/hooks'
import { Card, Field, Modal, PageHead } from '../components/ui'
import { SESSION_MAP } from '../data/plan'
import { dayTotals } from '../domain/nutrition'
import { allPlannedSessions, sessionStatus, weekStart, type PlannedSession } from '../domain/training'
import { addDays, formatDateLong, formatDateShort, WEEKDAY_SHORT } from '../lib/date'
import { stamp } from '../lib/id'
import { num } from '../lib/format'
import { href } from '../state/router'
import { useStore } from '../state/store'
import { useToast } from '../state/toast'
import type { ScheduleChange } from '../types'

const STATUS_LABEL = { done: 'erledigt', missed: 'verpasst', today: 'heute', upcoming: 'geplant', skipped: 'ausgelassen' }

export default function CalendarPage() {
  const store = useStore()
  const { data, settings } = store
  const { today, week } = useProgram()
  const [selected, setSelected] = useState<string>()
  const sessions = useMemo(() => allPlannedSessions(settings, data.schedule), [settings, data.schedule])
  const byDate = useMemo(() => {
    const m = new Map<string, PlannedSession[]>()
    for (const s of sessions) m.set(s.date, [...(m.get(s.date) ?? []), s])
    return m
  }, [sessions])
  const loggedDays = useMemo(() => new Set(data.foodLogs.map((f) => f.date)), [data.foodLogs])
  const weightDays = useMemo(() => new Set(data.weights.map((f) => f.date)), [data.weights])
  const done = sessions.filter((s) => sessionStatus(s, data.workouts, today) === 'done').length

  return (
    <div className="page">
      <PageHead
        eyebrow={`${done} von ${sessions.length} Einheiten erledigt`}
        title="Trainingskalender"
        lead="16 Wochen im Überblick. Tippe auf einen Tag, um eine Einheit zu protokollieren, zu verschieben oder auszulassen."
      />
      <div className="legend" style={{ marginBottom: 14 }}>
        <span>
          <span className="cal-chip done">erledigt</span>
        </span>
        <span>
          <span className="cal-chip today">heute</span>
        </span>
        <span>
          <span className="cal-chip">geplant</span>
        </span>
        <span>
          <span className="cal-chip missed">verpasst</span>
        </span>
        <span>
          <span className="dot neon" /> Ernährung erfasst
        </span>
        <span>
          <span className="dot" /> Gewicht
        </span>
      </div>
      <Card index={0}>
        <div className="scroll-x">
          <div className="cal-grid">
            <div />
            {WEEKDAY_SHORT.map((d) => (
              <div key={d} className="cal-head">
                {d}
              </div>
            ))}
            {Array.from({ length: settings.program.weeks }, (_, i) => i + 1).map((w) => {
              const monday = weekStart(settings, w)
              return [
                <div key={`l${w}`} className="cal-week-label" style={w === week ? { color: 'var(--ink)' } : undefined}>
                  <strong>Woche {w}</strong>
                  {formatDateShort(monday)}
                </div>,
                ...Array.from({ length: 7 }, (_, d) => {
                  const date = addDays(monday, d)
                  const list = byDate.get(date) ?? []
                  const out = date < settings.program.startDate
                  return (
                    <button key={date} type="button" className={`cal-cell ${date === today ? 'today' : ''} ${out ? 'out' : ''}`} onClick={() => setSelected(date)}>
                      <div className="row-between">
                        <span className="cal-date">{formatDateShort(date)}</span>
                        <span className="row" style={{ gap: 3 }}>
                          {loggedDays.has(date) && <span className="dot neon" style={{ width: 6, height: 6 }} />}
                          {weightDays.has(date) && <span className="dot" style={{ width: 6, height: 6 }} />}
                        </span>
                      </div>
                      {list.map((s) => {
                        const st = sessionStatus(s, data.workouts, today)
                        return (
                          <span key={s.key} className={`cal-chip ${st}`} title={`${SESSION_MAP[s.sessionId].title} · ${STATUS_LABEL[st]}`}>
                            {SESSION_MAP[s.sessionId].short}
                          </span>
                        )
                      })}
                    </button>
                  )
                }),
              ]
            })}
          </div>
        </div>
      </Card>
      {selected && <DayDialog date={selected} sessions={byDate.get(selected) ?? []} onClose={() => setSelected(undefined)} />}
    </div>
  )
}

function DayDialog({ date, sessions, onClose }: { date: string; sessions: PlannedSession[]; onClose: () => void }) {
  const store = useStore()
  const { data } = store
  const { toast } = useToast()
  const { today } = useProgram()
  const [moving, setMoving] = useState<string>()
  const [target, setTarget] = useState(date)
  const totals = dayTotals(data, date)
  const workouts = data.workouts.filter((w) => w.date === date && !w.plannedKey)

  async function change(key: string, patch: Partial<ScheduleChange>) {
    const existing = data.schedule.find((s) => s.id === key)
    await store.save('schedule', existing ? { ...existing, ...patch, updatedAt: new Date().toISOString() } : stamp<ScheduleChange>({ id: key, ...patch }))
  }

  const conflict = moving && allPlannedSessions(store.settings, data.schedule).some((s) => s.key !== moving && s.date === target && !s.skipped)

  return (
    <Modal title={formatDateLong(date)} onClose={onClose}>
      <div className="stack">
        {sessions.length === 0 && workouts.length === 0 && <div className="muted small">Kein Training geplant. Ruhetag.</div>}
        {sessions.map((s) => {
          const st = sessionStatus(s, data.workouts, today)
          return (
            <div key={s.key} className="card flat" style={{ padding: 16 }}>
              <div className="row-between">
                <div>
                  <div className="strong">{SESSION_MAP[s.sessionId].title}</div>
                  <div className="muted small">
                    Woche {s.week} · {STATUS_LABEL[st]}
                    {s.moved ? ` · verschoben vom ${formatDateShort(s.defaultDate)}` : ''}
                  </div>
                </div>
                <a className={`btn btn-sm ${st === 'done' ? '' : 'btn-primary'}`} href={href(`/training/${s.key}`)}>
                  {st === 'done' ? 'Ansehen' : 'Protokollieren'}
                </a>
              </div>
              {st !== 'done' && (
                <div className="row-wrap" style={{ marginTop: 12 }}>
                  {moving === s.key ? (
                    <>
                      <Field label="Neuer Tag">
                        <input className="input" type="date" value={target} onChange={(e) => setTarget(e.target.value)} />
                      </Field>
                      <button
                        type="button"
                        className="btn btn-sm btn-dark"
                        style={{ alignSelf: 'flex-end' }}
                        disabled={!!conflict}
                        onClick={async () => {
                          await change(s.key, { movedTo: target, skipped: false })
                          toast('Einheit verschoben')
                          setMoving(undefined)
                          onClose()
                        }}
                      >
                        Verschieben
                      </button>
                      {conflict && <div className="tiny warn-text">An diesem Tag ist schon eine Einheit. Keine zwei Einheiten an einem Tag.</div>}
                    </>
                  ) : (
                    <button type="button" className="btn btn-sm" onClick={() => setMoving(s.key)}>
                      Verschieben
                    </button>
                  )}
                  {s.moved && (
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => change(s.key, { movedTo: undefined })}>
                      Zurück auf {formatDateShort(s.defaultDate)}
                    </button>
                  )}
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => change(s.key, { skipped: !s.skipped })}>
                    {s.skipped ? 'Wieder einplanen' : 'Auslassen'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {workouts.map((w) => (
          <div key={w.id} className="row-between">
            <span>
              <strong>{w.title}</strong> <span className="muted small">(freies Training)</span>
            </span>
            <a className="btn btn-sm" href={href(`/training/log-${w.id}`)}>
              Ansehen
            </a>
          </div>
        ))}
        <hr className="divider" />
        <div className="row-between small">
          <span className="muted">
            {totals.entryCount ? `${num(totals.profile.values.kcal ?? 0)} kcal · ${num(totals.profile.values.protein ?? 0)} g Protein erfasst` : 'Keine Ernährungseinträge'}
          </span>
          <a className="btn btn-sm" href={href(date === today ? '/protokoll' : `/protokoll?datum=${date}`)}>
            Tagesprotokoll
          </a>
        </div>
      </div>
    </Modal>
  )
}
