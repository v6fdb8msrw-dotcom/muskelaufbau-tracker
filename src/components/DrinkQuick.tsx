import { CupSoda, Citrus, Coffee, Droplet, GlassWater, Leaf, Milk, Sparkles, Zap } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { DRINK_PRESETS, QUICK_AMOUNTS } from '../data/defaults'
import { todayISO } from '../lib/date'
import { buildDrinkLog } from '../state/actions'
import { useStore } from '../state/store'
import { useToast } from '../state/toast'
import { NumberInput } from './ui'

const ICONS: Record<string, ReactNode> = {
  droplet: <Droplet size={18} />,
  sparkles: <Sparkles size={18} />,
  leaf: <Leaf size={18} />,
  coffee: <Coffee size={18} />,
  cup: <CupSoda size={18} />,
  zap: <Zap size={18} />,
  milk: <Milk size={18} />,
  citrus: <Citrus size={18} />,
}

/** Schnellerfassung für Getränke: Art wählen, Menge tippen. */
export function DrinkQuick({ date, onDone }: { date?: string; onDone?: () => void }) {
  const store = useStore()
  const { toast } = useToast()
  const [drink, setDrink] = useState('wasser')
  const [custom, setCustom] = useState<number | undefined>()
  const products = store.data.products.filter((p) => (p.kind === 'smoothie' || p.kind === 'drink') && p.unit === 'ml')

  async function add(ml: number) {
    if (!ml || ml <= 0) return
    const product = products.find((p) => p.id === drink)
    const entry = buildDrinkLog({ drinkId: product ? `product:${product.kind}` : drink, ml, date: date ?? todayISO(), product })
    await store.save('drinkLogs', entry)
    toast(`${entry.name}: ${ml} ml eingetragen`)
    setCustom(undefined)
    onDone?.()
  }

  return (
    <div className="stack">
      <div className="quick-grid">
        {DRINK_PRESETS.map((d) => (
          <button key={d.id} type="button" className="quick-btn" aria-pressed={drink === d.id} onClick={() => setDrink(d.id)}>
            {ICONS[d.icon]}
            {d.label}
          </button>
        ))}
        {products.map((p) => (
          <button key={p.id} type="button" className="quick-btn" aria-pressed={drink === p.id} onClick={() => setDrink(p.id)} title={p.name}>
            <GlassWater size={18} />
            <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 8 }}>
        {QUICK_AMOUNTS.map((ml) => (
          <button key={ml} type="button" className="amount-btn" onClick={() => add(ml)}>
            {ml}
          </button>
        ))}
      </div>
      <div className="row">
        <div className="grow">
          <NumberInput value={custom} onChange={setCustom} suffix="ml" placeholder="Eigene Menge" ariaLabel="Eigene Menge in ml" />
        </div>
        <button type="button" className="btn btn-dark" disabled={!custom} onClick={() => custom && add(custom)}>
          Eintragen
        </button>
      </div>
    </div>
  )
}
