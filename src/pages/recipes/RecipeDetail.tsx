import { ArrowLeft, CalendarPlus, Check, Clock, Package, PiggyBank, Plus, Sparkles, Star, Users } from 'lucide-react'
import { useState } from 'react'
import { useToday } from '../../components/hooks'
import { MEAL_LABEL } from '../../components/labels'
import { NutrientRows } from '../../components/NutrientRows'
import { Card, CardHead, Disclosure, Field, Modal, Notice, PageHead, Seg } from '../../components/ui'
import { useUi } from '../../components/UiContext'
import { MACRO_KEYS, MICRO_KEYS, NUTRIENT_META } from '../../data/nutrients'
import { RECIPE_CATEGORY_LABEL, RECIPE_MAP } from '../../data/recipes'
import { recipeProfile } from '../../domain/nutrition'
import { defaultOptionalIncluded, foodStatus } from '../../domain/preferences'
import { cheapAlternatives, formatAmount, isAlwaysAvailable, keySources, pantryUse, recipeCost } from '../../domain/recipes'
import { addDays } from '../../lib/date'
import { stamp } from '../../lib/id'
import { euro, num } from '../../lib/format'
import { buildLeftoverItem, buildRecipeLog, findDuplicate } from '../../state/actions'
import { href } from '../../state/router'
import { useStore } from '../../state/store'
import { useToast } from '../../state/toast'
import type { MealPlanEntry, MealSlot, Recipe } from '../../types'

export function RecipeDetail({ recipe }: { recipe: Recipe }) {
  const store = useStore()
  const { data, settings } = store
  const { toast } = useToast()
  const { openFood } = useUi()
  const today = useToday()
  const [portions, setPortions] = useState<'1' | '2'>('1')
  const [optional, setOptional] = useState<string[]>(() => defaultOptionalIncluded(recipe, settings))
  const [planOpen, setPlanOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const n = Number(portions)
  const calc = recipeProfile(recipe, settings, n, optional)
  const perPortion = recipeProfile(recipe, settings, 1, optional)
  const cost = recipeCost(recipe, settings, 1, optional)
  const sources = keySources(perPortion, settings)
  const pantry = pantryUse(recipe, settings, data.pantry, optional)
  const tips = cheapAlternatives(recipe, settings)
  const fav = settings.favorites.includes(recipe.id)
  const v = calc.profile.values

  async function quickLog() {
    const entry = buildRecipeLog(recipe.id, settings, { date: today, portions: 1, optionalIncluded: optional })
    const dup = findDuplicate(data.foodLogs, entry)
    if (dup) {
      toast(`Schon eingetragen um ${dup.time}. Für einen zweiten Eintrag „Mit Details“ nutzen.`, 'error')
      return
    }
    await store.save('foodLogs', entry)
    setSaved(true)
    toast(`${recipe.name} für heute eingetragen`)
  }

  async function saveLeftover() {
    await store.save('pantry', buildLeftoverItem(recipe.id, settings, 1, optional))
    toast('1 Portion als Rest im Vorrat gespeichert')
  }

  return (
    <div className="page">
      <a href={href('/rezepte')} className="btn btn-ghost btn-sm" style={{ marginBottom: 10 }}>
        <ArrowLeft size={15} /> Alle Rezepte
      </a>
      <PageHead
        eyebrow={`${RECIPE_CATEGORY_LABEL[recipe.category]} · ${recipe.id.toUpperCase()}`}
        title={recipe.name}
        lead={
          <span className="row-wrap" style={{ gap: 16 }}>
            <span className="row" style={{ gap: 6 }}>
              <Clock size={15} /> {recipe.minutes} Minuten
            </span>
            <span className="row" style={{ gap: 6 }}>
              <Users size={15} /> {recipe.servings} Portion (skalierbar)
            </span>
            <span className="row" style={{ gap: 6 }}>
              <PiggyBank size={15} /> ca. {euro(cost.shopping)} pro Portion
            </span>
          </span>
        }
        actions={
          <>
            <button
              type="button"
              className="btn btn-icon"
              aria-pressed={fav}
              aria-label="Favorit"
              onClick={() => store.updateSettings((s) => ({ ...s, favorites: fav ? s.favorites.filter((x) => x !== recipe.id) : [...s.favorites, recipe.id] }))}
            >
              <Star size={17} fill={fav ? '#17d861' : 'none'} color={fav ? '#17d861' : 'currentColor'} />
            </button>
            <button type="button" className="btn" onClick={() => setPlanOpen(true)}>
              <CalendarPlus size={16} /> Zum Wochenplan
            </button>
            <button type="button" className="btn" onClick={() => openFood({ recipeId: recipe.id })}>
              Mit Details eintragen
            </button>
            <button type="button" className={`btn btn-primary ${saved ? 'saved' : ''}`} onClick={quickLog}>
              {saved ? <Check size={16} /> : <Plus size={16} />} Heute gegessen
            </button>
          </>
        }
      />

      <div className="recipe-detail">
        <div className="stack-lg">
          <Card index={0}>
            <CardHead
              eyebrow="Zutaten"
              title={`Für ${n} ${n === 1 ? 'Portion' : 'Portionen'}`}
              action={<Seg value={portions} onChange={setPortions} options={[{ value: '1', label: '1 Portion' }, { value: '2', label: '2 Portionen' }]} />}
            />
            {calc.lines.map((l) => {
              const st = foodStatus(l.food, settings)
              const always = isAlwaysAvailable(l.food, settings)
              const on = !l.optional || optional.includes(l.foodId)
              if (l.optional && !st.allowed) return null
              return (
                <div key={l.foodId} className={`ing-row ${on ? '' : 'off'}`}>
                  {l.optional ? (
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => setOptional(on ? optional.filter((x) => x !== l.foodId) : [...optional, l.foodId])}
                      aria-label={`${l.food.name} verwenden`}
                      style={{ accentColor: 'var(--neon-strong)', width: 17, height: 17 }}
                    />
                  ) : (
                    <span className="dot neon" />
                  )}
                  <span>
                    {l.food.name}
                    {l.optional && <span className="muted small"> · optional</span>}
                    {always && <span className="badge" style={{ marginLeft: 8 }}>{l.food.staple ? 'Brot & Belag' : 'Grundvorrat'}</span>}
                  </span>
                  <span className="ing-amount">{formatAmount(l.food, l.amount)}</span>
                </div>
              )
            })}
            {recipe.ingredients.some((i) => i.optional) && (
              <div className="muted tiny" style={{ marginTop: 10 }}>
                Optionales Gemüse rechnet die App erst fest ein, wenn du es unter „Lebensmittel & Ausschlüsse“ freigibst. Hier kannst du es für dieses Rezept an- und abwählen.
              </div>
            )}
          </Card>

          <Card index={1}>
            <CardHead eyebrow="Zubereitung" title="Schritt für Schritt" />
            <ol className="steps">
              {recipe.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </Card>

          <Card index={2}>
            <CardHead eyebrow="Sparen & Reste" title="Günstige Alternativen" action={<PiggyBank size={18} color="var(--ink-3)" />} />
            {tips.length ? (
              <ul className="bullets">
                {tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            ) : (
              <div className="muted small">Schon sehr günstig, kein Spartipp nötig.</div>
            )}
            {recipe.keeps && (
              <div className="row-wrap" style={{ marginTop: 14 }}>
                <button type="button" className="btn btn-sm" onClick={saveLeftover}>
                  <Package size={15} /> Übrige Portion als Rest speichern
                </button>
                <span className="muted tiny">Der Rest erscheint im Vorrat und lässt sich morgen mit einem Klick eintragen.</span>
              </div>
            )}
          </Card>
        </div>

        <div className="stack-lg">
          <Card marble index={1}>
            <CardHead eyebrow={`Nährwerte · ${n === 1 ? 'pro Portion' : `${n} Portionen`}`} title={`${num(v.kcal ?? 0)} kcal`} />
            <div className="grid grid-4" style={{ gap: 10, marginBottom: 14 }}>
              {(['protein', 'carbs', 'fat', 'fiber'] as const).map((k) => (
                <div key={k} className="kpi">
                  <span className="eyebrow">{NUTRIENT_META[k].short ?? NUTRIENT_META[k].label}</span>
                  <span className="stat-value" style={{ fontSize: 22 }}>
                    {num(v[k] ?? 0)}
                    <span className="stat-unit">g</span>
                  </span>
                </div>
              ))}
            </div>
            <Disclosure title="Alle Makros">
              <NutrientRows keys={MACRO_KEYS} values={(k) => ({ value: v[k], partial: calc.profile.partial.includes(k) })} />
            </Disclosure>
            <Disclosure title="Vitamine & Mineralstoffe">
              <NutrientRows compact keys={MICRO_KEYS} values={(k) => ({ value: v[k], partial: calc.profile.partial.includes(k) })} />
            </Disclosure>
            <div className="muted tiny" style={{ marginTop: 10 }}>
              Aus den Zutatenmengen berechnete Schätzwerte (Tabellen-Durchschnittswerte, keine konkreten Produktangaben). „≥“: Für eine Zutat fehlen Daten.
            </div>
          </Card>

          {sources.length > 0 && (
            <Card index={2}>
              <CardHead eyebrow="Wichtige Nährstoffquellen" title="Das liefert eine Portion" action={<Sparkles size={18} color="var(--neon-ink)" />} />
              <div className="list">
                {sources.map((s) => (
                  <div key={s.key} className="list-item">
                    <div className="grow">
                      <div className="title">{NUTRIENT_META[s.key].label}</div>
                      <div className="meta">vor allem aus {s.mainFood}</div>
                    </div>
                    <span className="badge badge-neon">{Math.round(s.share * 100)} %</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card index={3}>
            <CardHead eyebrow="Kosten" title={`${euro(cost.shopping)} pro Portion`} />
            <div className="stack-sm small">
              <div className="row-between">
                <span className="muted">Einkauf (ohne Brot, Belag, Grundvorrat)</span>
                <span className="num">{euro(cost.shopping)}</span>
              </div>
              <div className="row-between">
                <span className="muted">Inklusive Vorrat</span>
                <span className="num">{euro(cost.total)}</span>
              </div>
              <div className="muted tiny">Verbrauchskosten aus geschätzten Packungspreisen, die du in den Einstellungen anpassen kannst. Keine aktuellen Marktpreise.</div>
            </div>
          </Card>

          <Card index={4}>
            <CardHead eyebrow="Verwendete Vorräte" title={pantry.length ? `${pantry.length} Zutaten vorhanden` : 'Nichts aus dem Vorrat'} />
            {pantry.length === 0 ? (
              <div className="muted small">Alle Zutaten müssen eingekauft werden.</div>
            ) : (
              <div className="row-wrap">
                {pantry.map((p) => (
                  <span key={p.food.id} className={`badge ${p.covered ? 'badge-neon' : 'badge-warn'}`}>
                    {p.food.name}
                    {!p.always && ` · ${num(p.inPantry)} ${p.food.unit} da`}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {planOpen && <AddToPlanDialog recipe={recipe} optional={optional} onClose={() => setPlanOpen(false)} />}
    </div>
  )
}

function AddToPlanDialog({ recipe, optional, onClose }: { recipe: Recipe; optional: string[]; onClose: () => void }) {
  const store = useStore()
  const { toast } = useToast()
  const today = useToday()
  const [date, setDate] = useState(addDays(today, 1))
  const [slot, setSlot] = useState<MealSlot>(recipe.meals.includes('mittag') ? 'mittag' : recipe.meals[0])
  const [portions, setPortions] = useState<'1' | '2'>('1')
  const existing = store.data.mealPlan.find((m) => m.date === date && m.slot === slot)

  async function save() {
    const entry = stamp<MealPlanEntry>({ date, slot, recipeId: recipe.id, portions: Number(portions), optionalIncluded: optional } as MealPlanEntry)
    const list: MealPlanEntry[] = [entry]
    if (portions === '2') {
      list.push(stamp<MealPlanEntry>({ date: addDays(date, 1), slot, recipeId: recipe.id, portions: 1, leftoverOf: entry.id } as MealPlanEntry))
    }
    if (existing) await store.remove('mealPlan', existing.id)
    await store.save('mealPlan', list)
    toast(portions === '2' ? 'Eingeplant, Rest für den nächsten Tag vorgemerkt' : 'In den Wochenplan übernommen')
    onClose()
  }

  return (
    <Modal
      title="Zum Wochenplan"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" onClick={save}>
            Einplanen
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="form-grid">
          <Field label="Tag">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Mahlzeit">
            <select className="select" value={slot} onChange={(e) => setSlot(e.target.value as MealSlot)}>
              {(['mittag', 'abend', 'snack', 'spaet', 'fruehstueck'] as MealSlot[]).map((m) => (
                <option key={m} value={m}>
                  {MEAL_LABEL[m]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Seg value={portions} onChange={setPortions} options={[{ value: '1', label: '1 Portion' }, { value: '2', label: '2 Portionen (Rest für morgen)' }]} />
        {existing && <Notice kind="warn">An diesem Tag ist schon „{RECIPE_MAP[existing.recipeId]?.name ?? existing.recipeId}“ geplant und wird ersetzt.</Notice>}
        <div className="muted small">Die Einkaufsliste passt sich automatisch an.</div>
      </div>
    </Modal>
  )
}
