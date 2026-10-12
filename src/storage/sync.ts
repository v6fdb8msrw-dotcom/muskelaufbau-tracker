import { COLLECTIONS, type CollectionName, type DataSet, type Settings } from '../types'
import { APP_ID, BACKUP_FORMAT, validateBackup, type BackupFile } from './backup'
import type { DataRepository } from './repository'

/*
 * Abgleich zwischen iPhone und Mac per Datei (AirDrop, iCloud Drive, Mail …).
 * Ein Gerät sendet seinen ganzen Stand, das andere führt ihn mit seinem zusammen:
 * - neue Einträge kommen dazu,
 * - bei gleicher ID gewinnt der neuere Stand (updatedAt),
 * - Gelöschtes bleibt gelöscht: Jedes Gerät merkt sich gelöschte IDs („Grabsteine“),
 * - die Einstellungen des Geräts, auf dem sie zuletzt geändert wurden, gewinnen.
 * Es gibt keinen Server; nichts verlässt das Gerät, außer du teilst die Datei.
 */

export interface Tombstone {
  c: CollectionName
  id: string
  /** Zeitpunkt des Löschens (ISO) */
  at: string
}

export interface SyncInfo {
  deviceId: string
  device: string
  tombstones: Tombstone[]
  settingsUpdatedAt?: string
}

export interface SyncFile extends BackupFile {
  sync: SyncInfo
}

export interface SyncState {
  data: DataSet
  settings: Settings
  tombstones: Tombstone[]
  settingsUpdatedAt?: string
}

/** Grabsteine älter als ein Jahr werden vergessen, damit die Liste klein bleibt. */
const TOMBSTONE_DAYS = 365

export function pruneTombstones(list: Tombstone[], now = new Date()): Tombstone[] {
  const limit = new Date(now.getTime() - TOMBSTONE_DAYS * 86_400_000).toISOString()
  const map = new Map<string, Tombstone>()
  for (const t of list) {
    if (t.at < limit) continue
    const key = `${t.c}:${t.id}`
    const prev = map.get(key)
    if (!prev || prev.at < t.at) map.set(key, t)
  }
  return [...map.values()]
}

/** Gerätename für die Anzeige („iPhone“, „Mac“ …). */
export function deviceLabel(ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''): string {
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Macintosh/.test(ua)) return 'Mac'
  if (/Android/.test(ua)) return 'Android'
  if (/Windows/.test(ua)) return 'Windows'
  return 'Gerät'
}

export function buildSyncFile(state: SyncState, deviceId: string, device = deviceLabel()): SyncFile {
  return {
    app: APP_ID,
    format: BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    settings: state.settings,
    data: state.data,
    sync: { deviceId, device, tombstones: pruneTombstones(state.tombstones), settingsUpdatedAt: state.settingsUpdatedAt },
  }
}

export function syncFileName(date = new Date(), device = deviceLabel()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`
  return `muscle-studio-sync-${device.toLowerCase()}-${stamp}.json`
}

export interface ParsedSync {
  ok: boolean
  errors: string[]
  file?: SyncFile
}

/** Liest eine Sync-Datei. Ein normales Backup geht auch (dann ohne Löschungen und ohne Einstellungen). */
export function parseSyncFile(raw: unknown): ParsedSync {
  const v = validateBackup(raw)
  if (!v.ok || !v.backup) return { ok: false, errors: v.errors }
  const s = (raw as { sync?: Partial<SyncInfo> }).sync
  const tombstones = Array.isArray(s?.tombstones)
    ? s.tombstones.filter((t): t is Tombstone => !!t && COLLECTIONS.includes(t.c) && typeof t.id === 'string' && typeof t.at === 'string')
    : []
  return {
    ok: true,
    errors: [],
    file: {
      ...v.backup,
      sync: {
        deviceId: typeof s?.deviceId === 'string' ? s.deviceId : '',
        device: typeof s?.device === 'string' ? s.device : 'anderes Gerät',
        tombstones,
        settingsUpdatedAt: typeof s?.settingsUpdatedAt === 'string' ? s.settingsUpdatedAt : undefined,
      },
    },
  }
}

export interface MergePlan {
  /** Zu schreibende Einträge je Sammlung (neu oder aktualisiert) */
  writes: Partial<Record<CollectionName, { id: string }[]>>
  /** Zu löschende IDs je Sammlung */
  deletes: Partial<Record<CollectionName, string[]>>
  /** Einstellungen des anderen Geräts übernehmen? */
  settings?: Settings
  settingsUpdatedAt?: string
  tombstones: Tombstone[]
  added: number
  updated: number
  deleted: number
  /** Je Sammlung, wie viele Änderungen ankommen (für die Vorschau) */
  perCollection: Partial<Record<CollectionName, number>>
}

type Rec = { id: string; updatedAt: string }

/** Plant den Abgleich, ohne etwas zu schreiben. */
export function planMerge(local: SyncState, remote: SyncFile): MergePlan {
  const plan: MergePlan = { writes: {}, deletes: {}, tombstones: [], added: 0, updated: 0, deleted: 0, perCollection: {} }
  const localTomb = new Map(local.tombstones.map((t) => [`${t.c}:${t.id}`, t.at]))
  const remoteTomb = new Map(remote.sync.tombstones.map((t) => [`${t.c}:${t.id}`, t.at]))

  for (const c of COLLECTIONS) {
    const mine = new Map((local.data[c] as Rec[]).map((x) => [x.id, x]))
    const writes: Rec[] = []
    const deletes: string[] = []
    for (const item of remote.data[c] as Rec[]) {
      const deletedHere = localTomb.get(`${c}:${item.id}`)
      if (deletedHere && deletedHere >= item.updatedAt) continue
      const cur = mine.get(item.id)
      if (!cur) {
        writes.push(item)
        plan.added++
      } else if (item.updatedAt > cur.updatedAt && JSON.stringify(cur) !== JSON.stringify(item)) {
        writes.push(item)
        plan.updated++
      }
    }
    for (const [key, at] of remoteTomb) {
      const [tc, id] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)]
      if (tc !== c) continue
      const cur = mine.get(id)
      if (cur && cur.updatedAt <= at) {
        deletes.push(id)
        plan.deleted++
      }
    }
    if (writes.length) plan.writes[c] = writes
    if (deletes.length) plan.deletes[c] = deletes
    if (writes.length || deletes.length) plan.perCollection[c] = writes.length + deletes.length
  }

  const remoteNewer = !!remote.sync.settingsUpdatedAt && (!local.settingsUpdatedAt || remote.sync.settingsUpdatedAt > local.settingsUpdatedAt)
  if (remoteNewer) {
    plan.settings = remote.settings
    plan.settingsUpdatedAt = remote.sync.settingsUpdatedAt
  }
  plan.tombstones = pruneTombstones([...local.tombstones, ...remote.sync.tombstones])
  return plan
}

export function planIsEmpty(plan: MergePlan): boolean {
  return plan.added + plan.updated + plan.deleted === 0 && !plan.settings
}

export const META_TOMBSTONES = 'tombstones'
export const META_SETTINGS_UPDATED = 'settingsUpdatedAt'
export const META_LAST_SYNC = 'lastSyncAt'

/** Führt den geplanten Abgleich aus. */
export async function applyMerge(repo: DataRepository, plan: MergePlan): Promise<void> {
  for (const c of COLLECTIONS) {
    const w = plan.writes[c]
    if (w?.length) await repo.putMany(c, w as never[])
    for (const id of plan.deletes[c] ?? []) await repo.remove(c, id)
  }
  if (plan.settings) {
    await repo.saveSettings(plan.settings)
    await repo.setMeta(META_SETTINGS_UPDATED, plan.settingsUpdatedAt)
  }
  await repo.setMeta(META_TOMBSTONES, plan.tombstones)
  await repo.setMeta(META_LAST_SYNC, new Date().toISOString())
}

/**
 * Datei teilen: Auf dem iPhone (und in Safari am Mac) öffnet sich das Teilen-Menü mit AirDrop.
 * Wo das nicht geht, wird die Datei heruntergeladen. Ergebnis: 'shared', 'downloaded' oder 'cancelled'.
 */
export async function shareOrDownload(file: File): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Muscle Studio' })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
      // Teilen nicht möglich (z. B. fehlende Berechtigung): auf Download ausweichen
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return 'downloaded'
}
