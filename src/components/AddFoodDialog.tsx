import { AlertTriangle, Plus, Search, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { FOOD_MAP, FOODS } from '../data/foods'
import { RECIPE_MAP, RECIPES } from '../data/recipes'
import { SNACKS, type SnackKind } from '../data/snacks'
import { foodProfile, productProfile, recipeProfile } from '../domain/nutrition'
import { checkRecipe, defaultOptionalIncluded, foodStatus } from '../domain/preferences'
import { snackProfile } from '../domain/snacks'
import { nowTime, timeToSlot, todayISO } from '../lib/date'
import { num } from '../lib/format'
import {
  buildFoodLog,
  buildFreeLog,
  buildLeftoverItem,
  buildLeftoverLog,
  buildProductLog,
  buildRecipeLog,
  buildSnackLog,
  findDuplicate,
  pantryAfterCooking,
} from '../state/actions'
import { useStore } from '../state/store'
import { useToast } from '../state/toast'
import type { FoodLogEntry, MealSlot, Nutrients } from '../types'
import { MEAL_LABEL, MEAL_ORDER } from './labels'
import { ProductDialog } from './ProductDialog'
import { Field, Modal, NumberInput, Seg, Switch, Tabs } from './ui'

type Tab = 'rezept' | 'snack' | 'lebensmittel' | 'produkt' | 'frei' | 'rest'

function MacroPreview({ n }: { n: Nutrients }) {
  return (
    <div className="row-wrap" style={{ gap: 16 }}>
      <span>
        <strong className="num">{num(n.kcal ?? 0)}</strong> <span className="muted small">kcal</span>
      </span>
      <span>
        <strong className="num">{num(n.protein ?? 0)}</strong> <span className="muted small">g Protein</span>
      </span>
      <span>
        <strong className="num">{num(n.carbs ?? 0)}</strong> <span className="muted small">g KH</span>
      </span>
      <span>
        <strong className="num">{num(n.fat ?? 0)}</strong> <span className="muted small">g Fett</span>
      </span>
      {n.fiber !== undefined && (
        <span>
          <strong className="num">{num(n.fiber)}</strong> <span className="muted small">g Ballaststoffe</span>
        </span>
      )}
    </div>
  )
}

export function AddFoodDialog({
  onClose,
  date: initialDate,
  initialTab = 'rezept',
  recipeId: initialRecipe,
  planId,
  meal: initialMeal,
}: {
  onClose: () => void
  date?: string
  initialTab?: Tab
  recipeId?: string
  planId?: string
  meal?: MealSlot
}) {
  const store = useStore()
  const { data, settings } = store
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>(initialTab)
  const [date, setDate] = useState(initialDate ?? todayISO())
  const [time, setTime] = useState(nowTime())
  const [meal, setMeal] = useState<MealSlot>(initialMeal ?? timeToSlot(nowTime()))
  const [query, setQuery] = useState('')
  const [duplicate, setDuplicate] = useState<FoodLogEntry>()

  // Rezept
  const [recipeId, setRecipeId] = useState<string | undefined>(initialRecipe)
  const [portions, setPortions] = useState<'1' | '2'>('1')
  const [optional, setOptional] = useState<string[] | undefined>(initialRecipe ? defaultOptionalIncluded(RECIPE_MAP[initialRecipe], settings) : undefined)
  const [deduct, setDeduct] = useState(true)
  const [saveRest, setSaveRest] = useState(false)

  // Snack
  const [snackId, setSnackId] = useState<string>()
  const [snackPortions, setSnackPortions] = useState<'1' | '2'>('1')
  const [snackKind, setSnackKind] = useState<'alle' | SnackKind>('alle')
  const snackList = useMemo(
    () =>
      SNACKS.map((snack) => ({ snack, v: snackProfile(snack).values }))
        .filter((x) => snackKind === 'alle' || x.snack.kind === snackKind || (snackKind !== 'beides' && x.snack.kind === 'beides'))
        .sort((a, b) => (b.v.kcal ?? 0) - (a.v.kcal ?? 0)),
    [snackKind],
  )

  // Lebensmittel / Produkt
  const [foodId, setFoodId] = useState<string>()
  const [productId, setProductId] = useState<string>()
  const [newProduct, setNewProduct] = useState(false)
  const [amount, setAmount] = useState<number | undefined>()

  // Frei
  const [freeName, setFreeName] = useState('')
  const [free, setFree] = useState<{ kcal?: number; protein?: number; carbs?: number; fat?: number; fiber?: number }>({})
  const [note, setNote] = useState('')

  // Rest
  const [restId, setRestId] = useState<string>()
  const [restPortions, setRestPortions] = useState(1)

  const q = query.trim().toLowerCase()
  const recipeList = useMemo(() => {
    return RECIPES.filter((r) => checkRecipe(r, settings).allowed && (!q || r.name.toLowerCase().includes(q)))
      .map((r) => ({ r, fav: settings.favorites.includes(r.id), p: recipeProfile(r, settings).profile.values }))
      .sort((a, b) => Number(b.fav) - Number(a.fav))
      .slice(0, q ? 40 : 30)
  }, [q, settings])

  const foodList = useMemo(
    () => FOODS.filter((f) => !q || f.name.toLowerCase().includes(q)).slice(0, 40),
    [q],
  )
  const products = data.products.filter((p) => p.kind !== 'drink')
  const leftovers = data.pantry.filter((p) => p.kind === 'leftover' && p.amount > 0)

  const selectedRecipe = recipeId ? RECIPE_MAP[recipeId] : undefined
  const optionalIncluded = selectedRecipe ? (optional ?? defaultOptionalIncluded(selectedRecipe, settings)) : []
  const recipeCalc = selectedRecipe ? recipeProfile(selectedRecipe, settings, Number(portions), optionalIncluded) : undefined

  function candidate(): FoodLogEntry | undefined {
    const w = { date, time, meal }
    if (tab === 'rezept' && recipeId) return buildRecipeLog(recipeId, settings, { ...w, portions: Number(portions), optionalIncluded, planId })
    if (tab === 'snack' && snackId) return buildSnackLog(SNACKS.find((x) => x.id === snackId)!, w, Number(snackPortions))
    if (tab === 'lebensmittel' && foodId && amount) return buildFoodLog(foodId, amount, w)
    if (tab === 'produkt' && productId && amount) {
      const p = data.products.find((x) => x.id === productId)
      return p ? buildProductLog(p, amount, w) : undefined
    }
    if (tab === 'frei' && freeName.trim() && free.kcal !== undefined) {
      const n: Nutrients = {}
      for (const [k, v] of Object.entries(free)) if (v !== undefined) n[k as keyof Nutrients] = v
      return buildFreeLog(freeName.trim(), n, { ...w, note: note.trim() || undefined })
    }
    if (tab === 'rest' && restId) {
      const item = data.pantry.find((p) => p.id === restId)
      return item ? buildLeftoverLog(item, restPortions, w) : undefined
    }
    return undefined
  }

  const entry = candidate()

  async function save(force = false) {
    if (!entry) return
    if (!force) {
      const dup = findDuplicate(data.foodLogs, entry)
      if (dup) {
        setDuplicate(dup)
        return
      }
    }
    await store.save('foodLogs', entry)
    if (tab === 'rezept' && recipeId) {
      if (deduct) {
        const cooked = Number(portions) + (saveRest ? 1 : 0)
        const { updates, removals } = pantryAfterCooking(data.pantry, recipeId, settings, cooked, optionalIncluded)
        if (updates.length) await store.save('pantry', updates)
        if (removals.length) await store.remove('pantry', removals)
      }
      if (saveRest) await store.save('pantry', buildLeftoverItem(recipeId, settings, 1, optionalIncluded))
    }
    if (tab === 'rest' && restId) {
      const item = data.pantry.find((p) => p.id === restId)
      if (item) {
        const rest = item.amount - restPortions
        if (rest <= 0) await store.remove('pantry', item.id)
        else await store.save('pantry', { ...item, amount: rest, updatedAt: new Date().toISOString() })
      }
    }
    toast(saveRest ? 'Eingetragen, Rest im Vorrat gespeichert' : 'Eingetragen')
    onClose()
  }

  const preview: Nutrients | undefined =
    tab === 'rezept'
      ? recipeCalc?.profile.values
      : tab === 'lebensmittel' && foodId && amount
        ? foodProfile(FOOD_MAP[foodId], amount).values
        : tab === 'produkt' && productId && amount
          ? productProfile(data.products.find((p) => p.id === productId)!, amount).values
          : tab === 'frei'
            ? (free as Nutrients)
            : entry?.nutrients

  return (
    <Modal
      title="Essen eintragen"
      onClose={onClose}
      wide
      footer={
        <>
          {duplicate && (
            <div className="row grow small warn-text" style={{ gap: 8 }}>
              <AlertTriangle size={16} />
              Möglicher Doppeleintrag: „{duplicate.name}“ um {duplicate.time}.
            </div>
          )}
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Abbrechen
          </button>
          {duplicate ? (
            <button type="button" className="btn btn-dark" onClick={() => save(true)}>
              Trotzdem speichern
            </button>
          ) : (
            <button type="button" className="btn btn-primary" disabled={!entry} onClick={() => save()}>
              Eintragen
            </button>
          )}
        </>
      }
    >
      <Tabs
        value={tab}
        onChange={(t) => {
          setTab(t)
          setQuery('')
          setDuplicate(undefined)
        }}
        options={[
          { value: 'rezept', label: 'Rezept' },
          { value: 'snack', label: 'Snacks' },
          { value: 'lebensmittel', label: 'Lebensmittel' },
          { value: 'produkt', label: `Produkte${products.length ? ` (${products.length})` : ''}` },
          { value: 'frei', label: 'Freier Eintrag' },
          { value: 'rest', label: `Reste${leftovers.length ? ` (${leftovers.length})` : ''}` },
        ]}
      />

      <div className="form-grid" style={{ marginBottom: 16 }}>
        <Field label="Datum">
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
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
      </div>

      {(tab === 'rezept' || tab === 'lebensmittel') && (
        <div className="input-group" style={{ marginBottom: 12 }}>
          <input className="input" placeholder={tab === 'rezept' ? 'Rezept suchen …' : 'Lebensmittel suchen …'} value={query} onChange={(e) => setQuery(e.target.value)} />
          <span className="input-suffix">
            <Search size={16} />
          </span>
        </div>
      )}

      {tab === 'snack' && (
        <div className="stack">
          <Seg
            value={snackKind}
            onChange={setSnackKind}
            options={[
              { value: 'alle', label: 'Alle' },
              { value: 'kalorien', label: 'Viele Kalorien' },
              { value: 'eiweiss', label: 'Viel Eiweiß' },
            ]}
          />
          <div className="list" style={{ maxHeight: 340, overflowY: 'auto' }}>
            {snackList.map(({ snack, v }) => (
              <button
                key={snack.id}
                type="button"
                className={`list-item snack-pick ${snackId === snack.id ? 'selected' : ''}`}
                onClick={() => setSnackId(snack.id)}
                aria-pressed={snackId === snack.id}
              >
                <span className="grow">
                  <span className="title" style={{ display: 'block' }}>
                    {snack.name}
                  </span>
                  <span className="meta num">
                    {num(v.kcal ?? 0)} kcal · {num(v.protein ?? 0)} g Eiweiß{snack.hint ? ` · ${snack.hint}` : ''}
                  </span>
                </span>
              </button>
            ))}
          </div>
          {snackId && (
            <Field label="Menge">
              <Seg
                value={snackPortions}
                onChange={setSnackPortions}
                options={[
                  { value: '1', label: '1 Portion' },
                  { value: '2', label: '2 Portionen' },
                ]}
              />
            </Field>
          )}
        </div>
      )}

      {tab === 'rezept' && (
        <div className="stack">
          {!selectedRecipe && (
            <div className="list" style={{ maxHeight: 320, overflowY: 'auto' }}>
              {recipeList.map(({ r, fav, p }) => (
                <button
                  key={r.id}
                  type="button"
                  className="list-item"
                  style={{ border: 0, borderTop: '1px solid var(--line)', background: 'none', textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => {
                    setRecipeId(r.id)
                    setOptional(defaultOptionalIncluded(r, settings))
                  }}
                >
                  {fav ? <Star size={15} fill="#17d861" color="#17d861" /> : <span style={{ width: 15 }} />}
                  <span className="grow">
                    <span className="title" style={{ display: 'block' }}>
                      {r.name}
                    </span>
                    <span className="meta">
                      {num(p.kcal ?? 0)} kcal · {num(p.protein ?? 0)} g Protein · {r.minutes} min
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {selectedRecipe && recipeCalc && (
            <div className="stack">
              <div className="row-between">
                <div>
                  <div className="strong">{selectedRecipe.name}</div>
                  <div className="muted small">Nährwerte berechnet aus den Zutatenmengen, Schätzwerte</div>
                </div>
                {!initialRecipe && (
                  <button type="button" className="btn btn-sm" onClick={() => setRecipeId(undefined)}>
                    Anderes Rezept
                  </button>
                )}
              </div>
              <div className="row-wrap">
                <span className="field-label">Gegessene Portionen</span>
                <Seg value={portions} onChange={setPortions} options={[{ value: '1', label: '1 Portion' }, { value: '2', label: '2 Portionen' }]} />
              </div>
              {selectedRecipe.ingredients.some((i) => i.optional) && (
                <div className="stack-sm">
                  <span className="field-label">Optionale Zutaten (nur, was du wirklich verwendet hast)</span>
                  <div className="row-wrap">
                    {selectedRecipe.ingredients
                      .filter((i) => i.optional && foodStatus(FOOD_MAP[i.foodId], settings).allowed)
                      .map((i) => (
                        <button
                          key={i.foodId}
                          type="button"
                          className="chip"
                          aria-pressed={optionalIncluded.includes(i.foodId)}
                          onClick={() =>
                            setOptional(optionalIncluded.includes(i.foodId) ? optionalIncluded.filter((x) => x !== i.foodId) : [...optionalIncluded, i.foodId])
                          }
                        >
                          {FOOD_MAP[i.foodId].name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
              <Switch checked={deduct} onChange={setDeduct} label="Zutaten aus dem Vorrat abziehen (falls vorhanden)" />
              {selectedRecipe.keeps && <Switch checked={saveRest} onChange={setSaveRest} label="Ich habe eine Portion mehr gekocht: als Rest für morgen speichern" />}
            </div>
          )}
        </div>
      )}

      {tab === 'lebensmittel' && (
        <div className="stack">
          {!foodId && (
            <div className="list" style={{ maxHeight: 320, overflowY: 'auto' }}>
              {foodList.map((f) => {
                const st = foodStatus(f, settings)
                return (
                  <button
                    key={f.id}
                    type="button"
                    className="list-item"
                    style={{ border: 0, borderTop: '1px solid var(--line)', background: 'none', textAlign: 'left', cursor: 'pointer' }}
                    onClick={() => {
                      setFoodId(f.id)
                      setAmount(f.piece?.amount ?? 100)
                    }}
                  >
                    <span className="grow">
                      <span className="title" style={{ display: 'block' }}>
                        {f.name}
                      </span>
                      <span className="meta">
                        {num(f.per100.kcal ?? 0)} kcal · {num(f.per100.protein ?? 0)} g Protein pro 100 {f.unit}
                      </span>
                    </span>
                    {!st.allowed && <span className="badge badge-warn">{st.kind === 'excluded' ? 'ausgeschlossen' : 'vermieden'}</span>}
                  </button>
                )
              })}
            </div>
          )}
          {foodId && (
            <div className="stack">
              <div className="row-between">
                <div className="strong">{FOOD_MAP[foodId].name}</div>
                <button type="button" className="btn btn-sm" onClick={() => setFoodId(undefined)}>
                  Anderes Lebensmittel
                </button>
              </div>
              <div className="row-wrap">
                <div style={{ width: 160 }}>
                  <NumberInput value={amount} onChange={setAmount} suffix={FOOD_MAP[foodId].unit} ariaLabel="Menge" />
                </div>
                {FOOD_MAP[foodId].piece && (
                  <>
                    {[1, 2, 3].map((n) => (
                      <button key={n} type="button" className="chip" onClick={() => setAmount(n * FOOD_MAP[foodId].piece!.amount)}>
                        {n} × {FOOD_MAP[foodId].piece!.label}
                      </button>
                    ))}
                  </>
                )}
              </div>
              {FOOD_MAP[foodId].labelEstimate && <div className="muted small">Grobe Produktschätzung. Für genaue Werte das Etikett als eigenes Produkt anlegen.</div>}
            </div>
          )}
        </div>
      )}

      {tab === 'produkt' && (
        <div className="stack">
          {products.length === 0 && <div className="muted small">Noch keine eigenen Produkte. Lege eins mit den Werten vom Etikett an.</div>}
          <button type="button" className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setNewProduct(true)}>
            <Plus size={14} /> Produkt anlegen
          </button>
          {newProduct && (
            <ProductDialog
              onClose={() => setNewProduct(false)}
              onSaved={(p) => {
                setProductId(p.id)
                setAmount(p.serving ?? 100)
              }}
            />
          )}
          <div className="row-wrap">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                className="chip"
                aria-pressed={productId === p.id}
                onClick={() => {
                  setProductId(p.id)
                  setAmount(p.serving ?? (p.size && p.size <= 500 ? p.size : 100))
                }}
              >
                {p.favorite && <Star size={13} />}
                {p.name}
              </button>
            ))}
          </div>
          {productId &&
            (() => {
              const p = data.products.find((x) => x.id === productId)
              return (
                <div className="row-wrap" style={{ alignItems: 'center' }}>
                  <div style={{ width: 180 }}>
                    <NumberInput value={amount} onChange={setAmount} suffix={p?.unit} ariaLabel="Menge" />
                  </div>
                  {p?.serving &&
                    [0.5, 1, 1.5, 2].map((n) => (
                      <button key={n} type="button" className="chip" aria-pressed={amount === p.serving! * n} onClick={() => setAmount(p.serving! * n)}>
                        {n === 1 ? (p.portionLabel ?? '1 Portion') : `${String(n).replace('.', ',')} × Portion`}
                      </button>
                    ))}
                </div>
              )
            })()}
        </div>
      )}

      {tab === 'frei' && (
        <div className="stack">
          <Field label="Was hast du gegessen?">
            <input className="input" value={freeName} onChange={(e) => setFreeName(e.target.value)} placeholder="z. B. Essen bei den Eltern, Mensa, Uni-Snack" />
          </Field>
          <div className="form-grid">
            <Field label="Kalorien (Pflicht)">
              <NumberInput value={free.kcal} onChange={(v) => setFree({ ...free, kcal: v })} suffix="kcal" />
            </Field>
            <Field label="Protein">
              <NumberInput value={free.protein} onChange={(v) => setFree({ ...free, protein: v })} suffix="g" />
            </Field>
            <Field label="Kohlenhydrate">
              <NumberInput value={free.carbs} onChange={(v) => setFree({ ...free, carbs: v })} suffix="g" />
            </Field>
            <Field label="Fett">
              <NumberInput value={free.fat} onChange={(v) => setFree({ ...free, fat: v })} suffix="g" />
            </Field>
            <Field label="Ballaststoffe">
              <NumberInput value={free.fiber} onChange={(v) => setFree({ ...free, fiber: v })} suffix="g" />
            </Field>
          </div>
          <Field label="Notiz (optional)">
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="muted small">Leere Felder bleiben „keine Daten“ und werden nicht als 0 gezählt. Mikronährstoffe sind bei freien Einträgen unbekannt.</div>
        </div>
      )}

      {tab === 'rest' && (
        <div className="stack">
          {leftovers.length === 0 && <div className="muted small">Keine Reste im Vorrat. Reste entstehen, wenn du beim Eintragen eines Rezepts eine Portion mehr kochst.</div>}
          {leftovers.map((l) => (
            <button key={l.id} type="button" className="chip" aria-pressed={restId === l.id} onClick={() => setRestId(l.id)}>
              {l.name} · {num(l.amount)} Portion(en)
            </button>
          ))}
          {restId && (
            <div style={{ width: 180 }}>
              <NumberInput value={restPortions} onChange={(v) => setRestPortions(v ?? 1)} suffix="Portion" step={0.5} min={0.5} />
            </div>
          )}
        </div>
      )}

      {preview && (preview.kcal !== undefined || preview.protein !== undefined) && (
        <div className="card flat marble" style={{ marginTop: 18, padding: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            Vorschau
          </div>
          <MacroPreview n={preview} />
        </div>
      )}
    </Modal>
  )
}
