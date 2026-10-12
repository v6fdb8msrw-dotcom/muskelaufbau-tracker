import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, CircleDashed, Dumbbell, Lightbulb, ShoppingBasket, Target } from 'lucide-react'
import { useMemo } from 'react'
import { BarChart } from '../components/charts'
import { useToday } from '../components/hooks'
import { Card, CardHead, PageHead } from '../components/ui'
import { SESSION_MAP } from '../data/plan'
import { buildWeeklyReport, type Suggestion } from '../domain/weekly'
import { addDays, formatDate, relativeDay, startOfWeek, WEEKDAY_SHORT } from '../lib/date'
import { euro, num } from '../lib/format'
import { applySuggestion, ignoreSuggestion } from '../state/actions'
import { href, navigate, type Route } from '../state/router'
import { useStore } from '../state/store'
import { useToast } from '../state/toast'

const AREA_ICON = {
  ernaehrung: <Lightbulb size={18} />,
  training: <Dumbbell size={18} />,
  gewicht: <Target size={18} />,
  einkauf: <ShoppingBasket size={18} />,
  arme: <Dumbbell size={18} />,
}

export default function Weekly({ route }: { route: Route }) {
  const store = useStore()
  const { data, settings } = store
  const { toast } = useToast()
  const today = useToday()
  const weekStart = route.query.get('woche') ?? startOfWeek(today)
  const report = useMemo(() => buildWeeklyReport(data, settings, weekStart, today), [data, settings, weekStart, today])
  const states = new Map(data.suggestions.map((s) => [s.id, s.status]))
  const openSuggestions = report.suggestions.filter((s) => !states.has(s.id))
  const resolved = report.suggestions.filter((s) => states.has(s.id))
  const go = (w: string) => navigate(w === startOfWeek(today) ? '/woche' : `/woche?woche=${w}`)

  async function accept(s: Suggestion) {
    await applySuggestion(store, s.id, s.action)
    toast('Übernommen')
  }

  return (
    <div className="page">
      <PageHead
        eyebrow={report.programWeek >= 1 ? `Programmwoche ${report.programWeek} · ${formatDate(report.weekStart)} – ${formatDate(report.weekEnd)}` : `${formatDate(report.weekStart)} – ${formatDate(report.weekEnd)}`}
        title="Wochenkorrektur"
        lead="Was läuft gut, was ist offen, und was du in den restlichen Tagen sinnvoll ergänzen kannst. Jeder Vorschlag lässt sich übernehmen oder ignorieren."
        actions={
          <div className="date-nav">
            <button type="button" className="btn btn-icon" onClick={() => go(addDays(weekStart, -7))} aria-label="Vorherige Woche">
              <ChevronLeft size={18} />
            </button>
            <button type="button" className="btn btn-icon" onClick={() => go(addDays(weekStart, 7))} aria-label="Nächste Woche">
              <ChevronRight size={18} />
            </button>
            {weekStart !== startOfWeek(today) && (
              <button type="button" className="btn" onClick={() => go(startOfWeek(today))}>
                Diese Woche
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        <Card index={0} className="span-2">
          <CardHead eyebrow="Protein pro Tag" title={`Ziel ${settings.targets.protein} g täglich`} />
          <BarChart
            data={report.days.map((d, i) => ({ label: WEEKDAY_SHORT[i], value: d.hasEntries ? d.protein : undefined, highlight: d.date === today, muted: !d.complete }))}
            target={settings.targets.protein}
            unit="g"
          />
          <div className="legend" style={{ marginTop: 6 }}>
            <span>
              <span className="dot neon" /> Ziel erreicht
            </span>
            <span>
              <span className="dot" style={{ background: 'var(--ink)' }} /> vollständiger Tag
            </span>
            <span>
              <span className="dot" /> nicht als vollständig markiert
            </span>
            <span>gestrichelt: keine Einträge</span>
          </div>
        </Card>
        <Card index={1} marble>
          <CardHead eyebrow="Woche in Zahlen" title={`${report.days.filter((d) => d.hasEntries).length} von 7 Tagen erfasst`} />
          <div className="stack-sm small">
            <div className="row-between">
              <span className="muted">Vollständige Tage</span>
              <span className="num">{report.days.filter((d) => d.complete).length}</span>
            </div>
            <div className="row-between">
              <span className="muted">Trainings erledigt</span>
              <span className="num">
                {report.days.flatMap((d) => d.sessions).filter((s) => s.status === 'done').length} / {report.days.flatMap((d) => d.sessions).length}
              </span>
            </div>
            <div className="row-between">
              <span className="muted">Budget geplant</span>
              <span className={`num ${report.budget.status === 'ueber' ? 'warn-text' : ''}`}>{euro(report.budget.cash)}</span>
            </div>
            <div className="row-between">
              <span className="muted">Offene Vorschläge</span>
              <span className="num">{openSuggestions.length}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="stack-lg">
          <Card index={2}>
            <CardHead eyebrow="1 · Was gut läuft" title={report.good.length ? `${report.good.length} Punkte` : 'Noch keine Daten'} />
            {report.good.length ? (
              <ul className="check-list">
                {report.good.map((g) => (
                  <li key={g}>
                    <CheckCircle2 size={17} color="var(--neon-ink)" />
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="muted small">Sobald du Mahlzeiten, Getränke und Trainings einträgst, siehst du hier, was schon klappt.</div>
            )}
          </Card>

          <Card index={3}>
            <CardHead eyebrow="2 · Offene Ziele" title={report.open.length ? `${report.open.length} offen` : 'Nichts offen'} />
            {report.open.length ? (
              <ul className="check-list">
                {report.open.map((g) => (
                  <li key={g}>
                    <CircleDashed size={17} color="var(--ink-3)" />
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="muted small">Alle bewerteten Ziele sind erreicht.</div>
            )}
          </Card>

          <Card index={4}>
            <CardHead eyebrow="3 · Unvollständige Daten" title={report.incomplete.length ? `${report.incomplete.length} Hinweise` : 'Alles erfasst'} />
            {report.incomplete.length ? (
              <ul className="check-list">
                {report.incomplete.map((g) => (
                  <li key={g}>
                    <AlertCircle size={17} color="var(--warn)" />
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="muted small">Alle vergangenen Tage dieser Woche haben Einträge.</div>
            )}
            <div className="row-wrap" style={{ marginTop: 12 }}>
              {report.days
                .filter((d) => !d.future && (!d.hasEntries || !d.complete))
                .map((d) => (
                  <a key={d.date} className="chip" href={href(d.date === today ? '/protokoll' : `/protokoll?datum=${d.date}`)} style={{ textDecoration: 'none' }}>
                    {relativeDay(d.date, today)} ergänzen
                  </a>
                ))}
            </div>
          </Card>
        </div>

        <div className="stack-lg">
          <Card index={2} marble>
            <CardHead eyebrow="4 · Vorschläge" title={openSuggestions.length ? 'Sinnvoll ergänzen' : 'Keine offenen Vorschläge'} />
            <div className="stack">
              {openSuggestions.map((s) => (
                <div key={s.id} className="suggestion">
                  <span className="icon-tile neon">{AREA_ICON[s.area]}</span>
                  <div className="grow">
                    <div className="strong">{s.title}</div>
                    <div className="small muted" style={{ marginTop: 4 }}>
                      {s.detail}
                    </div>
                    <div className="suggestion-actions">
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => accept(s)}>
                        {s.acceptLabel ?? 'Übernehmen'}
                      </button>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => ignoreSuggestion(store, s.id)}>
                        Ignorieren
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {openSuggestions.length === 0 && <div className="muted small">Je mehr du einträgst, desto genauer werden die Vorschläge. Keine Vorschläge zu extremen Kalorienmengen oder Extra-Trainings als Ausgleich.</div>}
              {resolved.length > 0 && (
                <details className="disclosure">
                  <summary>
                    <span className="small">{resolved.length} erledigte Vorschläge</span>
                  </summary>
                  <div className="stack-sm" style={{ paddingBottom: 10 }}>
                    {resolved.map((s) => (
                      <div key={s.id} className="row-between small">
                        <span className="muted">{s.title}</span>
                        <span className={`badge ${states.get(s.id) === 'accepted' ? 'badge-neon' : ''}`}>{states.get(s.id) === 'accepted' ? 'übernommen' : 'ignoriert'}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </Card>

          <Card index={3}>
            <CardHead eyebrow="5 · Noch einkaufen" title={report.shoppingOpen.length ? `${report.shoppingOpen.length} ${report.shoppingOpen.length === 1 ? 'Produkt' : 'Produkte'}` : 'Nichts offen'} action={<a className="btn btn-sm btn-ghost" href={href(`/einkauf?woche=${weekStart}`)}>Zur Liste</a>} />
            {report.shoppingOpen.length ? (
              <div className="row-wrap">
                {report.shoppingOpen.map((l) => (
                  <span key={l.foodId} className="badge">
                    {l.food.name} · {l.packs}× {euro(l.packPrice)}
                  </span>
                ))}
              </div>
            ) : (
              <div className="muted small">Alles für die geplanten Mahlzeiten ist eingekauft oder im Vorrat.</div>
            )}
          </Card>

          <Card index={4}>
            <CardHead eyebrow="6 · Anstehende Trainings" title={report.upcoming.length ? `${report.upcoming.length} diese Woche` : 'Keine mehr diese Woche'} />
            <div className="list">
              {report.upcoming.map((u) => (
                <div key={u.key} className="list-item">
                  <div className="grow">
                    <div className="title">{SESSION_MAP[u.sessionId].title}</div>
                    <div className="meta">{relativeDay(u.date, today)}</div>
                  </div>
                  <a className="btn btn-sm" href={href(`/training/${u.key}`)}>
                    Öffnen
                  </a>
                </div>
              ))}
            </div>
            {report.days.some((d) => d.kcal !== undefined) && (
              <div className="muted tiny" style={{ marginTop: 10 }}>
                Kalorien diese Woche (erfasst): {report.days.filter((d) => d.kcal !== undefined).map((d) => `${WEEKDAY_SHORT[report.days.indexOf(d)]} ${num(d.kcal ?? 0)}`).join(' · ')}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
