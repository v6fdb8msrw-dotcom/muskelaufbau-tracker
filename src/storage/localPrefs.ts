/**
 * Kleine, gerätespezifische Einstellungen in localStorage (Anzeige, zuletzt geöffnete Ansicht).
 * Persönliche Daten liegen nicht hier, sondern in der IndexedDB. Jeder Zugriff ist abgesichert,
 * weil localStorage in privaten Fenstern fehlen oder gesperrt sein kann.
 */

export interface DisplayPrefs {
  motion: 'system' | 'reduziert' | 'normal'
  marble: boolean
  compact: boolean
}

const DISPLAY_KEY = 'ms.display'

export const DEFAULT_DISPLAY: DisplayPrefs = { motion: 'system', marble: true, compact: false }

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...fallback, ...(JSON.parse(raw) as T) } : fallback
  } catch {
    return fallback
  }
}

export function readLocalRaw(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeLocal(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
  } catch {
    /* Speicher nicht verfügbar: Einstellung gilt nur für diese Sitzung */
  }
}

export function removeLocal(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignorieren */
  }
}

export function readDisplayPrefs(): DisplayPrefs {
  return readLocal(DISPLAY_KEY, DEFAULT_DISPLAY)
}

export function writeDisplayPrefs(p: DisplayPrefs): void {
  writeLocal(DISPLAY_KEY, p)
}
