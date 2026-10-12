import { addDays, todayISO } from '../lib/date'
import type { Settings, WeightEntry } from '../types'

export function sortedWeights(weights: WeightEntry[]): WeightEntry[] {
  return [...weights].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
}

/** Mittelwert aller Messungen im Zeitraum [from, to]. Mehrere Messungen an einem Tag zählen als Tagesmittel. */
export function averageBetween(weights: WeightEntry[], from: string, to: string): { avg?: number; days: number } {
  const byDay = new Map<string, number[]>()
  for (const w of weights) {
    if (w.date < from || w.date > to) continue
    byDay.set(w.date, [...(byDay.get(w.date) ?? []), w.kg])
  }
  const dayValues = [...byDay.values()].map((v) => v.reduce((s, x) => s + x, 0) / v.length)
  if (!dayValues.length) return { days: 0 }
  return { avg: dayValues.reduce((s, x) => s + x, 0) / dayValues.length, days: dayValues.length }
}

export interface WeightPoint {
  date: string
  kg: number
  avg7: number
}

/** Messwerte mit gleitendem 7-Tage-Durchschnitt (glättet Wasser- und Verdauungsschwankungen). */
export function withMovingAverage(weights: WeightEntry[]): WeightPoint[] {
  const sorted = sortedWeights(weights)
  const byDay = new Map<string, number>()
  for (const w of sorted) byDay.set(w.date, w.kg)
  return [...byDay.entries()].map(([date, kg]) => ({
    date,
    kg,
    avg7: averageBetween(sorted, addDays(date, -6), date).avg ?? kg,
  }))
}

export interface WeightTrend {
  current?: number
  previous?: number
  /** Veränderung des 7-Tage-Mittels pro Woche in kg */
  perWeek?: number
  enoughData: boolean
}

/** Vergleicht den Durchschnitt der letzten 7 Tage mit dem 7-Tage-Fenster davor. */
export function weeklyTrend(weights: WeightEntry[], today = todayISO()): WeightTrend {
  const a = averageBetween(weights, addDays(today, -6), today)
  const b = averageBetween(weights, addDays(today, -13), addDays(today, -7))
  const enough = a.days >= 3 && b.days >= 3
  return {
    current: a.avg,
    previous: b.avg,
    perWeek: a.avg !== undefined && b.avg !== undefined ? a.avg - b.avg : undefined,
    enoughData: enough,
  }
}

export interface CalorieSuggestion {
  id: string
  delta: number
  newKcal: number
  reason: string
  /** Gewichtsveränderung über zwei Wochen in kg */
  change: number
}

/**
 * Prüft den Gewichtsverlauf über zwei Wochen:
 * - Durchschnitt steigt nicht → +150 kcal vorschlagen
 * - mehr als 300 g pro Woche → −100 bis −150 kcal vorschlagen
 * Ziele werden nie automatisch verändert.
 */
export function calorieSuggestion(weights: WeightEntry[], settings: Settings, today = todayISO()): CalorieSuggestion | undefined {
  const recent = averageBetween(weights, addDays(today, -6), today)
  const earlier = averageBetween(weights, addDays(today, -20), addDays(today, -14))
  if (recent.avg === undefined || earlier.avg === undefined || recent.days < 3 || earlier.days < 3) return undefined
  const change = recent.avg - earlier.avg
  const perWeek = change / 2
  const kcal = settings.targets.kcal
  if (change <= 0) {
    return {
      id: `kcal-up-${today}`,
      delta: 150,
      newKcal: kcal + 150,
      change,
      reason: `Dein 7-Tage-Durchschnitt ist in zwei Wochen nicht gestiegen (${formatKg(change)}). Für Muskelaufbau sind etwa +${settings.targets.gainMinG}–${settings.targets.gainMaxG} g pro Woche geplant.`,
    }
  }
  if (perWeek > 0.3) {
    const delta = perWeek > 0.4 ? -150 : -100
    return {
      id: `kcal-down-${today}`,
      delta,
      newKcal: kcal + delta,
      change,
      reason: `Du nimmst etwa ${formatKg(perWeek)} pro Woche zu. Das ist mehr als geplant (bis ${settings.targets.gainMaxG} g). Eine kleine Reduzierung hält die Zunahme näher am Muskelaufbau.`,
    }
  }
  return undefined
}

function formatKg(v: number): string {
  const g = Math.round(v * 1000)
  return `${g > 0 ? '+' : ''}${new Intl.NumberFormat('de-DE').format(g)} g`
}
