import { Clock, Dumbbell, PiggyBank, Search, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card, PageHead, Seg, Tabs, type HeadStat } from '../components/ui'
import { RECIPE_CATEGORIES, RECIPE_CATEGORY_LABEL, RECIPE_MAP, RECIPES } from '../data/recipes'
import { allRecipeSummaries } from '../domain/recipes'
import { euro, num } from '../lib/format'
import { href, navigate, type Route } from '../state/router'
import { useStore } from '../state/store'
import type { RecipeCategory } from '../types'
import { FoodDatabase } from './recipes/FoodDatabase'
import { MealPlanView } from './recipes/MealPlanView'
import { RecipeDetail } from './recipes/RecipeDetail'

type Tab = 'rezepte' | 'einkauf' | 'lebensmittel'
type Sort = 'protein' | 'kcal' | 'dichte' | 'kosten' | 'zeit' | 'name'

/** Ab dieser Menge gilt ein Rezept als proteinreich. */
const HIGH_PROTEIN = 40
/** Bis zu diesem Betrag (Zutaten zum Einkaufen pro Portion) gilt ein Rezept als günstig. */
const CHEAP = 2

type Summary = ReturnType<typeof allRecipeSummaries>[number]
type Focus = 'eiweiss' | 'kalorien' | 'beides' | 'alle'

/** Rezept-Tabs: Eiweiß fürs Mittagessen, Kalorien fürs Abendessen, Beides als beste Mischung. */
const FOCUS: Record<Focus, { label: string; sort: Sort; hint: string; match: (s: Summary) => boolean }> = {
  eiweiss: {
    label: 'Eiweiß',
    sort: 'protein',
    hint: 'Viel Eiweiß, eher leicht. Gut fürs Mittagessen.',
    match: (s) => s.recipe.category === 'protein-kreationen' || s.recipe.category === 'protein-guenstig',
  },
  kalorien: {
    label: 'Kalorien',
    sort: 'kcal',
    hint: 'Viele Kalorien, macht weniger satt. Gut fürs Abendessen.',
    match: (s) => s.recipe.category === 'kalorien-booster',
  },
  beides: {
    label: 'Beides',
    sort: 'kcal',
    hint: 'Mindestens 700 kcal und 40 g Eiweiß in einer Portion.',
    match: (s) => s.kcal >= 700 && s.protein >= HIGH_PROTEIN,
  },
  alle: { label: 'Alle', sort: 'protein', hint: '', match: () => true },
}

export default function Recipes({ route }: { route: Route }) {
  const id = route.segments[1]
  const { settings } = useStore()
  const summaries = useMemo(() => allRecipeSummaries(settings), [settings])
  if (id && RECIPE_MAP[id]) return <RecipeDetail recipe={RECIPE_MAP[id]} />
  const raw = route.query.get('tab')
  // „plan“ war der frühere Name des Einkauf-Tabs
  const tab: Tab = raw === 'plan' || raw === 'einkauf' ? 'einkauf' : raw === 'lebensmittel' ? 'lebensmittel' : 'rezepte'
  const allowed = summaries.filter((s) => s.allowed)
  const stats: HeadStat[] = [
    { label: 'Eiweiß', value: allowed.filter(FOCUS.eiweiss.match).length },
    { label: 'Kalorien', value: allowed.filter(FOCUS.kalorien.match).length, accent: true },
    { label: 'Beides', value: allowed.filter(FOCUS.beides.match).length },
  ]
  const head: Record<Tab, { eyebrow: string; title: string }> = {
    rezepte: { eyebrow: `${RECIPES.length} Rezepte`, title: 'Rezepte' },
    einkauf: { eyebrow: 'Mittagessen der Woche', title: 'Einkauf' },
    lebensmittel: { eyebrow: 'Datenbank & Vorlieben', title: 'Lebensmittel' },
  }
  return (
    <div className="page">
      <PageHead eyebrow={head[tab].eyebrow} title={head[tab].title} stats={tab === 'rezepte' ? stats : undefined} />
      {tab === 'rezepte' && <RecipeList summaries={summaries} route={route} />}
      {tab === 'einkauf' && <MealPlanView route={route} />}
      {tab === 'lebensmittel' && <FoodDatabase />}
    </div>
  )
}

function RecipeList({ summaries, route }: { summaries: Summary[]; route: Route }) {
  const store = useStore()
  const { settings } = store
  const fq = route.query.get('fokus')
  const focus: Focus = fq === 'eiweiss' || fq === 'kalorien' || fq === 'beides' ? fq : 'alle'
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<RecipeCategory | 'alle'>('alle')
  const [favOnly, setFavOnly] = useState(false)
  const [highProtein, setHighProtein] = useState(false)
  const [cheap, setCheap] = useState(false)
  const [time, setTime] = useState<'alle' | '10' | '15'>('alle')
  const [sortChoice, setSort] = useState<{ focus: Focus; sort: Sort }>()
  // Jeder Tab hat seine eigene Vorsortierung, bis du selbst umsortierst
  const sort = sortChoice && sortChoice.focus === focus ? sortChoice.sort : FOCUS[focus].sort
  const list = useMemo(() => {
    const query = q.trim().toLowerCase()
    return summaries
      .filter((s) => s.allowed)
      .filter(FOCUS[focus].match)
      .filter((s) => focus !== 'alle' || cat === 'alle' || s.recipe.category === cat)
      .filter((s) => !favOnly || settings.favorites.includes(s.recipe.id))
      .filter((s) => !highProtein || s.protein >= HIGH_PROTEIN)
      .filter((s) => !cheap || s.cost.shopping <= CHEAP)
      .filter((s) => time === 'alle' || s.recipe.minutes <= Number(time))
      .filter((s) => !query || s.recipe.name.toLowerCase().includes(query) || s.calc.lines.some((l) => l.included && l.food.name.toLowerCase().includes(query)))
      .sort((a, b) => {
        if (sort === 'protein') return b.protein - a.protein
        if (sort === 'kcal') return b.kcal - a.kcal
        if (sort === 'dichte') return b.protein / Math.max(b.kcal, 1) - a.protein / Math.max(a.kcal, 1)
        if (sort === 'kosten') return a.cost.shopping - b.cost.shopping
        if (sort === 'zeit') return a.recipe.minutes - b.recipe.minutes
        return a.recipe.name.localeCompare(b.recipe.name)
      })
  }, [summaries, focus, q, cat, favOnly, highProtein, cheap, time, sort, settings.favorites])
  const blocked = summaries.filter((s) => !s.allowed).length

  const toggleFav = (id: string) =>
    store.updateSettings((s) => ({ ...s, favorites: s.favorites.includes(id) ? s.favorites.filter((x) => x !== id) : [...s.favorites, id] }))

  return (
    <>
      <Tabs
        value={focus}
        onChange={(f) => navigate(f === 'alle' ? '/rezepte' : `/rezepte?fokus=${f}`)}
        options={(['eiweiss', 'kalorien', 'beides', 'alle'] as Focus[]).map((f) => ({
          value: f,
          label: f === 'alle' ? FOCUS[f].label : `${FOCUS[f].label} (${summaries.filter((s) => s.allowed && FOCUS[f].match(s)).length})`,
        }))}
      />
      {FOCUS[focus].hint && <div className="muted small" style={{ margin: '-6px 0 14px' }}>{FOCUS[focus].hint}</div>}
      <div className="filters">
        <div className="input-group">
          <input className="input" placeholder="Rezept oder Zutat suchen …" value={q} onChange={(e) => setQ(e.target.value)} />
          <span className="input-suffix">
            <Search size={16} />
          </span>
        </div>
        <Seg value={time} onChange={setTime} options={[{ value: 'alle', label: 'Alle Zeiten' }, { value: '10', label: '≤ 10 min' }, { value: '15', label: '≤ 15 min' }]} />
        <Seg
          value={sort}
          onChange={(v) => setSort({ focus, sort: v })}
          options={[
            { value: 'protein', label: 'Protein' },
            { value: 'kcal', label: 'Kalorien' },
            { value: 'dichte', label: 'Protein/kcal' },
            { value: 'kosten', label: 'Preis' },
            { value: 'zeit', label: 'Zeit' },
            { value: 'name', label: 'A–Z' },
          ]}
        />
        <button type="button" className="chip" aria-pressed={highProtein} onClick={() => setHighProtein(!highProtein)}>
          <Dumbbell size={14} /> Ab {HIGH_PROTEIN} g Protein
        </button>
        <button type="button" className="chip" aria-pressed={cheap} onClick={() => setCheap(!cheap)}>
          <PiggyBank size={14} /> Bis {CHEAP} €
        </button>
        <button type="button" className="chip" aria-pressed={favOnly} onClick={() => setFavOnly(!favOnly)}>
          <Star size={14} /> Favoriten
        </button>
      </div>
      {focus === 'alle' && (
        <div className="row-wrap" style={{ marginBottom: 18 }}>
          <button type="button" className="chip" aria-pressed={cat === 'alle'} onClick={() => setCat('alle')}>
            Alle ({summaries.filter((s) => s.allowed).length})
          </button>
          {RECIPE_CATEGORIES.map((c) => (
            <button key={c.id} type="button" className="chip" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
              {c.label} ({summaries.filter((s) => s.allowed && s.recipe.category === c.id).length})
            </button>
          ))}
        </div>
      )}
      {blocked > 0 && <div className="muted small" style={{ marginBottom: 12 }}>{blocked} Rezept(e) ausgeblendet, weil sie Zutaten enthalten, die du ausgeschlossen hast.</div>}
      <div className="grid grid-auto">
        {list.map((s, i) => (
          <Card key={s.recipe.id} index={Math.min(i, 12)} className="hoverable recipe-card" as="article">
            <div className="row-between" style={{ alignItems: 'flex-start' }}>
              <span className="badge badge-outline">{RECIPE_CATEGORY_LABEL[s.recipe.category]}</span>
              <button
                type="button"
                className="fav-btn"
                aria-pressed={settings.favorites.includes(s.recipe.id)}
                aria-label="Favorit"
                onClick={() => toggleFav(s.recipe.id)}
              >
                <Star size={17} fill={settings.favorites.includes(s.recipe.id) ? 'currentColor' : 'none'} />
              </button>
            </div>
            <a href={href(`/rezepte/${s.recipe.id}`)} className="title" style={{ textDecoration: 'none' }}>
              {s.recipe.name}
            </a>
            <div className="recipe-stats">
              <span>
                <strong>{num(s.kcal)}</strong> kcal
              </span>
              <span className={s.protein >= HIGH_PROTEIN ? 'neon-text' : undefined}>
                <strong>{num(s.protein)} g</strong> Protein
              </span>
              <span className="row" style={{ gap: 4 }}>
                <Clock size={13} /> <strong>{s.recipe.minutes}</strong> min
              </span>
              <span>
                <strong>{euro(s.cost.shopping)}</strong>
              </span>
            </div>
          </Card>
        ))}
      </div>
      {list.length === 0 && <div className="empty">Keine Rezepte für diese Filter.</div>}
    </>
  )
}
