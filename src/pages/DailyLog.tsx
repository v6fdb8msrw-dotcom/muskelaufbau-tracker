import { ChevronLeft, ChevronRight, CircleCheck, Dumbbell, GlassWater, Pencil, Pill, Plus, UtensilsCrossed } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ConfirmButton } from '../components/ConfirmButton'
import { useToday } from '../components/hooks'
import { MEAL_LABEL, MEAL_ORDER } from '../components/labels'
import { NutrientRows } from '../components/NutrientRows'
import { Bar, Card, CardHead, Disclosure, Field, Modal, NumberInput, PageHead, Ring } from '../components/ui'
import { useUi } from '../components/UiContext'
import { MACRO_KEYS, MICRO_KEYS } from '../data/nutrients'
import { SESSION_MAP } from '../data/plan'
import { RECIPE_MAP } from '../data/recipes'
import { dayTotals, entriesForDate } from '../domain/nutrition'
import { programWeek, plannedSessionsForWeek, sessionStatus } from '../domain/training'
import { addDays, formatDateLong, relativeDay } from '../lib/date'
import { stamp } from '../lib/id'
import { ml, num } from '../lib/format'
import { buildCreatineLog } from '../state/actions'
import { href, navigate, type Route } from '../state/router'
import { useStore } from '../state/store'
import { useToast } from '../state/toast'
import type { DayStatus, FoodLogEntry, MealSlot, NutrientKey } from '../types'
import { ProteinShakeDialog } from './Hydration'

export default function DailyLog({ route }: { route: Route }) {
  const today = useToday()
  const date = route.query.get('datum') ?? today
  const store = useStore()
  const { data, settings } = store
  const { openFood, openDrink } = useUi()
  const { toast } = useToast()
  const [editing, setEditing] = useState<FoodLogEntry>()
  const [shake, setShake] = useState(false)
  const totals = useMemo(() => dayTotals(data, date), [data, date])
  const { foods, drinks, supplements } = useMemo(() => entriesForDate(data, date), [data, date])
  const status = data.days.find((d) => d.date === date)
  const complete = !!status?.complete
  const t = settings.targets
  const v = totals.profile.values
  const week = programWeek(settings, date)
  const planned = week >= 1 ? plannedSessionsForWeek(settings, data.schedule, week).filter((p) => p.date === date) : []
  const workouts = data.workouts.filter((w) => w.date === date)
  const plannedMeals = data.mealPlan.filter((m) => m.date === date && !data.foodLogs.some((f) => f.planId === m.id))

  const setDate = (d: string) => navigate(d === today ? '/protokoll' : `/protokoll?datum=${d}`)

  async function toggleComplete() {
    const record: DayStatus = status ? { ...status, complete: !complete, updatedAt: new Date().toISOString() } : stamp<DayStatus>({ id: date, date, complete: true } as DayStatus)
    await store.save('days', record)
    toast(record.complete ? 'Tag als vollständig markiert' : 'Markierung entfernt')
  }

  const open: string[] = []
  if ((v.kcal ?? 0) < t.kcal) open.push(`${num(t.kcal - (v.kcal ?? 0))} kcal`)
  if ((v.protein ?? 0) < t.protein) open.push(`${num(t.protein - (v.protein ?? 0))} g Protein`)
  if ((v.fiber ?? 0) < t.fiber) open.push(`${num(t.fiber - (v.fiber ?? 0))} g Ballaststoffe`)
  if (totals.fluidMl < t.fluidMl) open.push(`${ml(t.fluidMl - totals.fluidMl)} trinken`)

  return (
    <div className="page">
      <PageHead
        eyebrow={relativeDay(date, today)}
        title="Tagesprotokoll"
        lead={formatDateLong(date)}
        actions={
          <div className="date-nav">
            <button type="button" className="btn btn-icon" onClick={() => setDate(addDays(date, -1))} aria-label="Vorheriger Tag">
              <ChevronLeft size={18} />
            </button>
            <input className="input" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Datum wählen" />
            <button type="button" className="btn btn-icon" onClick={() => setDate(addDays(date, 1))} aria-label="Nächster Tag">
              <ChevronRight size={18} />
            </button>
            {date !== today && (
              <button type="button" className="btn" onClick={() => setDate(today)}>
                Heute
              </button>
            )}
          </div>
        }
      />

      <div className="log-grid">
        <div className="stack-lg">
          {/* Mahlzeiten */}
          <Card index={0}>
            <CardHead
              eyebrow="Essen"
              title={`${foods.length} ${foods.length === 1 ? 'Eintrag' : 'Einträge'}`}
              action={
                <button type="button" className="btn btn-primary btn-sm" onClick={() => openFood({ date })}>
                  <Plus size={15} /> Essen
                </button>
              }
            />
            {plannedMeals.length > 0 && (
              <div className="notice" style={{ marginBottom: 12 }}>
                <UtensilsCrossed size={17} />
                <div className="grow stack-sm">
                  <span>Laut Wochenplan geplant:</span>
                  {plannedMeals.map((m) => (
                    <div key={m.id} className="row-between">
                      <span className="strong">
                        {MEAL_LABEL[m.slot]}: {RECIPE_MAP[m.recipeId]?.name}
                        {m.leftoverOf ? ' (Rest)' : ''}
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() =>
                          m.leftoverOf && data.pantry.some((p) => p.kind === 'leftover' && p.recipeId === m.recipeId)
                            ? openFood({ date, tab: 'rest', meal: m.slot })
                            : openFood({ date, recipeId: m.recipeId, planId: m.id, meal: m.slot })
                        }
                      >
                        Als gegessen eintragen
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {foods.length === 0 ? (
              <div className="muted small">Noch nichts eingetragen. Fehlende Einträge zählen nicht als „nichts gegessen“.</div>
            ) : (
              MEAL_ORDER.filter((slot) => foods.some((f) => f.meal === slot)).map((slot) => {
                const list = foods.filter((f) => f.meal === slot).sort((a, b) => a.time.localeCompare(b.time))
                const sum = list.reduce((s, f) => s + (f.nutrients.kcal ?? 0), 0)
                return (
                  <div key={slot}>
                    <div className="meal-head">
                      <span className="eyebrow">{MEAL_LABEL[slot]}</span>
                      <span className="muted tiny num">{num(sum)} kcal</span>
                    </div>
                    {list.map((f) => (
                      <div className="entry" key={f.id}>
                        <span className="entry-time">{f.time}</span>
                        <div className="entry-main">
                          <div className="entry-name">{f.name}</div>
                          <div className="entry-meta">
                            {num(f.nutrients.kcal ?? 0)} kcal · {num(f.nutrients.protein ?? 0)} g Protein
                            {f.source.kind === 'free' && ' · freier Eintrag'}
                            {f.note && ` · ${f.note}`}
                          </div>
                        </div>
                        <div className="entry-actions">
                          <button type="button" className="btn btn-ghost btn-icon sm" onClick={() => setEditing(f)} aria-label="Bearbeiten">
                            <Pencil size={15} />
                          </button>
                          <ConfirmButton onConfirm={() => store.remove('foodLogs', f.id).then(() => toast('Eintrag gelöscht'))} />
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })
            )}
          </Card>

          {/* Getränke */}
          <Card index={1}>
            <CardHead
              eyebrow="Getränke"
              title={ml(totals.fluidMl)}
              action={
                <button type="button" className="btn btn-sm" onClick={() => openDrink(date)}>
                  <GlassWater size={15} /> Getränk
                </button>
              }
            />
            {drinks.length === 0 ? (
              <div className="muted small">Noch keine Getränke.</div>
            ) : (
              [...drinks]
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((d) => (
                  <div className="entry" key={d.id}>
                    <span className="entry-time">{d.time}</span>
                    <div className="entry-main">
                      <div className="entry-name">{d.name}</div>
                      <div className="entry-meta">
                        {num(d.ml)} ml{(d.nutrients.kcal ?? 0) > 0 ? ` · ${num(d.nutrients.kcal ?? 0)} kcal` : ''}
                      </div>
                    </div>
                    <div className="entry-actions">
                      <ConfirmButton onConfirm={() => store.remove('drinkLogs', d.id)} />
                    </div>
                  </div>
                ))
            )}
          </Card>

          {/* Supplements */}
          <Card index={2}>
            <CardHead eyebrow="Supplements" title="Kreatin & Proteinpulver" action={<Pill size={18} color="var(--ink-3)" />} />
            <div className="row-wrap" style={{ marginBottom: supplements.length ? 10 : 0 }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={async () => {
                  await store.save('supplementLogs', buildCreatineLog(settings.supplements.creatineDoseG, date))
                  toast(`Kreatin ${settings.supplements.creatineDoseG} g eingetragen`)
                }}
              >
                Kreatin {settings.supplements.creatineDoseG} g eintragen
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setShake(true)}>
                Proteinshake eintragen
              </button>
            </div>
            {supplements.map((s) => (
              <div className="entry" key={s.id}>
                <span className="entry-time">{s.time}</span>
                <div className="entry-main">
                  <div className="entry-name">{s.kind === 'creatine' ? 'Kreatin-Monohydrat' : 'Proteinshake'}</div>
                  <div className="entry-meta">
                    {num(s.grams)} g{s.kind === 'protein' ? ` · ${num(s.nutrients.protein ?? 0)} g Protein · ${num(s.liquidMl ?? 0)} ml ${s.liquid === 'milch' ? 'Milch' : 'Wasser'}` : ' · kein Protein'}
                  </div>
                </div>
                <div className="entry-actions">
                  <ConfirmButton onConfirm={() => store.remove('supplementLogs', s.id)} />
                </div>
              </div>
            ))}
            {supplements.length === 0 && <div className="muted small">Nur eintragen, was du tatsächlich genommen hast. Beide laufen getrennt vom Lebensmittelbudget.</div>}
          </Card>

          {/* Training */}
          <Card index={3}>
            <CardHead
              eyebrow="Training"
              title={workouts.length ? `${workouts.length} Einheit(en) erfasst` : planned.length ? 'Geplant' : 'Kein Training geplant'}
              action={
                <a className="btn btn-sm" href={href(`/training/frei?datum=${date}`)}>
                  <Dumbbell size={15} /> Freies Training
                </a>
              }
            />
            <div className="stack-sm">
              {planned.map((p) => {
                const st = sessionStatus(p, data.workouts, today)
                return (
                  <div key={p.key} className="row-between">
                    <div>
                      <div className="strong">{SESSION_MAP[p.sessionId].title}</div>
                      <div className="muted small">Kalendereinheit Woche {p.week}</div>
                    </div>
                    {st === 'done' ? (
                      <a className="badge badge-neon" href={href(`/training/${p.key}`)}>
                        <CircleCheck size={13} /> erledigt
                      </a>
                    ) : (
                      <a className="btn btn-sm btn-primary" href={href(`/training/${p.key}`)}>
                        Protokollieren
                      </a>
                    )}
                  </div>
                )
              })}
              {workouts
                .filter((w) => !planned.some((p) => p.key === w.plannedKey))
                .map((w) => (
                  <div key={w.id} className="row-between">
                    <div>
                      <div className="strong">{w.title}</div>
                      <div className="muted small">
                        {w.exercises.length} Übungen{w.durationMin ? ` · ${w.durationMin} min` : ''}
                      </div>
                    </div>
                    <a className="btn btn-sm" href={href(`/training/log-${w.id}`)}>
                      Ansehen
                    </a>
                  </div>
                ))}
            </div>
          </Card>
        </div>

        <aside className="log-side">
          <Card marble index={1}>
            <div className="row" style={{ gap: 18, alignItems: 'center' }}>
              <Ring value={v.kcal ?? 0} max={t.kcal} size={112} stroke={10}>
                <div>
                  <div className="stat-value" style={{ fontSize: 24 }}>
                    {num(v.kcal ?? 0)}
                  </div>
                  <div className="muted tiny">von {num(t.kcal)} kcal</div>
                </div>
              </Ring>
              <div className="grow stack-sm">
                <MiniMacro label="Protein" value={v.protein} target={t.protein} />
                <MiniMacro label="Kohlenhydrate" value={v.carbs} target={t.carbs} />
                <MiniMacro label="Fett" value={v.fat} target={t.fat} />
                <MiniMacro label="Ballaststoffe" value={v.fiber} target={t.fiber} partial={totals.profile.partial.includes('fiber')} />
                <MiniMacro label="Trinken" value={totals.fluidMl / 1000} target={t.fluidMl / 1000} unit="l" decimals={1} />
              </div>
            </div>
            <hr className="silver-rule" style={{ margin: '16px 0 12px' }} />
            <div className="small">
              {totals.entryCount === 0 ? (
                <span className="muted">Für diesen Tag gibt es noch keine Einträge.</span>
              ) : open.length ? (
                <>
                  <span className="muted">Noch offen: </span>
                  {open.join(' · ')}
                </>
              ) : (
                <span className="ok-text strong">Alle Tagesziele erreicht.</span>
              )}
            </div>
            <div className="small" style={{ marginTop: 6 }}>
              <span className="muted">Training: </span>
              {workouts.length ? `${workouts.length} erfasst` : planned.length ? 'geplant, noch nicht erfasst' : 'Ruhetag'}
            </div>
          </Card>

          <div className={`complete-toggle ${complete ? 'on' : ''}`}>
            <div>
              <div className="strong small">{complete ? 'Tag vollständig erfasst' : 'Tag unvollständig'}</div>
              <div className="muted tiny">Nur vollständige Tage zählen voll in die Wochenauswertung.</div>
            </div>
            <button type="button" className={`btn btn-sm ${complete ? '' : 'btn-dark'}`} onClick={toggleComplete}>
              {complete ? 'Zurücksetzen' : 'Als vollständig markieren'}
            </button>
          </div>

          <Card index={2}>
            <Disclosure title="Makronährstoffe im Detail" defaultOpen>
              <NutrientRows keys={MACRO_KEYS} values={(k: NutrientKey) => ({ value: v[k], partial: totals.profile.partial.includes(k) })} />
            </Disclosure>
            <Disclosure title="Vitamine & Mineralstoffe (geschätzt)">
              <div className="muted tiny" style={{ marginBottom: 8 }}>
                „≥“ heißt: Für mindestens einen Eintrag fehlen Daten, der echte Wert liegt eher höher. Einzelne Tage unter dem Referenzwert sind normal.
              </div>
              <NutrientRows compact keys={MICRO_KEYS} values={(k: NutrientKey) => ({ value: v[k], partial: totals.profile.partial.includes(k) })} />
            </Disclosure>
          </Card>
        </aside>
      </div>

      {editing && <EditEntryDialog entry={editing} onClose={() => setEditing(undefined)} />}
      {shake && <ProteinShakeDialog date={date} onClose={() => setShake(false)} />}
    </div>
  )
}

function MiniMacro({ label, value, target, unit = 'g', decimals = 0, partial }: { label: string; value?: number; target: number; unit?: string; decimals?: number; partial?: boolean }) {
  return (
    <div>
      <div className="row-between tiny">
        <span className="strong">{label}</span>
        <span className="muted num">
          {partial ? '≥ ' : ''}
          {num(value ?? 0, decimals)} / {num(target, decimals)} {unit}
        </span>
      </div>
      <Bar value={value ?? 0} max={target} size="thin" partial={partial} label={label} />
    </div>
  )
}

function EditEntryDialog({ entry, onClose }: { entry: FoodLogEntry; onClose: () => void }) {
  const store = useStore()
  const { toast } = useToast()
  const [time, setTime] = useState(entry.time)
  const [meal, setMeal] = useState<MealSlot>(entry.meal)
  const [name, setName] = useState(entry.name)
  const [factor, setFactor] = useState<number | undefined>(1)
  const [kcal, setKcal] = useState<number | undefined>(entry.nutrients.kcal)
  const [protein, setProtein] = useState<number | undefined>(entry.nutrients.protein)
  const isFree = entry.source.kind === 'free'

  async function save() {
    const f = factor ?? 1
    const nutrients = { ...entry.nutrients }
    if (isFree) {
      if (kcal !== undefined) nutrients.kcal = kcal
      if (protein !== undefined) nutrients.protein = protein
    } else if (f !== 1) {
      for (const k of Object.keys(nutrients) as NutrientKey[]) nutrients[k] = (nutrients[k] ?? 0) * f
    }
    await store.save('foodLogs', { ...entry, time, meal, name, nutrients, updatedAt: new Date().toISOString() })
    toast('Eintrag aktualisiert')
    onClose()
  }

  return (
    <Modal
      title="Eintrag bearbeiten"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" onClick={save}>
            Speichern
          </button>
        </>
      }
    >
      <div className="stack">
        <Field label="Bezeichnung">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="form-grid">
          <Field label="Uhrzeit">
            <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <Field label="Mahlzeit">
            <select className="select" value={meal} onChange={(e) => setMeal(e.target.value as MealSlot)}>
              {MEAL_ORDER.map((m) => (
                <option key={m} value={m}>
                  {MEAL_LABEL[m]}
                </option>
              ))}
            </select>
          </Field>
          {isFree ? (
            <>
              <Field label="Kalorien">
                <NumberInput value={kcal} onChange={setKcal} suffix="kcal" />
              </Field>
              <Field label="Protein">
                <NumberInput value={protein} onChange={setProtein} suffix="g" />
              </Field>
            </>
          ) : (
            <Field label="Menge anpassen" hint="1 = wie eingetragen, 0,5 = halbe Menge">
              <NumberInput value={factor} onChange={setFactor} step={0.25} min={0.25} suffix="×" />
            </Field>
          )}
        </div>
      </div>
    </Modal>
  )
}
