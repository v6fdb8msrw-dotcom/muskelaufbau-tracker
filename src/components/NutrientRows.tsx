import { NUTRIENT_META, referenceFor } from '../data/nutrients'
import { num } from '../lib/format'
import { useStore } from '../state/store'
import type { NutrientKey } from '../types'
import { Bar } from './ui'

export interface NutrientValue {
  value?: number
  partial?: boolean
}

function fmt(key: NutrientKey, v: number) {
  const meta = NUTRIENT_META[key]
  return num(v, v >= 100 ? 0 : meta.decimals)
}

/** Zeilen mit Nährstoff, Wert, Referenz und Balken. Unvollständige Daten werden als Untergrenze gekennzeichnet. */
export function NutrientRows({ keys, values, compact }: { keys: NutrientKey[]; values: (key: NutrientKey) => NutrientValue; compact?: boolean }) {
  const { settings } = useStore()
  return (
    <div>
      {keys.map((key) => {
        const meta = NUTRIENT_META[key]
        const ref = referenceFor(key, settings)
        const { value, partial } = values(key)
        const share = ref && value !== undefined ? value / ref : undefined
        const over = meta.limit && share !== undefined && share > 1
        return (
          <div className="meter-row" key={key} title={meta.refNote}>
            <div className="meter-label">
              <span style={{ minWidth: 0 }}>{compact ? (meta.short ?? meta.label) : meta.label}</span>
              {partial && value !== undefined && (
                <span className="badge badge-outline" title="Für mindestens einen Eintrag fehlen Daten. Der Wert ist eine Untergrenze.">
                  ≥
                </span>
              )}
            </div>
            {ref && value !== undefined ? (
              <Bar value={value} max={ref} partial={partial} variant={over ? 'warn' : meta.limit ? 'silver' : undefined} label={meta.label} />
            ) : (
              <div className="bar thin" />
            )}
            <div className="meter-value">
              {value === undefined ? (
                <span className="muted">keine Daten</span>
              ) : (
                <>
                  <span style={{ color: 'var(--ink)', fontWeight: 650 }}>
                    {partial ? '≥ ' : ''}
                    {fmt(key, value)}
                  </span>
                  {ref ? ` / ${fmt(key, ref)} ${meta.unit}` : ` ${meta.unit}`}
                  {share !== undefined && !compact && <span className="muted"> · {Math.round(share * 100)} %</span>}
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
