import { ExternalLink, Lightbulb } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useToday } from '../components/hooks'
import { NutrientRows } from '../components/NutrientRows'
import { Card, CardHead, Disclosure, Notice, PageHead, Seg } from '../components/ui'
import { FLUID_DGE_ML, NUTRIENT_META, NUTRIENTS, referenceFor } from '../data/nutrients'
import { foodIdeas, recipeIdeas } from '../domain/ideas'
import { analyzeRange, dayTotals } from '../domain/nutrition'
import { formatDate } from '../lib/date'
import { ml, num } from '../lib/format'
import { href } from '../state/router'
import { useStore } from '../state/store'
import type { NutrientKey } from '../types'

const GROUPS: { title: string; eyebrow: string; keys: NutrientKey[] }[] = [
  { eyebrow: 'Energie', title: 'Makronährstoffe', keys: ['kcal', 'protein', 'carbs', 'sugar', 'fat', 'satFat', 'fiber'] },
  { eyebrow: 'Vitamine', title: 'Vitamine', keys: ['vitA', 'b1', 'b2', 'b3', 'b5', 'b6', 'biotin', 'folate', 'b12', 'vitC', 'vitD', 'vitE', 'vitK'] },
  { eyebrow: 'Mineralstoffe', title: 'Mineralstoffe & Spurenelemente', keys: ['calcium', 'magnesium', 'potassium', 'iron', 'zinc', 'iodine', 'selenium', 'phosphorus', 'copper', 'sodium'] },
  { eyebrow: 'Fettsäuren', title: 'Omega-3 & Co.', keys: ['omega3', 'epaDha', 'ala'] },
]

const IDEA_KEYS: NutrientKey[] = ['protein', 'fiber', 'vitC', 'calcium', 'magnesium', 'potassium', 'iron', 'zinc', 'iodine', 'folate', 'epaDha', 'vitD', 'b12', 'vitA', 'vitE', 'vitK', 'selenium']

export default function Nutrients() {
  const { data, settings } = useStore()
  const today = useToday()
  const [mode, setMode] = useState<'heute' | 'woche'>('woche')
  const range = useMemo(() => analyzeRange(data, today, 7), [data, today])
  const day = useMemo(() => dayTotals(data, today), [data, today])

  const values = (k: NutrientKey) =>
    mode === 'heute' ? { value: day.profile.values[k], partial: day.profile.partial.includes(k) } : { value: range.averages[k].value, partial: range.averages[k].partial }

  const lows = IDEA_KEYS.map((k) => {
    const ref = referenceFor(k, settings)
    const v = values(k).value
    return { k, share: ref && v !== undefined ? v / ref : undefined }
  })
    .filter((x) => x.share !== undefined && x.share < (mode === 'heute' ? 1 : 0.75))
    .sort((a, b) => (a.share ?? 0) - (b.share ?? 0))
    .slice(0, 6)

  const fluid = mode === 'heute' ? day.fluidMl : range.avgFluid

  return (
    <div className="page">
      <PageHead
        eyebrow="Referenzwerte DGE/ÖGE · Männer 19 bis unter 25 Jahre"
        title="Nährstoffe & Mikronährstoffe"
        lead="Bei Vitaminen und Mineralstoffen zählt das Muster über mehrere Tage. Ein einzelner Tag unter dem Referenzwert ist normal und keine Diagnose."
        actions={<Seg value={mode} onChange={setMode} options={[{ value: 'heute', label: 'Heute' }, { value: 'woche', label: '7-Tage-Schnitt' }]} />}
      />

      {mode === 'woche' && (
        <div style={{ marginBottom: 18 }}>
          <Notice kind={range.provisional ? 'warn' : undefined}>
            {range.usedDays.length === 0
              ? 'In den letzten 7 Tagen gibt es keine Einträge.'
              : range.provisional
                ? `Vorläufig: Keiner der letzten 7 Tage ist als vollständig markiert. Der Schnitt nutzt die ${range.usedDays.length} Tage mit Einträgen und liegt wahrscheinlich zu niedrig.`
                : `Durchschnitt aus ${range.usedDays.length} vollständig erfassten Tagen (${range.usedDays.map((d) => formatDate(d.date)).join(', ')}). Tage ohne Einträge zählen nicht als Nullkonsum.`}
          </Notice>
        </div>
      )}

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="stack-lg">
          {GROUPS.map((g, i) => (
            <Card key={g.title} index={i}>
              <CardHead eyebrow={g.eyebrow} title={g.title} />
              <NutrientRows keys={g.keys} values={values} />
              {g.title === 'Omega-3 & Co.' && (
                <div className="meter-row">
                  <div className="meter-label">Flüssigkeit (Getränke)</div>
                  <div className="muted small">Orientierung DGE {ml(FLUID_DGE_ML)}, dein Ziel {ml(settings.targets.fluidMl)}</div>
                  <div className="meter-value">{fluid !== undefined ? ml(fluid) : 'keine Daten'}</div>
                </div>
              )}
            </Card>
          ))}
        </div>

        <div className="stack-lg">
          <Card index={1} marble>
            <CardHead eyebrow="Konkrete Vorschläge" title={lows.length ? 'Was du ergänzen könntest' : 'Alles im grünen Bereich'} action={<Lightbulb size={18} color="var(--neon-ink)" />} />
            {lows.length === 0 ? (
              <div className="muted small">{range.usedDays.length || day.entryCount ? 'Für die erfassten Werte gibt es gerade keine auffälligen Lücken.' : 'Trage zuerst Mahlzeiten ein, dann kommen hier Vorschläge.'}</div>
            ) : (
              <div className="stack">
                {lows.map(({ k, share }) => {
                  const foods = foodIdeas(k, settings, data.products, 3)
                  const recipes = recipeIdeas(k, settings, { limit: 2 })
                  return (
                    <div key={k} className="stack-sm" style={{ paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
                      <div className="row-between">
                        <strong>{NUTRIENT_META[k].label}</strong>
                        <span className="badge badge-warn">{Math.round((share ?? 0) * 100)} %</span>
                      </div>
                      {k === 'vitD' && <div className="muted tiny">Vitamin D bildet vor allem die Haut bei Sonnenlicht. Über Essen ist der Schätzwert kaum erreichbar.</div>}
                      {foods.length > 0 && (
                        <div className="small">
                          {foods.map((f) => `${f.label} (${f.amountLabel}: ${num(f.value, NUTRIENT_META[k].decimals)} ${NUTRIENT_META[k].unit})`).join(' · ')}
                        </div>
                      )}
                      {recipes.length > 0 && (
                        <div className="row-wrap">
                          {recipes.map((r) => (
                            <a key={r.recipe.id} className="chip" href={href(`/rezepte/${r.recipe.id}`)} style={{ textDecoration: 'none' }}>
                              {r.recipe.name}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            <div className="muted tiny" style={{ marginTop: 12 }}>
              Die App empfiehlt keine Nahrungsergänzungsmittel, nur weil ein geschätzter Wert niedrig ist. Bei Fragen zu Mängeln bitte ärztlich abklären lassen.
            </div>
          </Card>

          <Card index={2}>
            <Disclosure title="Referenzwerte & Quellen">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nährstoff</th>
                      <th className="num">Wert / Tag</th>
                      <th>Art</th>
                    </tr>
                  </thead>
                  <tbody>
                    {NUTRIENTS.map((n) => {
                      const ref = referenceFor(n.key, settings)
                      return (
                        <tr key={n.key}>
                          <td>
                            {n.label}
                            {n.refNote && <div className="muted tiny">{n.refNote}</div>}
                          </td>
                          <td className="num">{ref !== undefined ? `${num(ref, n.decimals)} ${n.unit}` : '–'}</td>
                          <td className="muted small">{n.refKind ?? '–'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <a className="btn btn-sm" href="https://www.dge.de/wissenschaft/referenzwerte-tool/" target="_blank" rel="noopener noreferrer" style={{ marginTop: 10 }}>
                <ExternalLink size={14} /> DGE-Referenzwerte-Tool
              </a>
              <div className="muted tiny" style={{ marginTop: 8 }}>
                Abgeglichen mit den DGE-Einzelseiten (3. Auflage 2025), Stand 12.10.2026. Kalorien, Protein, Fett, Kohlenhydrate und Ballaststoffe sind deine persönlichen Ziele aus den Einstellungen.
              </div>
            </Disclosure>
          </Card>
        </div>
      </div>
    </div>
  )
}
