import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card, CardHead, Notice } from '../../components/ui'
import { EXCLUDED_TAG_LABEL } from '../../data/defaults'
import { FOOD_CATEGORY_LABEL, FOODS } from '../../data/foods'
import { foodStatus } from '../../domain/preferences'
import { packOf } from '../../domain/recipes'
import { euro, num } from '../../lib/format'
import { href } from '../../state/router'
import { useStore } from '../../state/store'
import type { Food } from '../../types'

export function FoodDatabase() {
  const store = useStore()
  const { settings } = store
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<Food['category'] | 'alle'>('alle')
  const optionalVeg = FOODS.filter((f) => f.pref === 'optional')
  const list = useMemo(() => {
    const query = q.trim().toLowerCase()
    return FOODS.filter((f) => (cat === 'alle' ? true : f.category === cat)).filter((f) => !query || f.name.toLowerCase().includes(query))
  }, [q, cat])

  const toggleAccepted = (id: string) =>
    store.updateSettings((s) => ({
      ...s,
      food: { ...s.food, acceptedOptional: s.food.acceptedOptional.includes(id) ? s.food.acceptedOptional.filter((x) => x !== id) : [...s.food.acceptedOptional, id] },
    }))

  return (
    <div className="stack-lg">
      <div className="grid grid-2">
        <Card index={0}>
          <CardHead eyebrow="Nie in Standardrezepten" title="Deine Ausschlüsse" />
          <div className="row-wrap">
            {settings.food.excludedTags.map((t) => (
              <span key={t} className="badge badge-danger">
                {EXCLUDED_TAG_LABEL[t]}
              </span>
            ))}
            {settings.food.avoidTags.map((t) => (
              <span key={t} className="badge badge-warn">
                {EXCLUDED_TAG_LABEL[t]} (vermieden)
              </span>
            ))}
          </div>
          <div className="muted small" style={{ marginTop: 12 }}>
            Roher Spinat ist erlaubt. Bratkartoffeln gibt es gelegentlich. Fertigpizza gilt trotz Tomatensoße als Ausnahme, weil du sie gern isst. Ändern unter <a href={href('/einstellungen?tab=lebensmittel')}>Einstellungen → Lebensmittel</a>.
          </div>
        </Card>
        <Card index={1}>
          <CardHead eyebrow="Vorsichtig eingeplant" title="Optionales Gemüse" />
          <div className="muted small" style={{ marginBottom: 10 }}>
            Diese Sorten stehen in Rezepten nur als optionale Zutat. Freigegebenes Gemüse wird fest eingerechnet und auch für Vitamin-C-Vorschläge genutzt.
          </div>
          <div className="row-wrap">
            {optionalVeg.map((f) => (
              <button key={f.id} type="button" className="chip" aria-pressed={settings.food.acceptedOptional.includes(f.id)} onClick={() => toggleAccepted(f.id)}>
                {f.name}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card index={2}>
        <CardHead eyebrow={`${FOODS.length} Lebensmittel`} title="Lebensmitteldatenbank" />
        <div className="filters">
          <div className="input-group">
            <input className="input" placeholder="Suchen …" value={q} onChange={(e) => setQ(e.target.value)} />
            <span className="input-suffix">
              <Search size={16} />
            </span>
          </div>
          <select className="select" style={{ width: 'auto' }} value={cat} onChange={(e) => setCat(e.target.value as Food['category'] | 'alle')}>
            <option value="alle">Alle Kategorien</option>
            {Object.entries(FOOD_CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Lebensmittel</th>
                <th className="num">kcal</th>
                <th className="num">Protein</th>
                <th className="num">KH</th>
                <th className="num">Fett</th>
                <th className="num">Ballastst.</th>
                <th className="num">Packung (Schätzpreis)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((f) => {
                const st = foodStatus(f, settings)
                const pack = packOf(f, settings)
                return (
                  <tr key={f.id}>
                    <td>
                      <div className="strong">{f.name}</div>
                      <div className="muted tiny">
                        pro 100 {f.unit}
                        {f.labelEstimate ? ' · Produktschätzung' : ''}
                        {f.staple ? ' · Brot & Belag (immer da)' : ''}
                        {f.basic ? ' · Grundvorrat' : ''}
                      </div>
                    </td>
                    <td className="num">{f.per100.kcal !== undefined ? num(f.per100.kcal) : '–'}</td>
                    <td className="num">{f.per100.protein !== undefined ? num(f.per100.protein, 1) : '–'}</td>
                    <td className="num">{f.per100.carbs !== undefined ? num(f.per100.carbs, 1) : '–'}</td>
                    <td className="num">{f.per100.fat !== undefined ? num(f.per100.fat, 1) : '–'}</td>
                    <td className="num">{f.per100.fiber !== undefined ? num(f.per100.fiber, 1) : '–'}</td>
                    <td className="num">{pack ? `${pack.label} · ${euro(pack.price)}` : '–'}</td>
                    <td>
                      {st.kind === 'ok' && <span className="badge badge-neon">erlaubt</span>}
                      {st.kind === 'optional' && <span className="badge">optional</span>}
                      {st.kind === 'exception' && <span className="badge badge-neon">Ausnahme</span>}
                      {(st.kind === 'excluded' || st.kind === 'removed') && <span className="badge badge-danger">ausgeschlossen</span>}
                      {st.kind === 'avoided' && <span className="badge badge-warn">vermieden</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <Notice>
        Nährwerte sind gerundete Durchschnittswerte aus Nährwerttabellen (angelehnt an USDA FoodData Central und übliche deutsche Etiketten), Kohlenhydrate ohne Ballaststoffe wie auf EU-Etiketten. Fehlende Werte sind „keine Daten“ und werden nie als 0 gezählt. Preise sind grobe Schätzungen, keine aktuellen Supermarktpreise.
      </Notice>
    </div>
  )
}
