import { Check, ChevronLeft, ChevronRight, PackagePlus, PiggyBank, Plus, ShoppingBasket } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ConfirmButton } from '../components/ConfirmButton'
import { useShoppingWeek, useToday } from '../components/hooks'
import { Bar, Card, CardHead, Empty, Field, Modal, Notice, NumberInput, PageHead, Switch, Tabs } from '../components/ui'
import { FOOD_MAP, FOODS } from '../data/foods'
import { RECIPE_MAP } from '../data/recipes'
import { savingsSuggestions } from '../domain/mealplan'
import { formatAmount, isAlwaysAvailable } from '../domain/recipes'
import { addDays, formatDate, startOfWeek } from '../lib/date'
import { stamp } from '../lib/id'
import { euro, num } from '../lib/format'
import { applySuggestion } from '../state/actions'
import { href, navigate, type Route } from '../state/router'
import { useStore } from '../state/store'
import { useToast } from '../state/toast'
import type { PantryItem, ShoppingCheck } from '../types'

type Tab = 'liste' | 'vorrat' | 'budget'

export default function Shopping({ route }: { route: Route }) {
  const today = useToday()
  const weekStart = route.query.get('woche') ?? startOfWeek(today)
  const tab = (route.query.get('tab') as Tab) ?? 'liste'
  const shopping = useShoppingWeek(weekStart)
  const go = (t: Tab, w = weekStart) => navigate(`/einkauf?tab=${t}${w !== startOfWeek(today) ? `&woche=${w}` : ''}`)
  return (
    <div className="page">
      <PageHead
        eyebrow={`${formatDate(weekStart)} – ${formatDate(addDays(weekStart, 6))}`}
        title="Einkaufsliste"
        lead="Automatisch aus deinem Wochenplan, abzüglich Vorrat. Brot, Toast, üblicher Belag und der Grundvorrat erscheinen nicht als Neukauf."
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
          { value: 'liste', label: `Liste (${shopping.lines.filter((l) => !l.checked && !l.transferred && l.toBuy > 0).length} offen)` },
          { value: 'vorrat', label: 'Vorrat' },
          { value: 'budget', label: `Budget · ${euro(shopping.budgetCash)}` },
        ]}
      />
      {tab === 'liste' && <ListTab weekStart={weekStart} />}
      {tab === 'vorrat' && <PantryTab />}
      {tab === 'budget' && <BudgetTab weekStart={weekStart} />}
    </div>
  )
}

function ListTab({ weekStart }: { weekStart: string }) {
  const store = useStore()
  const { data, settings } = store
  const { toast } = useToast()
  const shopping = useShoppingWeek(weekStart)
  const [adding, setAdding] = useState(false)
  const checks = data.shopping.filter((c) => c.week === weekStart)
  const visible = shopping.lines.filter((l) => l.toBuy > 0 || l.checked || l.transferred)
  const fromPantry = shopping.lines.filter((l) => l.toBuy === 0 && !l.transferred)
  const checkedOpen = shopping.lines.filter((l) => l.checked && !l.transferred && l.packs > 0)

  async function toggle(foodId: string) {
    const existing = checks.find((c) => c.foodId === foodId)
    const record: ShoppingCheck = existing
      ? { ...existing, checked: !existing.checked, updatedAt: new Date().toISOString() }
      : stamp<ShoppingCheck>({ id: `${weekStart}:${foodId}`, week: weekStart, foodId, checked: true })
    await store.save('shopping', record)
  }

  async function transfer() {
    const pantryItems: PantryItem[] = []
    const updates: ShoppingCheck[] = []
    for (const l of checkedOpen) {
      pantryItems.push(stamp<PantryItem>({ kind: 'food', foodId: l.foodId, name: l.food.name, amount: l.packs * l.packAmount, unit: l.food.unit } as PantryItem))
      const c = checks.find((x) => x.foodId === l.foodId)!
      updates.push({ ...c, transferred: true, boughtPacks: l.packs, updatedAt: new Date().toISOString() })
    }
    await store.save('pantry', pantryItems)
    await store.save('shopping', updates)
    toast(`${pantryItems.length} Artikel in den Vorrat übernommen`)
  }

  if (!shopping.lines.length && !shopping.drinks.length) {
    return (
      <Card>
        <Empty icon={<ShoppingBasket size={30} />} action={<a className="btn btn-primary" href={href(`/rezepte?tab=plan&woche=${weekStart}`)}>Wochenplan erstellen</a>}>
          Für diese Woche ist noch nichts geplant. Plane zuerst die Mittagessen, dann entsteht die Liste automatisch.
        </Empty>
      </Card>
    )
  }

  return (
    <div className="stack-lg">
      <div className="grid grid-4">
        <Card index={0}>
          <div className="eyebrow">Kassenpreis gesamt</div>
          <div className="stat-value">{euro(shopping.lines.reduce((s, l) => s + l.cash, 0) + shopping.drinksCash + shopping.co2)}</div>
          <div className="stat-sub">volle Packungen inkl. Getränke</div>
        </Card>
        <Card index={1}>
          <div className="eyebrow">Davon im Budget</div>
          <div className="stat-value">{euro(shopping.budgetCash)}</div>
          <div className="stat-sub">
            Ziel {settings.budget.min}–{settings.budget.max} €
          </div>
        </Card>
        <Card index={2}>
          <div className="eyebrow">Verbrauchskosten Essen</div>
          <div className="stat-value">{euro(shopping.lines.reduce((s, l) => s + l.used, 0))}</div>
          <div className="stat-sub">was diese Woche tatsächlich verbraucht wird</div>
        </Card>
        <Card index={3}>
          <div className="eyebrow">Außerhalb Budget</div>
          <div className="stat-value">{euro(shopping.outsideCash)}</div>
          <div className="stat-sub">Abendessen, Wochenende, Extras</div>
        </Card>
      </div>

      <Card index={4}>
        <CardHead
          eyebrow="Einkaufen"
          title={`${visible.length} ${visible.length === 1 ? 'Produkt' : 'Produkte'}`}
          action={
            <div className="row-wrap">
              <button type="button" className="btn btn-sm" onClick={() => setAdding(true)}>
                <Plus size={15} /> Artikel
              </button>
              {checkedOpen.length > 0 && (
                <button type="button" className="btn btn-sm btn-dark" onClick={transfer}>
                  <PackagePlus size={15} /> {checkedOpen.length} Gekaufte in den Vorrat
                </button>
              )}
            </div>
          }
        />
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th />
                <th>Produkt</th>
                <th className="num">Bedarf</th>
                <th className="num">Vorrat</th>
                <th className="num">Kaufen</th>
                <th className="num">Kassenpreis</th>
                <th className="num">Verbrauch</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((l) => (
                <tr key={l.foodId} className={`shop-row ${l.checked || l.transferred ? 'done' : ''}`}>
                  <td>
                    <button type="button" className="check" aria-pressed={l.checked || l.transferred} disabled={l.transferred} onClick={() => toggle(l.foodId)} aria-label={`${l.food.name} abhaken`}>
                      <Check size={14} strokeWidth={3} />
                    </button>
                  </td>
                  <td>
                    <div className="title strong">{l.food.name}</div>
                    <div className="muted tiny">
                      {l.recipes.join(', ')}
                      {l.neededBudget > 0 && l.neededBudget < l.needed ? ' · teilweise im Budget' : l.neededBudget > 0 ? ' · Budget' : ''}
                    </div>
                    {l.food.cheaper && !l.transferred && <div className="tiny" style={{ color: 'var(--neon-ink)' }}>Günstiger: {l.food.cheaper}</div>}
                    {l.transferred && <div className="tiny ok-text">im Vorrat</div>}
                  </td>
                  <td className="num">{formatAmount(l.food, l.needed).split(' · ').pop()}</td>
                  <td className="num">{l.inPantry > 0 ? `${num(l.inPantry)} ${l.food.unit}` : '–'}</td>
                  <td className="num">
                    {l.packs} × {l.packLabel}
                  </td>
                  <td className="num">{euro(l.cash)}</td>
                  <td className="num muted">{euro(l.used)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {fromPantry.length > 0 && (
          <div className="muted small" style={{ marginTop: 12 }}>
            Komplett aus dem Vorrat: {fromPantry.map((l) => l.food.name).join(', ')}
          </div>
        )}
      </Card>

      <div className="grid grid-2">
        <Card index={5}>
          <CardHead eyebrow="Im Budget" title="Spaßgetränke" />
          <div className="list">
            {shopping.drinks.map((d) => (
              <div className="list-item" key={d.id}>
                <div className="grow">
                  <div className="title">{d.name}</div>
                  <div className="meta">
                    {num(d.weeklyMl / 1000, 2)} l pro Woche · {d.packs} Packung(en)
                  </div>
                </div>
                <span className="num">{euro(d.cash)}</span>
              </div>
            ))}
          </div>
          <div className="muted tiny" style={{ marginTop: 8 }}>
            Menge und Preise stellst du unter <a href={href('/einstellungen?tab=budget')}>Einstellungen → Budget</a> ein. Die App ändert deinen Getränkekonsum nicht. Pfand ist nicht eingerechnet.
          </div>
          <div style={{ marginTop: 12 }}>
            <Switch
              checked={settings.budget.co2Needed}
              onChange={(v) => store.updateSettings((s) => ({ ...s, budget: { ...s.budget, co2Needed: v } }))}
              label={`Diese Woche CO₂-Kartusche für den SodaStream nötig (${euro(settings.budget.co2Price)})`}
            />
          </div>
        </Card>
        <Card index={6}>
          <CardHead eyebrow="Wird als vorhanden angenommen" title="Brot, Belag & Grundvorrat" />
          <div className="row-wrap">
            {FOODS.filter((f) => isAlwaysAvailable(f, settings)).map((f) => (
              <span key={f.id} className="badge">
                {f.name}
              </span>
            ))}
          </div>
          <div className="muted tiny" style={{ marginTop: 10 }}>
            Fehlt etwas aus dem Grundvorrat? In den <a href={href('/einstellungen?tab=vorrat')}>Einstellungen</a> abwählen, dann kommt es auf die Liste.
          </div>
        </Card>
      </div>
      {adding && <AddItemDialog weekStart={weekStart} onClose={() => setAdding(false)} />}
    </div>
  )
}

function AddItemDialog({ weekStart, onClose }: { weekStart: string; onClose: () => void }) {
  const store = useStore()
  const { toast } = useToast()
  const [foodId, setFoodId] = useState('banane')
  const [amount, setAmount] = useState<number | undefined>(FOOD_MAP.banane.pack?.amount)
  return (
    <Modal
      title="Artikel hinzufügen"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!amount}
            onClick={async () => {
              await applySuggestion(store, `manual-${weekStart}-${foodId}-${Date.now()}`, { type: 'addShopping', week: weekStart, foodId, amount: amount! })
              toast('Zur Einkaufsliste hinzugefügt')
              onClose()
            }}
          >
            Hinzufügen
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Produkt">
          <select
            className="select"
            value={foodId}
            onChange={(e) => {
              setFoodId(e.target.value)
              setAmount(FOOD_MAP[e.target.value].pack?.amount ?? 100)
            }}
          >
            {FOODS.filter((f) => f.pack).map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Menge">
          <NumberInput value={amount} onChange={setAmount} suffix={FOOD_MAP[foodId].unit} />
        </Field>
      </div>
      <div className="muted small" style={{ marginTop: 10 }}>
        Zusätzliche Artikel zählen nicht zum Mittagessen-Budget.
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
      existing ? { ...existing, amount: existing.amount + amount, updatedAt: new Date().toISOString() } : stamp<PantryItem>({ kind: 'food', foodId, name: food.name, amount, unit: food.unit } as PantryItem),
    )
    setAmount(undefined)
    toast(`${food.name} im Vorrat`)
  }

  return (
    <div className="grid grid-2" style={{ alignItems: 'start' }}>
      <Card index={0}>
        <CardHead eyebrow="Vorrat" title={`${foods.length} Lebensmittel`} />
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
          <div className="muted small">Noch nichts im Vorrat. Gekaufte Artikel landen hier, wenn du sie auf der Liste abhakst und übernimmst.</div>
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
                {p.recipeId && RECIPE_MAP[p.recipeId] && (
                  <a className="btn btn-sm btn-ghost" href={href(`/rezepte/${p.recipeId}`)}>
                    Rezept
                  </a>
                )}
                <ConfirmButton onConfirm={() => store.remove('pantry', p.id)} />
              </div>
            ))}
          </div>
        )}
        <div className="muted tiny" style={{ marginTop: 10 }}>
          Gekochte Reste möglichst innerhalb von 1–2 Tagen essen.
        </div>
      </Card>
    </div>
  )
}

function BudgetTab({ weekStart }: { weekStart: string }) {
  const store = useStore()
  const { data, settings } = store
  const { toast } = useToast()
  const shopping = useShoppingWeek(weekStart)
  const savings = useMemo(() => savingsSuggestions(shopping, data.mealPlan, settings, data.pantry), [shopping, data.mealPlan, settings, data.pantry])
  const b = settings.budget
  return (
    <div className="grid grid-3" style={{ alignItems: 'start' }}>
      <Card index={0} marble className="span-2">
        <div className="eyebrow">Geplanter Wocheneinkauf im Budget</div>
        <div className="row" style={{ alignItems: 'baseline', gap: 14, margin: '10px 0 16px', flexWrap: 'wrap' }}>
          <span className="budget-big">{euro(shopping.budgetCash)}</span>
          <span className={`badge ${shopping.status === 'ueber' ? 'badge-warn' : 'badge-neon'}`}>
            {shopping.status === 'ueber' ? `${euro(shopping.budgetCash - b.max)} über ${b.max} €` : shopping.status === 'unter' ? `unter ${b.min} €` : 'im Rahmen'}
          </span>
        </div>
        <Bar value={shopping.budgetCash} max={b.max} marker={b.min} size="thick" variant={shopping.status === 'ueber' ? 'warn' : undefined} />
        <div className="grid grid-3" style={{ marginTop: 18 }}>
          <div className="kpi">
            <span className="eyebrow">Mittagessen Mo–Fr</span>
            <span className="stat-value" style={{ fontSize: 22 }}>
              {euro(shopping.lunchCash)}
            </span>
            <span className="stat-sub">Verbrauch {euro(shopping.lunchUsed)}</span>
          </div>
          <div className="kpi">
            <span className="eyebrow">Spaßgetränke</span>
            <span className="stat-value" style={{ fontSize: 22 }}>
              {euro(shopping.drinksCash)}
            </span>
            <span className="stat-sub">{shopping.drinks.map((d) => d.name).join(', ')}</span>
          </div>
          <div className="kpi">
            <span className="eyebrow">CO₂</span>
            <span className="stat-value" style={{ fontSize: 22 }}>
              {euro(shopping.co2)}
            </span>
            <span className="stat-sub">{shopping.co2 ? 'Kartusche diese Woche' : 'nicht nötig'}</span>
          </div>
        </div>
        <div className="muted tiny" style={{ marginTop: 14 }}>
          Nicht im Budget: Wochenende, Essen bei den Eltern, Vorhandenes, Brot/Belag, SodaStream-Wasser ohne neue Kartusche, Kreatin, Proteinpulver und spontane Uni-Snacks. Der Kassenpreis rechnet volle Packungen, Reste wandern in den Vorrat.
        </div>
      </Card>

      <Card index={1}>
        <CardHead eyebrow="Mittagessen" title="Diese Woche" />
        <div className="list">
          {shopping.lunchDays.map((d) => (
            <div className="list-item" key={d.date}>
              <div className="grow">
                <div className="title">{d.label}</div>
                <div className="meta">
                  {d.recipeId ? `${RECIPE_MAP[d.recipeId]?.name}${d.leftover ? ' (Rest)' : ''}` : d.mondayLeftovers ? 'Reste vom Wochenende' : 'noch nicht geplant'}
                </div>
              </div>
            </div>
          ))}
        </div>
        <a className="btn btn-sm" href={href(`/rezepte?tab=plan&woche=${weekStart}`)} style={{ marginTop: 10 }}>
          Plan bearbeiten
        </a>
      </Card>

      <Card index={2} className="span-all">
        <CardHead eyebrow="Einsparmöglichkeiten" title={shopping.status === 'ueber' ? 'So kommst du unter 20 €' : 'Budget passt'} action={<PiggyBank size={18} color="var(--ink-3)" />} />
        {shopping.status !== 'ueber' ? (
          <div className="muted small">Der geplante Einkauf liegt im Rahmen. Sparvorschläge erscheinen, sobald die Summe über {b.max} € steigt.</div>
        ) : (
          <div className="stack">
            {savings.map((s) => (
              <div key={s.id} className="suggestion">
                <div className="grow">
                  <div className="small">
                    {s.text}
                    {s.amount > 0 && <strong className="ok-text"> · spart ca. {euro(s.amount)}</strong>}
                  </div>
                  {s.swap && (
                    <div className="suggestion-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={async () => {
                          await applySuggestion(store, `budget-${s.id}`, { type: 'swapMeal', planId: s.swap!.planId, recipeId: s.swap!.recipeId })
                          toast('Rezept getauscht, Liste angepasst')
                        }}
                      >
                        Übernehmen
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <Notice>Die Preise sind grobe Schätzwerte, keine aktuellen Supermarktpreise. Trage deine echten Kassenpreise unter Einstellungen → Preise ein, dann wird die Rechnung genauer.</Notice>
      </Card>
    </div>
  )
}
