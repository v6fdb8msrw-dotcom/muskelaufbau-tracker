import { Check, ChevronLeft, ChevronRight, Copy, RefreshCw, Repeat, Trash2, Wand2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { usePlanNeeds, useToday } from '../../components/hooks'
import { MEAL_LABEL } from '../../components/labels'
import { RecipePicker } from '../../components/RecipePicker'
import { Card, CardHead } from '../../components/ui'
import { RECIPE_MAP } from '../../data/recipes'
import { generateLunchPlan } from '../../domain/mealplan'
import { recipeProfile } from '../../domain/nutrition'
import { formatAmount } from '../../domain/recipes'
import { planForWeek } from '../../domain/shopping'
import { addDays, formatDate, startOfWeek, WEEKDAY_LONG, weekDates } from '../../lib/date'
import { stamp } from '../../lib/id'
import { euro, num } from '../../lib/format'
import { readLocal, writeLocal } from '../../storage/localPrefs'
import { href, navigate, type Route } from '../../state/router'
import { useStore } from '../../state/store'
import { useToast } from '../../state/toast'
import type { MealPlanEntry, MealSlot } from '../../types'

/** Einkauf: Mittagessen der Woche planen und sehen, was du dafür wie viel kaufen musst. */
export function MealPlanView({ route }: { route: Route }) {
  const store = useStore()
  const { data, settings } = store
  const { toast } = useToast()
  const today = useToday()
  const weekStart = route.query.get('woche') ?? startOfWeek(today)
  const [seed, setSeed] = useState(1)
  const [picker, setPicker] = useState<{ date: string; slot: MealSlot; replace?: MealPlanEntry } | null>(null)
  const week = useMemo(() => planForWeek(data.mealPlan, weekStart), [data.mealPlan, weekStart])
  const needs = usePlanNeeds(weekStart)
  const dates = weekDates(weekStart)
  const goWeek = (d: string) => navigate(`/rezepte?tab=einkauf&woche=${d}`)
  // Abgehakte Zutaten nur auf diesem Gerät merken (je Woche)
  const checkKey = `ms.zettel.${weekStart}`
  const [checked, setChecked] = useState<string[]>(() => readLocal<string[]>(checkKey, []))
  const [checkedFor, setCheckedFor] = useState(checkKey)
  if (checkedFor !== checkKey) {
    setCheckedFor(checkKey)
    setChecked(readLocal<string[]>(checkKey, []))
  }
  const toggle = (foodId: string) => {
    const next = checked.includes(foodId) ? checked.filter((x) => x !== foodId) : [...checked, foodId]
    setChecked(next)
    writeLocal(checkKey, next)
  }
  const toBuy = needs.lines.filter((l) => l.toBuy > 0)
  const openCount = toBuy.filter((l) => !checked.includes(l.foodId)).length
  const loggedPlanIds = new Set(data.foodLogs.map((f) => f.planId).filter(Boolean))

  async function generate(nextSeed = seed) {
    const keep = week.filter((m) => m.slot !== 'mittag' || loggedPlanIds.has(m.id) || m.date < today)
    const remove = week.filter((m) => !keep.includes(m))
    const skipDates = keep.filter((m) => m.slot === 'mittag').map((m) => m.date).concat(dates.filter((d) => d < today))
    const draft = generateLunchPlan({
      weekStart,
      settings,
      pantry: data.pantry,
      recentLogs: data.foodLogs.filter((l) => l.date >= addDays(today, -7)),
      mode: 'mealprep',
      seed: nextSeed + weekStart.split('-').reduce((s, x) => s + Number(x), 0),
      skipDates,
    })
    const entries: MealPlanEntry[] = []
    for (const d of draft) {
      const e = stamp<MealPlanEntry>({
        date: d.date,
        slot: 'mittag',
        recipeId: d.recipeId,
        portions: d.portions,
        leftoverOf: d.leftoverOfIndex !== undefined ? entries[d.leftoverOfIndex]?.id : undefined,
      } as MealPlanEntry)
      entries.push(e)
    }
    if (remove.length) await store.remove('mealPlan', remove.map((m) => m.id))
    if (entries.length) await store.save('mealPlan', entries)
    toast(entries.length ? 'Wochenplan erstellt, Einkaufszettel angepasst' : 'Keine freien Tage mehr in dieser Woche')
  }

  async function removeEntry(m: MealPlanEntry) {
    const linked = data.mealPlan.filter((x) => x.leftoverOf === m.id)
    await store.remove('mealPlan', [m.id, ...linked.map((l) => l.id)])
  }

  async function pick(recipeId: string) {
    if (!picker) return
    if (picker.replace) {
      const linked = data.mealPlan.filter((x) => x.leftoverOf === picker.replace!.id)
      await store.save('mealPlan', [
        { ...picker.replace, recipeId, optionalIncluded: undefined, updatedAt: new Date().toISOString() },
        ...linked.map((l) => ({ ...l, recipeId, updatedAt: new Date().toISOString() })),
      ])
      toast('Getauscht, Einkaufszettel angepasst')
    } else {
      await store.save('mealPlan', stamp<MealPlanEntry>({ date: picker.date, slot: picker.slot, recipeId, portions: 1 } as MealPlanEntry))
      toast('Eingeplant')
    }
    setPicker(null)
  }

  async function cookDouble(m: MealPlanEntry) {
    const next = addDays(m.date, 1)
    const occupied = data.mealPlan.find((x) => x.date === next && x.slot === m.slot)
    if (occupied) await store.remove('mealPlan', occupied.id)
    await store.save('mealPlan', [
      { ...m, portions: 2, updatedAt: new Date().toISOString() },
      stamp<MealPlanEntry>({ date: next, slot: m.slot, recipeId: m.recipeId, portions: 1, leftoverOf: m.id } as MealPlanEntry),
    ])
    toast('Doppelte Portion: Rest für den nächsten Tag eingeplant')
  }

  const others = week.filter((m) => m.slot !== 'mittag' || dates.indexOf(m.date) > 4)

  return (
    <div className="stack-lg">
      <div className="row-between" style={{ flexWrap: 'wrap' }}>
        <div className="date-nav">
          <button type="button" className="btn btn-icon" onClick={() => goWeek(addDays(weekStart, -7))} aria-label="Vorherige Woche">
            <ChevronLeft size={18} />
          </button>
          <span className="strong">
            {formatDate(weekStart)} – {formatDate(addDays(weekStart, 6))}
          </span>
          <button type="button" className="btn btn-icon" onClick={() => goWeek(addDays(weekStart, 7))} aria-label="Nächste Woche">
            <ChevronRight size={18} />
          </button>
          {weekStart !== startOfWeek(today) && (
            <button type="button" className="btn btn-sm" onClick={() => goWeek(startOfWeek(today))}>
              Diese Woche
            </button>
          )}
        </div>
        <div className="row-wrap">
          <button type="button" className="btn btn-primary" onClick={() => generate()}>
            <Wand2 size={16} /> Mittagessen planen
          </button>
          {week.some((m) => m.slot === 'mittag') && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                const s = seed + 1
                setSeed(s)
                void generate(s)
              }}
            >
              <RefreshCw size={16} /> Neu mischen
            </button>
          )}
        </div>
      </div>

      <div className="plan-week">
        {dates.slice(0, 5).map((d, i) => {
          const entry = week.find((m) => m.date === d && m.slot === 'mittag')
          const recipe = entry ? RECIPE_MAP[entry.recipeId] : undefined
          const p = recipe ? recipeProfile(recipe, settings, 1, entry?.optionalIncluded).profile.values : undefined
          const logged = entry && loggedPlanIds.has(entry.id)
          return (
            <Card key={d} index={i + 1} className="plan-day">
              <div className="row-between">
                <div>
                  <div className="eyebrow">{WEEKDAY_LONG[i]}</div>
                  <div className="muted tiny">{formatDate(d)} · Mittag</div>
                </div>
                {d === today && <span className="badge badge-dark">Heute</span>}
              </div>
              {recipe && entry ? (
                <>
                  <a href={href(`/rezepte/${recipe.id}`)} className="strong" style={{ textDecoration: 'none', lineHeight: 1.3 }}>
                    {recipe.name}
                  </a>
                  <div className="muted tiny">
                    {num(p?.kcal ?? 0)} kcal · {num(p?.protein ?? 0)} g Protein
                  </div>
                  <div className="row-wrap">
                    {entry.leftoverOf && <span className="badge">Rest vom Vortag</span>}
                    {entry.portions === 2 && <span className="badge badge-neon">2 Portionen kochen</span>}
                    {logged && <span className="badge badge-neon">gegessen</span>}
                  </div>
                  <div className="row" style={{ marginTop: 'auto', gap: 4 }}>
                    {!entry.leftoverOf && (
                      <button type="button" className="btn btn-ghost btn-icon sm" title="Tauschen" aria-label="Tauschen" onClick={() => setPicker({ date: d, slot: 'mittag', replace: entry })}>
                        <Repeat size={15} />
                      </button>
                    )}
                    {!entry.leftoverOf && entry.portions === 1 && recipe.keeps && i < 4 && (
                      <button type="button" className="btn btn-ghost btn-icon sm" title="Doppelt kochen (Rest für morgen)" aria-label="Doppelt kochen" onClick={() => cookDouble(entry)}>
                        <Copy size={15} />
                      </button>
                    )}
                    <button type="button" className="btn btn-ghost btn-icon sm" title="Entfernen" aria-label="Entfernen" onClick={() => removeEntry(entry)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </>
              ) : i === 0 && settings.budget.mondayLeftovers ? (
                <div className="muted small">
                  Montag: Reste vom Wochenende.
                  <button type="button" className="btn btn-sm btn-ghost" style={{ marginTop: 8 }} onClick={() => setPicker({ date: d, slot: 'mittag' })}>
                    Trotzdem planen
                  </button>
                </div>
              ) : (
                <button type="button" className="btn btn-sm" style={{ marginTop: 'auto' }} onClick={() => setPicker({ date: d, slot: 'mittag' })}>
                  Rezept wählen
                </button>
              )}
            </Card>
          )
        })}
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <Card index={1} className="zettel">
          <CardHead
            eyebrow="Einkaufszettel"
            title={toBuy.length ? (openCount ? `${openCount} von ${toBuy.length} noch kaufen` : 'Alles eingekauft') : 'Noch nichts geplant'}
          />
          {toBuy.length === 0 ? (
            <div className="muted small">Plane oben Rezepte für die Woche. Hier steht dann, was du dafür wie viel kaufen musst. Brot, Belag und Grundvorrat (Öl, Gewürze …) sind nicht dabei.</div>
          ) : (
            <>
              <div className="list">
                {toBuy.map((l) => {
                  const done = checked.includes(l.foodId)
                  return (
                    <button key={l.foodId} type="button" className={`zettel-row ${done ? 'done' : ''}`} onClick={() => toggle(l.foodId)} aria-pressed={done}>
                      <span className="check" aria-hidden>
                        <Check size={14} strokeWidth={3} />
                      </span>
                      <span className="grow">
                        <span className="title">{l.food.name}</span>
                        <span className="meta">
                          {l.packs > 0 && l.packLabel ? `${l.packs} × ${l.packLabel}` : formatAmount(l.food, l.toBuy)} · du brauchst {formatAmount(l.food, l.toBuy)}
                          {l.inPantry > 0 ? ` (${num(l.inPantry)} ${l.food.unit} im Vorrat)` : ''}
                        </span>
                        <span className="meta">{l.recipes.join(', ')}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className="muted tiny" style={{ marginTop: 10 }}>
                Grob geschätzt {euro(needs.estimateTotal)} (Schätzpreise). Abhaken merkt sich nur dieses Gerät.
              </div>
            </>
          )}
        </Card>

        <Card index={7}>
          <CardHead
            eyebrow="Abends & Wochenende"
            title="Weitere geplante Mahlzeiten"
            action={
              <div className="row-wrap">
                <button type="button" className="btn btn-sm" onClick={() => setPicker({ date: today >= weekStart && today <= addDays(weekStart, 6) ? today : weekStart, slot: 'abend' })}>
                  Abendessen
                </button>
                <button type="button" className="btn btn-sm" onClick={() => setPicker({ date: addDays(weekStart, 5), slot: 'mittag' })}>
                  Wochenende
                </button>
              </div>
            }
          />
          {others.length === 0 ? (
            <div className="muted small">Geplant werden standardmäßig nur die Mittagessen unter der Woche. Hier kannst du weitere Mahlzeiten dazunehmen.</div>
          ) : (
            <div className="list">
              {others.map((m) => (
                <div key={m.id} className="list-item">
                  <div className="grow">
                    <div className="title">{RECIPE_MAP[m.recipeId]?.name}</div>
                    <div className="meta">
                      {formatDate(m.date)} · {MEAL_LABEL[m.slot]}
                      {m.portions > 1 ? ` · ${m.portions} Portionen` : ''}
                    </div>
                  </div>
                  <button type="button" className="btn btn-ghost btn-icon sm" aria-label="Entfernen" onClick={() => removeEntry(m)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {picker && <RecipePicker slot={picker.slot === 'mittag' ? 'mittag' : undefined} onClose={() => setPicker(null)} onPick={pick} title={picker.replace ? 'Rezept tauschen' : 'Rezept einplanen'} />}
    </div>
  )
}
