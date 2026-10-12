import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { migrateSettings, normalizeSettings } from '../data/defaults'
import { ESN_PRODUCTS } from '../data/supplements'
import { uid } from '../lib/id'
import { IndexedDBRepository } from '../storage/indexeddb'
import { META_LAST_SYNC, META_SETTINGS_UPDATED, META_TOMBSTONES, pruneTombstones, type Tombstone } from '../storage/sync'
import type { DataRepository } from '../storage/repository'
import { COLLECTIONS, type CollectionMap, type CollectionName, type DataSet, type Settings } from '../types'

export interface Meta {
  deviceId: string
  lastBackupAt?: string
  firstRunAt?: string
  /** Letzter Abgleich mit einem anderen Gerät */
  lastSyncAt?: string
}

export interface Store {
  ready: boolean
  error?: string
  data: DataSet
  settings: Settings
  meta: Meta
  repo: DataRepository
  save<C extends CollectionName>(collection: C, items: CollectionMap[C] | CollectionMap[C][]): Promise<void>
  remove<C extends CollectionName>(collection: C, ids: string | string[]): Promise<void>
  updateSettings(updater: (s: Settings) => Settings): Promise<void>
  setMeta(patch: Partial<Meta>): Promise<void>
  reload(): Promise<void>
}

const emptyData = (): DataSet => Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as DataSet

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children, repo: repoProp }: { children: ReactNode; repo?: DataRepository }) {
  const [repo] = useState<DataRepository>(() => repoProp ?? new IndexedDBRepository())
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string>()
  const [data, setData] = useState<DataSet>(emptyData)
  const [settings, setSettings] = useState<Settings>(() => normalizeSettings(undefined))
  const [meta, setMetaState] = useState<Meta>({ deviceId: '' })

  const load = useCallback(async () => {
    try {
      const next = emptyData()
      for (const c of COLLECTIONS) (next as Record<string, unknown[]>)[c] = await repo.getAll(c)
      const { settings: s, changed } = migrateSettings(await repo.getSettings())
      if (changed) await repo.saveSettings(s)
      // ESN-Produkte einmalig mitliefern (gelöschte kommen nicht wieder)
      if (!(await repo.getMeta<boolean>('seed.esn'))) {
        const missing = ESN_PRODUCTS.filter((p) => !next.products.some((x) => x.id === p.id))
        if (missing.length) await repo.putMany('products', missing)
        next.products = [...next.products, ...missing]
        await repo.setMeta('seed.esn', true)
      }
      let deviceId = await repo.getMeta<string>('deviceId')
      if (!deviceId) {
        deviceId = uid()
        await repo.setMeta('deviceId', deviceId)
      }
      let firstRunAt = await repo.getMeta<string>('firstRunAt')
      if (!firstRunAt) {
        firstRunAt = new Date().toISOString()
        await repo.setMeta('firstRunAt', firstRunAt)
      }
      const lastBackupAt = await repo.getMeta<string>('lastBackupAt')
      const lastSyncAt = await repo.getMeta<string>(META_LAST_SYNC)
      setData(next)
      setSettings(s)
      setMetaState({ deviceId, lastBackupAt, firstRunAt, lastSyncAt })
      setReady(true)
      setError(undefined)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setReady(true)
    }
  }, [repo])

  useEffect(() => {
    void load()
  }, [load])

  const save = useCallback(
    async <C extends CollectionName>(collection: C, items: CollectionMap[C] | CollectionMap[C][]) => {
      const list = Array.isArray(items) ? items : [items]
      setData((prev) => {
        const map = new Map((prev[collection] as { id: string }[]).map((x) => [x.id, x]))
        for (const item of list) map.set((item as { id: string }).id, item as never)
        return { ...prev, [collection]: [...map.values()] }
      })
      try {
        if (list.length === 1) await repo.put(collection, list[0])
        else await repo.putMany(collection, list)
      } catch (e) {
        setError(`Speichern fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`)
        await load()
        throw e
      }
    },
    [repo, load],
  )

  const remove = useCallback(
    async <C extends CollectionName>(collection: C, ids: string | string[]) => {
      const list = Array.isArray(ids) ? ids : [ids]
      setData((prev) => ({ ...prev, [collection]: (prev[collection] as { id: string }[]).filter((x) => !list.includes(x.id)) }))
      try {
        for (const id of list) await repo.remove(collection, id)
        // Löschungen merken, damit ein Abgleich mit dem anderen Gerät sie nicht zurückholt
        const at = new Date().toISOString()
        const tombstones = (await repo.getMeta<Tombstone[]>(META_TOMBSTONES)) ?? []
        await repo.setMeta(META_TOMBSTONES, pruneTombstones([...tombstones, ...list.map((id) => ({ c: collection, id, at }))]))
      } catch (e) {
        setError(`Löschen fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`)
        await load()
        throw e
      }
    },
    [repo, load],
  )

  const settingsRef = useRef(settings)
  useLayoutEffect(() => {
    settingsRef.current = settings
  }, [settings])

  const updateSettings = useCallback(
    async (updater: (s: Settings) => Settings) => {
      const next = normalizeSettings(updater(settingsRef.current))
      settingsRef.current = next
      setSettings(next)
      await repo.saveSettings(next)
      await repo.setMeta(META_SETTINGS_UPDATED, new Date().toISOString())
    },
    [repo],
  )

  const setMeta = useCallback(
    async (patch: Partial<Meta>) => {
      setMetaState((m) => ({ ...m, ...patch }))
      for (const [k, v] of Object.entries(patch)) await repo.setMeta(k, v)
    },
    [repo],
  )

  const value = useMemo<Store>(
    () => ({ ready, error, data, settings, meta, repo, save, remove, updateSettings, setMeta, reload: load }),
    [ready, error, data, settings, meta, repo, save, remove, updateSettings, setMeta, load],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore außerhalb von StoreProvider')
  return ctx
}
