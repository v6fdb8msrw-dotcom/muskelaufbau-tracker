import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { createDefaultSettings } from '../data/defaults'
import { COLLECTIONS, type DataSet, type ShoppingItem } from '../types'
import { IndexedDBRepository } from './indexeddb'
import { applyMerge, buildSyncFile, deviceLabel, parseSyncFile, planIsEmpty, planMerge, pruneTombstones, syncFileName, type SyncState } from './sync'

function emptyData(): DataSet {
  return Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as DataSet
}

const item = (id: string, updatedAt: string, patch: Partial<ShoppingItem> = {}): ShoppingItem => ({
  id,
  createdAt: '2026-10-12T08:00:00.000Z',
  updatedAt,
  week: '2026-10-12',
  name: id,
  packs: 1,
  checked: false,
  inBudget: true,
  ...patch,
})

function state(items: ShoppingItem[], patch: Partial<SyncState> = {}): SyncState {
  const data = emptyData()
  data.shoppingItems = items
  return { data, settings: createDefaultSettings(), tombstones: [], ...patch }
}

const T1 = '2026-10-12T09:00:00.000Z'
const T2 = '2026-10-12T10:00:00.000Z'
const T3 = '2026-10-12T11:00:00.000Z'

describe('Abgleich zwischen iPhone und Mac', () => {
  it('neue Einträge kommen dazu, der neuere Stand gewinnt', () => {
    const mac = state([item('skyr', T1), item('cola', T2, { checked: true })])
    const iphone = buildSyncFile(state([item('skyr', T2, { checked: true }), item('cola', T1), item('quark', T1)]), 'iphone', 'iPhone')
    const plan = planMerge(mac, iphone)
    expect(plan.added).toBe(1)
    expect(plan.updated).toBe(1)
    expect(plan.writes.shoppingItems?.map((x) => x.id).sort()).toEqual(['quark', 'skyr'])
    expect(plan.deleted).toBe(0)
  })

  it('Gelöschtes bleibt gelöscht, in beide Richtungen', () => {
    // Auf dem iPhone gelöscht → auf dem Mac entfernen
    const mac = state([item('skyr', T1)])
    const iphone = buildSyncFile(state([], { tombstones: [{ c: 'shoppingItems', id: 'skyr', at: T2 }] }), 'iphone')
    const plan = planMerge(mac, iphone)
    expect(plan.deletes.shoppingItems).toEqual(['skyr'])
    // Auf dem Mac gelöscht → kommt vom iPhone nicht zurück
    const mac2 = state([], { tombstones: [{ c: 'shoppingItems', id: 'skyr', at: T2 }] })
    const iphone2 = buildSyncFile(state([item('skyr', T1)]), 'iphone')
    expect(planIsEmpty(planMerge(mac2, iphone2))).toBe(true)
  })

  it('später bearbeitet schlägt früher gelöscht', () => {
    const mac = state([item('skyr', T3)])
    const iphone = buildSyncFile(state([], { tombstones: [{ c: 'shoppingItems', id: 'skyr', at: T2 }] }), 'iphone')
    expect(planMerge(mac, iphone).deleted).toBe(0)
  })

  it('Einstellungen vom Gerät mit der letzten Änderung', () => {
    const remoteSettings = { ...createDefaultSettings(), favorites: ['r131'] }
    const iphone = buildSyncFile({ ...state([]), settings: remoteSettings, settingsUpdatedAt: T2 }, 'iphone')
    expect(planMerge(state([], { settingsUpdatedAt: T1 }), iphone).settings?.favorites).toEqual(['r131'])
    expect(planMerge(state([], { settingsUpdatedAt: T3 }), iphone).settings).toBeUndefined()
  })

  it('Datei hin und zurück: gleicher Stand, nichts mehr zu tun', async () => {
    const iphone = state([item('skyr', T1), item('cola', T2)])
    const raw = JSON.parse(JSON.stringify(buildSyncFile(iphone, 'iphone', 'iPhone')))
    const parsed = parseSyncFile(raw)
    expect(parsed.ok).toBe(true)
    const repo = new IndexedDBRepository('test-sync')
    const plan = planMerge(state([]), parsed.file!)
    await applyMerge(repo, plan)
    expect((await repo.getAll('shoppingItems')).map((x) => x.id).sort()).toEqual(['cola', 'skyr'])
    expect(await repo.getMeta('lastSyncAt')).toBeDefined()
    expect(planIsEmpty(planMerge(iphone, parsed.file!))).toBe(true)
  })

  it('fremde Dateien werden abgelehnt, alte Grabsteine vergessen', () => {
    expect(parseSyncFile({ app: 'etwas-anderes', format: 1, data: {} }).ok).toBe(false)
    const pruned = pruneTombstones(
      [
        { c: 'foodLogs', id: 'alt', at: '2024-01-01T00:00:00.000Z' },
        { c: 'foodLogs', id: 'neu', at: T1 },
        { c: 'foodLogs', id: 'neu', at: T2 },
      ],
      new Date(T3),
    )
    expect(pruned).toEqual([{ c: 'foodLogs', id: 'neu', at: T2 }])
  })

  it('Dateiname und Gerät', () => {
    expect(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe('iPhone')
    expect(deviceLabel('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('Mac')
    expect(syncFileName(new Date(2026, 9, 12, 12, 5), 'iPhone')).toBe('muscle-studio-sync-iphone-2026-10-12-1205.json')
  })
})
