import { ChevronDown, Info, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { clamp, num } from '../lib/format'
import { useCountUp } from './hooks'

export interface HeadStat {
  label: string
  value: number | string
  unit?: string
  decimals?: number
  /** Geldbetrag: immer zwei Nachkommastellen */
  money?: boolean
  /** Hervorgehoben in Neon (die wichtigste Zahl der Seite) */
  accent?: boolean
  warn?: boolean
}

/** Seitenkopf im Stil des Dashboards: dunkle Fläche, Titel und höchstens ein paar Kennzahlen. */
export function PageHead({ eyebrow, title, lead, actions, stats }: { eyebrow?: string; title: string; lead?: ReactNode; actions?: ReactNode; stats?: HeadStat[] }) {
  return (
    <header className="page-head">
      <span className="page-head-grid" aria-hidden />
      <div className="page-head-main">
        <div className="page-head-text">
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h1>{title}</h1>
          {lead && <p className="lead">{lead}</p>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
      {stats && stats.length > 0 && (
        <div className="head-stats">
          {stats.map((s) => (
            <HeadStatView key={s.label} {...s} />
          ))}
        </div>
      )}
    </header>
  )
}

function HeadStatView({ label, value, unit, decimals = 0, money, accent, warn }: HeadStat) {
  const n = typeof value === 'number' ? value : undefined
  const shown = useCountUp(n ?? 0)
  return (
    <div className={`head-stat ${accent ? 'accent' : ''} ${warn ? 'warn' : ''}`}>
      <span className="head-stat-label">{label}</span>
      <span className="head-stat-value num">
        {n !== undefined ? (money ? shown.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : num(shown, decimals)) : value}
        {unit && <small>{unit}</small>}
      </span>
    </div>
  )
}

export function Card({
  children,
  className = '',
  index = 0,
  marble,
  dark,
  style,
  as: Tag = 'section',
}: {
  children: ReactNode
  className?: string
  index?: number
  marble?: boolean
  dark?: boolean
  style?: CSSProperties
  as?: 'section' | 'article' | 'div'
}) {
  return (
    <Tag className={`card ${marble ? 'marble' : ''} ${dark ? 'card-dark' : ''} ${className}`} style={{ ['--i' as string]: index, ...style }}>
      {children}
    </Tag>
  )
}

export function CardHead({ eyebrow, title, action }: { eyebrow?: string; title: ReactNode; action?: ReactNode }) {
  return (
    <div className="card-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <div className="card-title">{title}</div>
      </div>
      {action}
    </div>
  )
}

export function Bar({
  value,
  max,
  variant,
  size,
  marker,
  partial,
  label,
}: {
  value: number
  max: number
  variant?: 'ink' | 'silver' | 'warn'
  size?: 'thin' | 'thick'
  marker?: number
  partial?: boolean
  label?: string
}) {
  const pctv = max > 0 ? clamp(value / max, 0, 1) * 100 : 0
  return (
    <div className={`bar ${size ?? ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)} aria-label={label}>
      <div className={`bar-fill ${variant ?? ''} ${partial ? 'partial' : ''}`} style={{ width: `${pctv}%` }} />
      {marker !== undefined && max > 0 && <div className="bar-marker" style={{ left: `${clamp(marker / max, 0, 1) * 100}%` }} />}
    </div>
  )
}

export function Ring({ value, max, size = 132, stroke = 11, children }: { value: number; max: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = max > 0 ? clamp(value / max, 0, 1) : 0
  const gid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden>
        <defs>
          <linearGradient id={`g${gid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#17d861" />
            <stop offset="100%" stopColor="#5ff59a" />
          </linearGradient>
        </defs>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle
          className="ring-value"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#g${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  )
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Tabs<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const first = ref.current?.querySelector<HTMLElement>('input, select, textarea, button:not(.dialog-close)')
    first?.focus({ preventScroll: true })
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      prev?.focus?.({ preventScroll: true })
    }
  }, [onClose])
  // Über ein Portal direkt in <body>: Elternteile mit transform (z. B. die Seiten-Animation) würden position: fixed sonst verschieben
  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`dialog ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" ref={ref}>
        <div className="dialog-head">
          <h2>{title}</h2>
          <button type="button" className="btn btn-ghost btn-icon dialog-close" onClick={onClose} aria-label="Schließen">
            <X size={18} />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
        {footer && <div className="dialog-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Field({ label, hint, children, htmlFor }: { label: ReactNode; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  )
}

/** Zahl für die Anzeige mit deutschem Komma. */
function formatInput(v: number | undefined): string {
  if (v === undefined || !Number.isFinite(v)) return ''
  return String(Math.round(v * 1000) / 1000).replace('.', ',')
}

/** Text in Zahl umwandeln; Komma und Punkt sind erlaubt. Unfertige Eingaben ergeben undefined. */
export function parseNumberInput(text: string): number | undefined {
  const t = text.trim().replace(/\s/g, '').replace(',', '.')
  if (!t || t === '-' || t === '.') return undefined
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Zahlenfeld, das sich frei bearbeiten lässt: Während der Eingabe darf das Feld leer oder unfertig
 * sein (z. B. „60,“). Gültige Zahlen werden sofort übernommen, beim Verlassen springt eine
 * ungültige Eingabe auf den gespeicherten Wert zurück.
 */
export function NumberInput({
  value,
  onChange,
  suffix,
  min,
  max,
  id,
  placeholder,
  ariaLabel,
}: {
  value: number | undefined
  onChange: (v: number | undefined) => void
  suffix?: string
  step?: number
  min?: number
  max?: number
  id?: string
  placeholder?: string
  ariaLabel?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? formatInput(value)
  return (
    <div className="input-group">
      <input
        id={id}
        className="input num"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        aria-label={ariaLabel}
        value={shown}
        onFocus={(e) => {
          setDraft(formatInput(value))
          e.currentTarget.select()
        }}
        onBlur={() => setDraft(null)}
        onChange={(e) => {
          const text = e.target.value
          if (!/^-?[\d\s]*[.,]?\d*$/.test(text)) return
          setDraft(text)
          if (text.trim() === '') {
            onChange(undefined)
            return
          }
          const n = parseNumberInput(text)
          if (n === undefined) return
          if (min !== undefined && n < min) return
          if (max !== undefined && n > max) return
          onChange(n)
        }}
      />
      {suffix && <span className="input-suffix">{suffix}</span>}
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label className="switch">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

export function Empty({ icon, children, action }: { icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      {icon}
      <div>{children}</div>
      {action}
    </div>
  )
}

export function Notice({ children, kind, icon }: { children: ReactNode; kind?: 'neon' | 'warn'; icon?: ReactNode }) {
  return (
    <div className={`notice ${kind ?? ''}`}>
      {icon ?? <Info size={17} />}
      <div>{children}</div>
    </div>
  )
}

export function Disclosure({ title, children, defaultOpen }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="disclosure" open={defaultOpen}>
      <summary>
        <span>{title}</span>
        <ChevronDown size={18} />
      </summary>
      <div className="disclosure-body">{children}</div>
    </details>
  )
}

export function Stat({ label, value, unit, sub }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode }) {
  return (
    <div className="kpi">
      <div className="eyebrow">{label}</div>
      <div className="stat-value">
        {value}
        {unit && <span className="stat-unit">{unit}</span>}
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}
