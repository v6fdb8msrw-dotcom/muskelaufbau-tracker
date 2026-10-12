const nf = (decimals: number) =>
  new Intl.NumberFormat('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: decimals })

const cache = new Map<number, Intl.NumberFormat>()

export function num(value: number, decimals = 0): string {
  let f = cache.get(decimals)
  if (!f) {
    f = nf(decimals)
    cache.set(decimals, f)
  }
  return f.format(value)
}

const eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })

export function euro(value: number): string {
  return eur.format(value)
}

export function pct(value: number): string {
  return `${Math.round(value * 100)} %`
}

export function kg(value: number): string {
  return `${num(value, 1)} kg`
}

export function ml(value: number): string {
  return value >= 1000 ? `${num(value / 1000, 2)} l` : `${num(value)} ml`
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

export function round(v: number, decimals = 0): number {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

export function plural(n: number, one: string, many: string): string {
  return `${num(n)} ${n === 1 ? one : many}`
}
