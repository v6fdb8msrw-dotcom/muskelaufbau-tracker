import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { createDefaultSettings } from '../data/defaults'
import { buildFoodLog } from '../state/actions'
import { COLLECTIONS, type DataSet } from '../types'
import { buildBackup, importBackup, validateBackup } from './backup'
import { IndexedDBRepository } from './indexeddb'

async function loadAll(repo: IndexedDBRepository): Promise<DataSet> {
  const out = {} as Record<string, unknown[]>
  for (const c of COLLECTIONS) out[c] = await repo.getAll(c)
  return out as unknown as DataSet
}

describe('IndexedDB-Speicher', () => {
  it('speichert, liest und löscht Einträge', async () => {
    const repo = new IndexedDBRepository('test-crud')
    const entry = buildFoodLog('ei', 110, { date: '2026-10-12', time: '08:00' })
    await repo.put('foodLogs', entry)
    expect(await repo.getAll('foodLogs')).toHaveLength(1)
    await repo.remove('foodLogs', entry.id)
    expect(await repo.getAll('foodLogs')).toHaveLength(0)
  })

  it('Einstellungen bleiben nach dem erneuten Öffnen erhalten', async () => {
    const a = new IndexedDBRepository('test-settings')
    const s = createDefaultSettings()
    s.targets.kcal = 2300
    await a.saveSettings(s)
    const b = new IndexedDBRepository('test-settings')
    expect((await b.getSettings())?.targets.kcal).toBe(2300)
  })
})

describe('Backup', () => {
  it('Export → Import (ersetzen) ergibt denselben Datenstand', async () => {
    const src = new IndexedDBRepository('test-export')
    const s = createDefaultSettings()
    await src.put('foodLogs', buildFoodLog('ei', 110, { date: '2026-10-12', time: '08:00' }))
    await src.put('weights', { id: 'w1', createdAt: 'x', updatedAt: 'x', date: '2026-10-12', kg: 70.4 })
    const backup = JSON.parse(JSON.stringify(buildBackup(await loadAll(src), s)))
    const v = validateBackup(backup)
    expect(v.ok).toBe(true)
    const dst = new IndexedDBRepository('test-import')
    await importBackup(dst, v.backup!, await loadAll(dst), 'replace')
    const after = await loadAll(dst)
    expect(after.foodLogs).toHaveLength(1)
    expect(after.weights[0].kg).toBe(70.4)
  })

  it('Zusammenführen überspringt identische Einträge', async () => {
    const repo = new IndexedDBRepository('test-merge')
    const e = buildFoodLog('ei', 110, { date: '2026-10-12', time: '08:00' })
    await repo.put('foodLogs', e)
    const backup = validateBackup(JSON.parse(JSON.stringify(buildBackup({ ...(await loadAll(repo)) }, createDefaultSettings())))).backup!
    const res = await importBackup(repo, backup, await loadAll(repo), 'merge')
    expect(res).toEqual({ added: 0, updated: 0, skipped: 1 })
  })

  it('ungültige Dateien werden abgelehnt, bevor etwas überschrieben wird', () => {
    expect(validateBackup({ hello: 'world' }).ok).toBe(false)
    const bad = { app: 'muscle-studio', format: 1, data: { weights: [{ id: 'x', createdAt: '', updatedAt: '', date: 'gestern', kg: 60 }] } }
    const v = validateBackup(bad)
    expect(v.ok).toBe(false)
    expect(v.errors[0]).toContain('weights[0]')
  })

  it('der Export enthält keine Spotify-Zugangsdaten', () => {
    const json = JSON.stringify(buildBackup(Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as DataSet, createDefaultSettings()))
    expect(json).not.toMatch(/access_token|refresh_token|clientId|code_verifier/i)
  })
})
