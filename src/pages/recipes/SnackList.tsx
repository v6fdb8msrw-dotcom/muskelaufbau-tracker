import { Check } from 'lucide-react'
import { useMemo } from 'react'
import { useDayTotals, useToday } from '../../components/hooks'
import { Card, CardHead } from '../../components/ui'
import { SNACKS, type SnackKind } from '../../data/snacks'
import { snackProfile } from '../../domain/snacks'
import { num } from '../../lib/format'
import { buildSnackLog } from '../../state/actions'
import { useStore } from '../../state/store'
import { useToast } from '../../state/toast'

const GROUPS: { kind: SnackKind; title: string; eyebrow: string }[] = [
  { kind: 'kalorien', title: 'Viele Kalorien, macht wenig satt', eyebrow: 'Wenn das Eiweiß schon stimmt' },
  { kind: 'beides', title: 'Kalorien und Eiweiß', eyebrow: 'Passt fast immer' },
  { kind: 'eiweiss', title: 'Viel Eiweiß', eyebrow: 'Wenn noch Eiweiß fehlt' },
]

/** Schnelle Snacks (höchstens 5 Minuten) zum Eintragen mit einem Tipp. */
export function SnackList() {
  const store = useStore()
  const { settings } = store
  const { toast } = useToast()
  const today = useToday()
  const v = useDayTotals(today).profile.values
  const kcalOpen = Math.max(0, settings.targets.kcal - (v.kcal ?? 0))
  const proteinOpen = Math.max(0, settings.targets.protein - (v.protein ?? 0))
  const rows = useMemo(() => SNACKS.map((snack) => ({ snack, v: snackProfile(snack).values })), [])

  async function eat(id: string) {
    const snack = SNACKS.find((s) => s.id === id)!
    await store.save('foodLogs', buildSnackLog(snack, { date: today }))
    toast(`${snack.name} eingetragen`)
  }

  return (
    <div className="stack-lg">
      <div className="muted small">
        Heute noch offen: <strong className="num">{num(kcalOpen)} kcal</strong> und <strong className="num">{num(proteinOpen)} g Eiweiß</strong>. Alle Snacks gehen in
        höchstens 5 Minuten und ohne Kochen.
      </div>
      {GROUPS.map((g, gi) => (
        <Card key={g.kind} index={gi}>
          <CardHead eyebrow={g.eyebrow} title={g.title} />
          <div className="list">
            {rows
              .filter((r) => r.snack.kind === g.kind)
              .sort((a, b) => (b.v.kcal ?? 0) - (a.v.kcal ?? 0))
              .map(({ snack, v: n }) => (
                <div key={snack.id} className="list-item">
                  <div className="grow">
                    <div className="title">{snack.name}</div>
                    <div className="meta num">
                      {num(n.kcal ?? 0)} kcal · {num(n.protein ?? 0)} g Eiweiß{snack.hint ? ` · ${snack.hint}` : ''}
                    </div>
                  </div>
                  <button type="button" className="btn btn-sm" onClick={() => eat(snack.id)}>
                    <Check size={14} /> Gegessen
                  </button>
                </div>
              ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
