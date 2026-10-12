import { Search, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { RECIPE_CATEGORIES, RECIPES } from '../data/recipes'
import { recipeProfile } from '../domain/nutrition'
import { checkRecipe } from '../domain/preferences'
import { recipeCost } from '../domain/recipes'
import { euro, num } from '../lib/format'
import { useStore } from '../state/store'
import type { MealSlot, RecipeCategory } from '../types'
import { Modal } from './ui'

export function RecipePicker({ onPick, onClose, slot, title = 'Rezept wählen' }: { onPick: (id: string) => void; onClose: () => void; slot?: MealSlot; title?: string }) {
  const { settings } = useStore()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<RecipeCategory | 'alle'>('alle')
  const list = useMemo(() => {
    const query = q.trim().toLowerCase()
    return RECIPES.filter((r) => checkRecipe(r, settings).allowed)
      .filter((r) => (cat === 'alle' ? true : r.category === cat))
      .filter((r) => (!slot ? true : r.meals.includes(slot)))
      .filter((r) => !query || r.name.toLowerCase().includes(query))
      .map((r) => ({ r, p: recipeProfile(r, settings).profile.values, cost: recipeCost(r, settings).shopping, fav: settings.favorites.includes(r.id) }))
      .sort((a, b) => Number(b.fav) - Number(a.fav) || (b.p.protein ?? 0) - (a.p.protein ?? 0))
  }, [q, cat, slot, settings])
  return (
    <Modal title={title} onClose={onClose} wide>
      <div className="stack">
        <div className="input-group">
          <input className="input" placeholder="Suchen …" value={q} onChange={(e) => setQ(e.target.value)} />
          <span className="input-suffix">
            <Search size={16} />
          </span>
        </div>
        <div className="row-wrap">
          <button type="button" className="chip" aria-pressed={cat === 'alle'} onClick={() => setCat('alle')}>
            Alle
          </button>
          {RECIPE_CATEGORIES.map((c) => (
            <button key={c.id} type="button" className="chip" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="list">
          {list.map(({ r, p, cost, fav }) => (
            <button
              key={r.id}
              type="button"
              className="list-item"
              style={{ border: 0, borderTop: '1px solid var(--line)', background: 'none', textAlign: 'left', cursor: 'pointer' }}
              onClick={() => onPick(r.id)}
            >
              {fav ? <Star size={15} fill="#17d861" color="#17d861" /> : <span style={{ width: 15 }} />}
              <span className="grow">
                <span className="title" style={{ display: 'block' }}>
                  {r.name}
                </span>
                <span className="meta">
                  {num(p.kcal ?? 0)} kcal · {num(p.protein ?? 0)} g Protein · {r.minutes} min · {euro(cost)}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
