import { Check, ChevronLeft, ChevronRight, Lightbulb, Pencil, Plus, ShoppingBasket } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ConfirmButton } from '../components/ConfirmButton'
import { usePlanNeeds, useToday, useWeekBudget } from '../components/hooks'
import {
  draftFromProduct,
  draftValid,
  ProductAnalysisStrip,
  ProductForm,
  productFromDraft,
  type ProductDraft,
} from '../components/ProductDialog'
import { Bar, Card, CardHead, Empty, Field, Modal, NumberInput, PageHead, Seg, Switch, Tabs } from '../components/ui'
import { FOOD_MAP, FOODS } from '../data/foods'
import { RECIPE_MAP, RECIPES } from '../data/recipes'
import { foodIdeas } from '../domain/ideas'
import { analyzeProduct, groupByMeal, itemsForWeek, itemTotal } from '../domain/purchases'
import { formatAmount } from '../domain/recipes'
import { planForWeek } from '../domain/shopping'
import { addDays, formatDate, startOfWeek } from '../lib/date'
import { stamp } from '../lib/id'
import { euro, num } from '../lib/format'
import { navigate, type Route } from '../state/router'
import { useStore } from '../state/store'
import { useToast } from '../state/toast'
import type { PantryItem, ShoppingItem } from '../types'

type Tab = 'liste' | 'vorrat'

export default function Shopping({ route }: { route: Route }) {
  const today = useToday()
  const weekStart = route.query.get('woche') ?? startOfWeek(today)
  const tab = (route.query.get('tab') as Tab) === 'vorrat' ? 'vorrat' : 'liste'
  const budget = useWeekBudget(weekStart)
  const { data } = useStore()
  const items = itemsForWeek(data.shoppingItems, weekStart)
  const go = (t: Tab, w = weekStart) => navigate(`/einkauf?tab=${t}${w !== startOfWeek(today) ? `&woche=${w}` : ''}`)
  return (
    <div className="page">
      <PageHead
        eyebrow={`${formatDate(weekStart)} – ${formatDate(addDays(weekStart, 6))}`}
        title="Einkaufsliste"
        lead="Du trägst ein, was du kaufst, die App rechnet Budget, Kosten pro Portion und Protein pro Euro."
        stats={[
          { label: 'Noch frei', value: budget.free, unit: '€', money: true, accent: budget.free >= 0, warn: budget.free < 0 },
          { label: 'Gekauft', value: budget.bought, unit: '€', money: true },
          { label: 'Auf der Liste', value: budget.planned, unit: '€', money: true },
        ]}
        actions={
          <div className="date-nav">
            <button type="button" className="btn btn-icon" onClick={() => go(tab, addDays(weekStart, -7))} aria-label="Vorherige Woche">
              <ChevronLeft size={18} />
            </button>
            <button type="button" className="btn btn-icon" onClick={() => go(tab, addDays(weekStart, 7))} aria-label="Nächste Woche">
              <ChevronRight size={18} />
            </button>
            {weekStart !== startOfWeek(today) && (
              <button type="button" className="btn" onClick={() => go(tab, startOfWeek(today))}>
                Diese Woche
              </button>
            )}
          </div>
        }
      />
      <Tabs
        value={tab}
        onChange={(t) => go(t)}
        options={[
          { value: 'liste', label: `Liste (${items.filter((i) => !i.checked).length} offen)` },
          { value: 'vorrat', label: 'Vorrat' },
        ]}
      />
      {tab === 'liste' && <ListTab weekStart={weekStart} />}
      {tab === 'vorrat' && <PantryTab />}
    </div>
  )
}

function ListTab({ weekStart }: { weekStart: string }) {
  const store = useStore()
  const { data, settings } = store
  const { toast } = useToast()
  const budget = useWeekBudget(weekStart)
  const [dialog, setDialog] = useState<{ item?: ShoppingItem; name?: string; meal?: string; foodId?: string; packs?: number } | null>(null)
  const items = itemsForWeek(data.shoppingItems, weekStart)
  const groups = useMemo(() => groupByMeal(items, data.products), [items, data.products])
  const used = budget.bought + budget.planned + budget.co2

  const analyses = items
    .map((i) => {
      const p = data.products.find((x) => x.id === i.productId)
      return p ? { item: i, product: p, a: analyzeProduct(p, i.price) } : undefined
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
  const totalProtein = analyses.reduce((s, x) => s + (x.a.proteinPerPack ?? 0) * x.item.packs, 0)
  const proteinCost = analyses.reduce((s, x) => s + (x.a.proteinPerPack ? (itemTotal(x.item) ?? 0) : 0), 0)
  const best = [...analyses].filter((x) => x.a.proteinPerEuro !== undefined).sort((a, b) => (b.a.proteinPerEuro ?? 0) - (a.a.proteinPerEuro ?? 0))[0]

  async function toggle(item: ShoppingItem) {
    await store.save('shoppingItems', { ...item, checked: !item.checked, updatedAt: new Date().toISOString() })
  }

  return (
    <div className="shop-layout">
      <div className="stack-lg">
        <Card index={0}>
          <div className="row-between" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div className="grow" style={{ minWidth: 220 }}>
              <div className="eyebrow">Wochenbudget</div>
              <div className="row" style={{ alignItems: 'baseline', gap: 10, margin: '4px 0 10px' }}>
                <span className={`stat-value ${budget.status === 'ueber' ? 'warn-text' : ''}`}>{euro(budget.free)}</span>
                <span className="muted small">
                  frei · {euro(used)} von {euro(budget.budget)} verplant
                </span>
              </div>
              <Bar value={used} max={budget.budget} marker={budget.min} size="thick" variant={budget.status === 'ueber' ? 'warn' : undefined} label="Budget" />
            </div>
            <button type="button" className="btn btn-primary btn-lg" onClick={() => setDialog({})}>
              <Plus size={18} /> Eintragen
            </button>
          </div>
          <div className="row-between" style={{ marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
            <Switch
              checked={settings.budget.co2Needed}
              onChange={(v) => store.updateSettings((s) => ({ ...s, budget: { ...s.budget, co2Needed: v } }))}
              label={`CO₂-Kartusche diese Woche (${euro(settings.budget.co2Price)})`}
            />
            {budget.withoutPrice > 0 && <span className="tiny warn-text">{budget.withoutPrice} Eintrag/Einträge ohne Preis zählen noch nicht.</span>}
          </div>
        </Card>

        {items.length === 0 ? (
          <Card index={1}>
            <Empty
              icon={<ShoppingBasket size={30} />}
              action={
                <button type="button" className="btn btn-primary" onClick={() => setDialog({})}>
                  <Plus size={16} /> Erstes Produkt eintragen
                </button>
              }
            >
              Noch nichts eingetragen. Trag deine Produkte mit Preis ein, Getränke wie Afri-Cola oder Energy-Drinks genauso. Ideen stehen unter „Was du kaufen könntest“.
            </Empty>
          </Card>
        ) : (
          groups.map((g, gi) => (
            <Card key={g.meal} index={gi + 1}>
              <CardHead
                eyebrow={g.meal === 'Ohne Zuordnung' ? 'Ohne Zuordnung' : 'Für'}
                title={g.meal === 'Ohne Zuordnung' ? `${g.items.length} ${g.items.length === 1 ? 'Produkt' : 'Produkte'}` : g.meal}
                action={
                  <div className="group-sum">
                    <strong className="num">{euro(g.cost)}</strong>
                    {g.protein !== undefined && <span className="badge badge-neon">{num(g.protein)} g Protein</span>}
                    {g.kcal !== undefined && <span className="badge">{num(g.kcal)} kcal</span>}
                  </div>
                }
              />
              <div className="list">
                {g.items.map((i) => {
                  const p = data.products.find((x) => x.id === i.productId)
                  const a = p ? analyzeProduct(p, i.price) : undefined
                  const total = itemTotal(i)
                  return (
                    <div key={i.id} className={`shop-item ${i.checked ? 'done' : ''}`}>
                      <button type="button" className="check" aria-pressed={i.checked} onClick={() => toggle(i)} aria-label={`${i.name} abhaken`}>
                        <Check size={14} strokeWidth={3} />
                      </button>
                      <div className="grow" style={{ minWidth: 0 }}>
                        <div className="row-between" style={{ alignItems: 'baseline' }}>
                          <span className="title strong">
                            {i.packs !== 1 && <span className="muted">{num(i.packs, 1)}× </span>}
                            {i.name}
                          </span>
                          <span className="num strong">{total !== undefined ? euro(total) : <span className="warn-text tiny">ohne Preis</span>}</span>
                        </div>
                        <div className="meta">
                          {[p?.brand, i.store ?? p?.shop, i.price !== undefined && i.packs !== 1 ? `${euro(i.price)} je Packung` : undefined, i.inBudget ? undefined : 'nicht im Budget', i.note]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                        {a && (
                          <div className="item-analysis">
                            <span>
                              <b>{a.portionLabel}</b>: {num(a.perPortion.kcal ?? 0)} kcal · {num(a.perPortion.protein ?? 0)} g Protein
                            </span>
                            {a.pricePerPortion !== undefined && <span>{euro(a.pricePerPortion)} / Portion</span>}
                            {a.proteinPerEuro !== undefined && <span>{num(a.proteinPerEuro)} g Protein / €</span>}
                            {a.rating === 'top' && <span className="badge badge-neon">Top-Proteinquelle</span>}
                          </div>
                        )}
                        {!p && <div className="tiny muted">Ohne Nährwerte. Über ✎ kannst du Etikettwerte ergänzen.</div>}
                      </div>
                      <div className="entry-actions">
                        <button type="button" className="btn btn-ghost btn-icon sm" onClick={() => setDialog({ item: i })} aria-label="Bearbeiten">
                          <Pencil size={15} />
                        </button>
                        <ConfirmButton onConfirm={() => store.remove('shoppingItems', i.id).then(() => toast('Eintrag gelöscht'))} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="stack-lg">
        <Card index={2} dark>
          <div className="hud-label">Analyse deiner Liste</div>
          <div className="dark-kpis">
            <div>
              <span className="hud-label">Protein gesamt</span>
              <strong className="num">{num(totalProtein)} g</strong>
            </div>
            <div>
              <span className="hud-label">€ pro 10 g Protein</span>
              <strong className="num">{totalProtein > 0 ? euro((proteinCost / totalProtein) * 10) : '–'}</strong>
            </div>
          </div>
          {best ? (
            <div className="muted small" style={{ marginTop: 12 }}>
              Günstigstes Protein: <strong style={{ color: '#fff' }}>{best.product.name}</strong> mit {num(best.a.proteinPerEuro ?? 0)} g pro Euro.
            </div>
          ) : (
            <div className="muted small" style={{ marginTop: 12 }}>
              Sobald du Produkte mit Nährwerten und Preis einträgst, siehst du hier, wie viel Protein du pro Euro bekommst.
            </div>
          )}
        </Card>
        <Suggestions weekStart={weekStart} onAdd={(s) => setDialog(s)} />
      </div>

      {dialog && <ShoppingItemDialog weekStart={weekStart} item={dialog.item} initial={dialog} onClose={() => setDialog(null)} />}
    </div>
  )
}

function Suggestions({ weekStart, onAdd }: { weekStart: string; onAdd: (s: { name: string; meal?: string; foodId?: string }) => void }) {
  const { data, settings } = useStore()
  const needs = usePlanNeeds(weekStart)
  const [view, setView] = useState<'plan' | 'protein'>(needs.lines.length ? 'plan' : 'protein')
  const onList = new Set(itemsForWeek(data.shoppingItems, weekStart).map((i) => i.name.toLowerCase()))
  const proteinIdeas = useMemo(
    () =>
      foodIdeas('protein', settings, [], 9)
        .filter((i) => i.foodId && !FOOD_MAP[i.foodId].staple)
        .map((i) => ({ ...i, food: FOOD_MAP[i.foodId!] })),
    [settings],
  )
  const planned = planForWeek(data.mealPlan, weekStart).filter((m) => !m.leftoverOf)
  return (
    <Card index={3}>
      <CardHead eyebrow="Vorschläge" title="Was du kaufen könntest" action={<Lightbulb size={18} color="var(--neon-ink)" />} />
      <Seg
        value={view}
        onChange={setView}
        options={[
          { value: 'plan', label: `Wochenplan (${needs.lines.length})` },
          { value: 'protein', label: 'Proteinreich' },
        ]}
      />
      <div className="list" style={{ marginTop: 10 }}>
        {view === 'plan' &&
          (needs.lines.length === 0 ? (
            <div className="muted small" style={{ padding: '8px 0' }}>
              Im Wochenplan sind noch keine Rezepte. Dann gibt es hier passende Zutaten.
            </div>
          ) : (
            needs.lines
              .filter((l) => l.toBuy > 0)
              .map((l) => (
                <div key={l.foodId} className="list-item">
                  <div className="grow">
                    <div className="title">{l.food.name}</div>
                    <div className="meta">
                      ca. {formatAmount(l.food, l.toBuy).split(' · ').pop()} · {l.recipes.join(', ')}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={onList.has(l.food.name.toLowerCase())}
                    onClick={() => onAdd({ name: l.food.name, foodId: l.foodId, meal: l.recipes.length === 1 ? l.recipes[0] : undefined })}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              ))
          ))}
        {view === 'protein' &&
          proteinIdeas.map((i) => (
            <div key={i.foodId} className="list-item">
              <div className="grow">
                <div className="title">{i.food.name}</div>
                <div className="meta">
                  {num(i.food.per100.protein ?? 0, 1)} g Protein / 100 {i.food.unit} · {num(((i.food.per100.protein ?? 0) / (i.food.per100.kcal || 1)) * 100, 1)} g / 100 kcal
                </div>
              </div>
              <button type="button" className="btn btn-sm" disabled={onList.has(i.food.name.toLowerCase())} onClick={() => onAdd({ name: i.food.name, foodId: i.foodId })}>
                <Plus size={14} />
              </button>
            </div>
          ))}
      </div>
      {planned.length > 0 && view === 'plan' && (
        <div className="muted tiny" style={{ marginTop: 8 }}>
          Aus deinem Plan: {planned.map((m) => RECIPE_MAP[m.recipeId]?.name).join(', ')}. Vorschläge sind Richtmengen, du entscheidest, was du kaufst.
        </div>
      )}
    </Card>
  )
}

function ShoppingItemDialog({
  weekStart,
  item,
  initial,
  onClose,
}: {
  weekStart: string
  item?: ShoppingItem
  initial: { name?: string; meal?: string; foodId?: string; packs?: number }
  onClose: () => void
}) {
  const store = useStore()
  const { data } = store
  const { toast } = useToast()
  const products = [...data.products].sort((a, b) => a.name.localeCompare(b.name))
  const [name, setName] = useState(item?.name ?? initial.name ?? '')
  const [productId, setProductId] = useState<string>(item?.productId ?? '')
  const [newProduct, setNewProduct] = useState(false)
  const [draft, setDraft] = useState<ProductDraft>(() => draftFromProduct(undefined, 'food', initial.name ?? ''))
  const [packs, setPacks] = useState<number | undefined>(item?.packs ?? initial.packs ?? 1)
  const [price, setPrice] = useState<number | undefined>(item?.price)
  const [meal, setMeal] = useState(item?.meal ?? initial.meal ?? '')
  const [shop, setShop] = useState(item?.store ?? '')
  const [inBudget, setInBudget] = useState(item?.inBudget ?? true)
  const [note, setNote] = useState(item?.note ?? '')
  const product = data.products.find((p) => p.id === productId)
  const mealOptions = useMemo(() => {
    const planned = planForWeek(data.mealPlan, weekStart).map((m) => RECIPE_MAP[m.recipeId]?.name)
    const used = data.shoppingItems.map((i) => i.meal).filter(Boolean) as string[]
    return [...new Set([...planned, ...used, ...RECIPES.map((r) => r.name)])].filter(Boolean) as string[]
  }, [data.mealPlan, data.shoppingItems, weekStart])

  const effectivePrice = newProduct ? (price ?? draft.price) : price
  const canSave = (newProduct ? draftValid(draft) : !!name.trim()) && !!packs && packs > 0

  async function save() {
    if (!canSave) return
    let pid = productId || undefined
    let itemName = name.trim()
    if (newProduct) {
      const p = productFromDraft({ ...draft, price: draft.price ?? price, shop: draft.shop || shop })
      await store.save('products', p)
      pid = p.id
      itemName = itemName || p.name
    }
    const base = {
      week: weekStart,
      name: itemName || product?.name || 'Produkt',
      productId: pid,
      packs: packs!,
      price: effectivePrice ?? (newProduct ? undefined : product?.price),
      meal: meal.trim() || undefined,
      store: shop.trim() || undefined,
      inBudget,
      note: note.trim() || undefined,
    }
    const record: ShoppingItem = item ? { ...item, ...base, updatedAt: new Date().toISOString() } : stamp<ShoppingItem>({ ...base, checked: false })
    await store.save('shoppingItems', record)
    toast(item ? 'Eintrag aktualisiert' : 'Auf die Einkaufsliste gesetzt')
    onClose()
  }

  return (
    <Modal
      title={item ? 'Eintrag bearbeiten' : 'Auf die Einkaufsliste'}
      onClose={onClose}
      wide
      footer={
        <>
          <span className="muted small grow">
            {effectivePrice !== undefined && packs ? `Summe ${euro(effectivePrice * packs)}` : 'Ohne Preis zählt der Eintrag noch nicht zum Budget.'}
          </span>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" disabled={!canSave} onClick={save}>
            Speichern
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="form-grid">
          {!newProduct && (
            <Field label="Was kaufst du?">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Afri-Cola 1 l, Skyr, Hähnchenbrust" />
            </Field>
          )}
          <Field label="Anzahl">
            <NumberInput value={packs} onChange={setPacks} suffix="×" min={0} />
          </Field>
          {!newProduct && (
            <Field label="Preis pro Packung">
              <NumberInput value={price} onChange={setPrice} suffix="€" step={0.01} placeholder={product?.price !== undefined ? String(product.price).replace('.', ',') : undefined} />
            </Field>
          )}
          <Field label="Für welches Essen (optional)">
            <input className="input" value={meal} onChange={(e) => setMeal(e.target.value)} list="meal-options" placeholder="Rezept oder eigener Name" />
            <datalist id="meal-options">
              {mealOptions.slice(0, 160).map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Field>
          {!newProduct && (
            <Field label="Laden (optional)">
              <input className="input" value={shop} onChange={(e) => setShop(e.target.value)} list="shops" />
            </Field>
          )}
        </div>

        <div className="stack-sm">
          <span className="field-label">Nährwerte für die Analyse</span>
          <Seg
            value={newProduct ? 'neu' : productId ? 'vorhanden' : 'ohne'}
            onChange={(v) => {
              setNewProduct(v === 'neu')
              if (v === 'ohne') setProductId('')
              if (v === 'neu') setDraft((d) => ({ ...d, name: d.name || name, price: d.price ?? price, shop: d.shop || shop }))
            }}
            options={[
              { value: 'ohne', label: 'Ohne' },
              { value: 'vorhanden', label: `Meine Produkte (${products.length})` },
              { value: 'neu', label: 'Neues Produkt' },
            ]}
          />
        </div>

        {!newProduct && (productId || products.length > 0) && (
          <Field label="Produkt">
            <select
              className="select"
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value)
                const p = data.products.find((x) => x.id === e.target.value)
                if (p) {
                  if (!name.trim()) setName(p.name)
                  if (price === undefined && p.price !== undefined) setPrice(p.price)
                  if (!shop && p.shop) setShop(p.shop)
                }
              }}
            >
              <option value="">– keins –</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.brand ? ` (${p.brand})` : ''}
                </option>
              ))}
            </select>
          </Field>
        )}
        {!newProduct && product && <ProductAnalysisStrip analysis={analyzeProduct(product, price)} unit={product.unit} />}

        {newProduct && <ProductForm draft={draft} onChange={setDraft} suggestFoodId={initial.foodId} />}

        <div className="form-grid">
          <Field label="Notiz (optional)">
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
        <Switch checked={inBudget} onChange={setInBudget} label="Zählt zum Wochenbudget" />
      </div>
    </Modal>
  )
}

function PantryTab() {
  const store = useStore()
  const { data } = store
  const { toast } = useToast()
  const [foodId, setFoodId] = useState('reis')
  const [amount, setAmount] = useState<number | undefined>()
  const foods = data.pantry.filter((p) => p.kind === 'food').sort((a, b) => a.name.localeCompare(b.name))
  const leftovers = data.pantry.filter((p) => p.kind === 'leftover')

  async function add() {
    if (!amount) return
    const food = FOOD_MAP[foodId]
    const existing = data.pantry.find((p) => p.kind === 'food' && p.foodId === foodId)
    await store.save(
      'pantry',
      existing ? { ...existing, amount: existing.amount + amount, updatedAt: new Date().toISOString() } : stamp<PantryItem>({ kind: 'food', foodId, name: food.name, amount, unit: food.unit }),
    )
    setAmount(undefined)
    toast(`${food.name} im Vorrat`)
  }

  return (
    <div className="grid grid-2" style={{ alignItems: 'start' }}>
      <Card index={0}>
        <CardHead eyebrow="Vorrat" title={`${foods.length} Lebensmittel`} />
        <div className="muted small" style={{ marginBottom: 12 }}>
          Was schon zu Hause ist, zieht der Wochenplan von seinen Vorschlägen ab. Beim Eintragen eines Rezepts kann der Vorrat automatisch abgebucht werden.
        </div>
        <div className="row" style={{ marginBottom: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="grow" style={{ minWidth: 180 }}>
            <Field label="Lebensmittel">
              <select className="select" value={foodId} onChange={(e) => setFoodId(e.target.value)}>
                {FOODS.filter((f) => !f.staple && f.category !== 'getraenk').map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div style={{ width: 140 }}>
            <Field label="Menge">
              <NumberInput value={amount} onChange={setAmount} suffix={FOOD_MAP[foodId].unit} />
            </Field>
          </div>
          <button type="button" className="btn btn-dark" disabled={!amount} onClick={add}>
            Hinzufügen
          </button>
        </div>
        {foods.length === 0 ? (
          <div className="muted small">Noch nichts im Vorrat.</div>
        ) : (
          <div className="list">
            {foods.map((p) => (
              <div className="list-item" key={p.id}>
                <div className="grow">
                  <div className="title">{p.name}</div>
                </div>
                <div style={{ width: 130 }}>
                  <NumberInput
                    value={Math.round(p.amount)}
                    onChange={(v) => v !== undefined && store.save('pantry', { ...p, amount: v, updatedAt: new Date().toISOString() })}
                    suffix={p.unit}
                    ariaLabel={`Menge ${p.name}`}
                  />
                </div>
                <ConfirmButton onConfirm={() => store.remove('pantry', p.id)} />
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card index={1}>
        <CardHead eyebrow="Reste" title={`${leftovers.length} gespeicherte Reste`} />
        {leftovers.length === 0 ? (
          <div className="muted small">Wenn du ein Rezept doppelt kochst, speichere die zweite Portion als Rest. Im Tagesprotokoll trägst du sie dann mit einem Klick ein.</div>
        ) : (
          <div className="list">
            {leftovers.map((p) => (
              <div className="list-item" key={p.id}>
                <div className="grow">
                  <div className="title">{p.name}</div>
                  <div className="meta">
                    {num(p.amount)} Portion(en) · {num(p.nutrients?.kcal ?? 0)} kcal, {num(p.nutrients?.protein ?? 0)} g Protein pro Portion · seit {formatDate(p.createdAt.slice(0, 10))}
                  </div>
                </div>
                <ConfirmButton onConfirm={() => store.remove('pantry', p.id)} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
