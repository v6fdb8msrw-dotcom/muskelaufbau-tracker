import type { Weekday } from '../types'

/** Datumsfunktionen auf Basis lokaler Kalendertage im Format YYYY-MM-DD. */

const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

export function todayISO(): string {
  return toISO(new Date())
}

export function nowTime(): string {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() + days)
  return toISO(d)
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseISO(a).getTime() - parseISO(b).getTime()) / 86_400_000)
}

/** 0 = Montag … 6 = Sonntag */
export function weekdayIndex(iso: string): number {
  return (parseISO(iso).getDay() + 6) % 7
}

export const WEEKDAYS: Weekday[] = ['mo', 'di', 'mi', 'do', 'fr', 'sa', 'so']
export const WEEKDAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
export const WEEKDAY_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']

export function weekdayOf(iso: string): Weekday {
  return WEEKDAYS[weekdayIndex(iso)]
}

export function startOfWeek(iso: string): string {
  return addDays(iso, -weekdayIndex(iso))
}

export function weekDates(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

export function isBetween(iso: string, from: string, to: string): boolean {
  return iso >= from && iso <= to
}

const dateFmt = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })
const dateLongFmt = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
const dateShortFmt = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'numeric' })
const dateFullFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })

export function formatDate(iso: string): string {
  return dateFmt.format(parseISO(iso))
}

export function formatDateLong(iso: string): string {
  return dateLongFmt.format(parseISO(iso))
}

export function formatDateShort(iso: string): string {
  return dateShortFmt.format(parseISO(iso))
}

export function formatDateFull(iso: string): string {
  return dateFullFmt.format(parseISO(iso))
}

export function relativeDay(iso: string, today = todayISO()): string {
  const diff = diffDays(iso, today)
  if (diff === 0) return 'Heute'
  if (diff === -1) return 'Gestern'
  if (diff === 1) return 'Morgen'
  return formatDate(iso)
}

export function timeToSlot(time: string): 'fruehstueck' | 'mittag' | 'snack' | 'abend' | 'spaet' {
  const h = Number(time.slice(0, 2))
  if (h < 10) return 'fruehstueck'
  if (h < 14) return 'mittag'
  if (h < 17) return 'snack'
  if (h < 21) return 'abend'
  return 'spaet'
}

/** „gerade eben“, „vor 5 Minuten“, „vor 3 Stunden“, „gestern“, „vor 4 Tagen“ für einen ISO-Zeitstempel. */
export function relativeTime(isoTimestamp: string, now = new Date()): string {
  const diff = (now.getTime() - new Date(isoTimestamp).getTime()) / 60_000
  if (!Number.isFinite(diff)) return 'unbekannt'
  if (diff < 1) return 'gerade eben'
  if (diff < 60) return `vor ${Math.round(diff)} ${Math.round(diff) === 1 ? 'Minute' : 'Minuten'}`
  if (diff < 60 * 24) return `vor ${Math.round(diff / 60)} ${Math.round(diff / 60) === 1 ? 'Stunde' : 'Stunden'}`
  const days = diffDays(toISO(now), toISO(new Date(isoTimestamp)))
  return days <= 1 ? 'gestern' : `vor ${days} Tagen`
}
