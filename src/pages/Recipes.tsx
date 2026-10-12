import { Clock, Search, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card, PageHead, Seg } from '../components/ui'
import { RECIPE_CATEGORIES, RECIPE_CATEGORY_LABEL, RECIPE_MAP } from '../data/recipes'
import { allRecipeSummaries } from '../domain/recipes'
import { euro, num } from '../lib/format'
import { href, type Route } from '../state/router'
import { useStore } from '../state/store'
import type { RecipeCategory } from '../types'
import { FoodDatabase } from './recipes/FoodDatabase'
import { MealPlanView } from './recipes/MealPlanView'
import { RecipeDetail } from './recipes/RecipeDetail'

type Tab = 'rezepte' | 'plan' | 'lebensmittel'
type Sort = 'protein' | 'kosten' | 'zeit' | 'name'

export default function Recipes({ route }: { route: Route }) {
  const id = route.segments[1]
  if (id && RECIPE_MAP[id]) return <RecipeDetail recipe={RECIPE_MAP[id]} />
  const tab = (route.query.get('tab') as Tab) ?? 'rezepte'
  const head: Record<Tab, { eyebrow: string; title: string; lead: string }> = {
    rezepte: {
      eyebrow: '100 Rezepte',
      title: 'Rezepte',
      lead: 'Alltagstaugliche Rezepte ohne deine Ausschlüsse, meist in 5–15 Minuten. Standard ist eine Portion, zwei sind mit einem Klick möglich.',
    },
    plan: {
      eyebrow: 'Mittagessen Mo–Fr',
      title: 'Wochenplan',
      lead: 'Plane die Mittagessen der Woche. Die Einkaufsliste und das Budget passen sich automatisch an.',
    },
    lebensmittel: {
      eyebrow: 'Datenbank & Vorlieben',
      title: 'Lebensmittel & Ausschlüsse',
      lead: 'Alle Lebensmittel mit Nährwerten und Schätzpreisen, dazu deine Ausschlüsse und freigegebenes Gemüse.',
    },
  }
  return (
    <div className="page">
      <PageHead eyebrow={head[tab].eyebrow} title={head[tab].title} lead={head[tab].lead} />
      {tab === 'rezepte' && <RecipeList />}
      {tab === 'plan' && <MealPlanView route={route} />}
      {tab === 'lebensmittel' && <FoodDatabase />}
    </div>
  )
}

function RecipeList() {
  const store = useStore()
  const { settings } = store
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<RecipeCategory | 'alle'>('alle')
  const [favOnly, setFavOnly] = useState(false)
  const [time, setTime] = useState<'alle' | '10' | '15'>('alle')
  const [sort, setSort] = useState<Sort>('protein')
  const summaries = useMemo(() => allRecipeSummaries(settings), [settings])
  const list = useMemo(() => {
    const query = q.trim().toLowerCase()
    return summaries
      .filter((s) => s.allowed)
      .filter((s) => cat === 'alle' || s.recipe.category === cat)
      .filter((s) => !favOnly || settings.favorites.includes(s.recipe.id))
      .filter((s) => time === 'alle' || s.recipe.minutes <= Number(time))
      .filter((s) => !query || s.recipe.name.toLowerCase().includes(query) || s.calc.lines.some((l) => l.included && l.food.name.toLowerCase().includes(query)))
      .sort((a, b) => {
        if (sort === 'protein') return b.protein - a.protein
        if (sort === 'kosten') return a.cost.shopping - b.cost.shopping
        if (sort === 'zeit') return a.recipe.minutes - b.recipe.minutes
        return a.recipe.name.localeCompare(b.recipe.name)
      })
  }, [summaries, q, cat, favOnly, time, sort, settings.favorites])
  const blocked = summaries.filter((s) => !s.allowed).length

  const toggleFav = (id: string) =>
    store.updateSettings((s) => ({ ...s, favorites: s.favorites.includes(id) ? s.favorites.filter((x) => x !== id) : [...s.favorites, id] }))

  return (
    <>
      <div className="filters">
        <div className="input-group">
          <input className="input" placeholder="Rezept oder Zutat suchen …" value={q} onChange={(e) => setQ(e.target.value)} />
          <span className="input-suffix">
            <Search size={16} />
          </span>
        </div>
        <Seg value={time} onChange={setTime} options={[{ value: 'alle', label: 'Alle Zeiten' }, { value: '10', label: '≤ 10 min' }, { value: '15', label: '≤ 15 min' }]} />
        <Seg value={sort} onChange={setSort} options={[{ value: 'protein', label: 'Protein' }, { value: 'kosten', label: 'Preis' }, { value: 'zeit', label: 'Zeit' }, { value: 'name', label: 'A–Z' }]} />
        <button type="button" className="chip" aria-pressed={favOnly} onClick={() => setFavOnly(!favOnly)}>
          <Star size={14} /> Favoriten
        </button>
      </div>
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
              <span>
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
