import { z } from 'zod'
import { normalizeSettings } from '../data/defaults'
import { COLLECTIONS, type CollectionName, type DataSet, type Settings } from '../types'
import type { DataRepository } from './repository'

export const BACKUP_FORMAT = 1
export const APP_ID = 'muscle-studio'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum im Format JJJJ-MM-TT erwartet')
const time = z.string().regex(/^\d{2}:\d{2}$/, 'Uhrzeit im Format HH:MM erwartet')
const nonNeg = z.number().finite().min(0)
const base = { id: z.string().min(1), createdAt: z.string(), updatedAt: z.string() }
const nutrients = z.record(z.string(), z.number().finite())

const schemas: Record<CollectionName, z.ZodType> = {
  foodLogs: z.looseObject({ ...base, date: isoDate, time, meal: z.string(), name: z.string(), source: z.looseObject({ kind: z.string() }), nutrients, partial: z.array(z.string()) }),
  drinkLogs: z.looseObject({ ...base, date: isoDate, time, drinkId: z.string(), name: z.string(), ml: nonNeg, nutrients, partial: z.array(z.string()) }),
  supplementLogs: z.looseObject({ ...base, date: isoDate, time, kind: z.enum(['creatine', 'protein']), grams: nonNeg, nutrients, partial: z.array(z.string()) }),
  workouts: z.looseObject({ ...base, date: isoDate, title: z.string(), exercises: z.array(z.looseObject({ exerciseId: z.string(), sets: z.array(z.looseObject({ clean: z.boolean() })) })) }),
  weights: z.looseObject({ ...base, date: isoDate, kg: z.number().min(20).max(300) }),
  arms: z.looseObject({ ...base, date: isoDate, leftCm: z.number().min(10).max(80), rightCm: z.number().min(10).max(80), state: z.enum(['entspannt', 'angespannt']) }),
  mealPlan: z.looseObject({ ...base, date: isoDate, slot: z.string(), recipeId: z.string(), portions: z.number().min(0.5).max(10) }),
  pantry: z.looseObject({ ...base, kind: z.enum(['food', 'leftover']), name: z.string(), amount: nonNeg, unit: z.string() }),
  shopping: z.looseObject({ ...base, week: isoDate, foodId: z.string(), checked: z.boolean() }),
  products: z.looseObject({ ...base, kind: z.enum(['smoothie', 'protein', 'drink', 'food']), name: z.string(), unit: z.enum(['g', 'ml']), per100: nutrients, favorite: z.boolean() }),
  days: z.looseObject({ ...base, date: isoDate, complete: z.boolean() }),
  suggestions: z.looseObject({ ...base, status: z.enum(['accepted', 'ignored']) }),
  schedule: z.looseObject({ ...base }),
  targetWeights: z.looseObject({ ...base, kg: z.number().min(0).max(200) }),
}

export interface BackupFile {
  app: typeof APP_ID
  format: number
  exportedAt: string
  settings: Settings
  data: DataSet
}

export function buildBackup(data: DataSet, settings: Settings): BackupFile {
  return {
    app: APP_ID,
    format: BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    // Einstellungen enthalten keine Zugangsdaten: Spotify-Tokens und Client-ID liegen nur im localStorage
    settings,
    data,
  }
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
  backup?: BackupFile
  counts: Partial<Record<CollectionName, number>>
}

/** Prüft eine Backup-Datei, bevor irgendetwas überschrieben wird. */
export function validateBackup(raw: unknown): ValidationResult {
  const errors: string[] = []
  const counts: ValidationResult['counts'] = {}
  if (!raw || typeof raw !== 'object') return { ok: false, errors: ['Die Datei enthält kein gültiges JSON-Objekt.'], counts }
  const obj = raw as Record<string, unknown>
  if (obj.app !== APP_ID) errors.push('Die Datei stammt nicht aus Muscle Studio.')
  if (typeof obj.format !== 'number' || obj.format > BACKUP_FORMAT) errors.push('Unbekanntes oder neueres Backup-Format.')
  const dataIn = (obj.data ?? {}) as Record<string, unknown>
  const data = {} as DataSet
  for (const c of COLLECTIONS) {
    const list = dataIn[c]
    if (list === undefined) {
      ;(data as Record<string, unknown[]>)[c] = []
      continue
    }
    if (!Array.isArray(list)) {
      errors.push(`„${c}“ ist keine Liste.`)
      continue
    }
    const valid: unknown[] = []
    list.forEach((item, i) => {
      const res = schemas[c].safeParse(item)
      if (res.success) valid.push(item)
      else if (errors.length < 12) errors.push(`${c}[${i}]: ${res.error.issues[0]?.path.join('.')} – ${res.error.issues[0]?.message}`)
    })
    ;(data as Record<string, unknown[]>)[c] = valid
    counts[c] = valid.length
  }
  if (errors.length) return { ok: false, errors, counts }
  const settings = normalizeSettings(obj.settings as Partial<Settings> | undefined)
  return {
    ok: true,
    errors,
    counts,
    backup: { app: APP_ID, format: obj.format as number, exportedAt: String(obj.exportedAt ?? ''), settings, data },
  }
}

export interface ImportSummary {
  added: number
  updated: number
  skipped: number
}

/**
 * Backup einspielen.
 * replace: alles Lokale wird durch das Backup ersetzt.
 * merge: Einträge werden ergänzt. Bei gleicher ID gewinnt der neuere Stand, identische Einträge werden übersprungen.
 */
export async function importBackup(repo: DataRepository, backup: BackupFile, current: DataSet, mode: 'replace' | 'merge'): Promise<ImportSummary> {
  const summary: ImportSummary = { added: 0, updated: 0, skipped: 0 }
  if (mode === 'replace') {
    await repo.clear()
    for (const c of COLLECTIONS) {
      await repo.putMany(c, backup.data[c] as never[])
      summary.added += backup.data[c].length
    }
    await repo.saveSettings(backup.settings)
    return summary
  }
  for (const c of COLLECTIONS) {
    const existing = new Map((current[c] as { id: string; updatedAt: string }[]).map((x) => [x.id, x]))
    const toWrite: unknown[] = []
    for (const item of backup.data[c] as { id: string; updatedAt: string }[]) {
      const cur = existing.get(item.id)
      if (!cur) {
        toWrite.push(item)
        summary.added++
      } else if (JSON.stringify(cur) === JSON.stringify(item) || cur.updatedAt >= item.updatedAt) {
        summary.skipped++
      } else {
        toWrite.push(item)
        summary.updated++
      }
    }
    if (toWrite.length) await repo.putMany(c, toWrite as never[])
  }
  return summary
}

export function backupFileName(date = new Date()): string {
  const d = date.toISOString().slice(0, 10)
  return `muscle-studio-backup-${d}.json`
}
