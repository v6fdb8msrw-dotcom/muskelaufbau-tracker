import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { COLLECTIONS, type CollectionMap, type CollectionName, type Settings } from '../types'
import type { DataRepository, MetaRecord } from './repository'

const DB_NAME = 'muscle-studio'
// Version 2: Sammlung „shoppingItems“ (Freihand-Einkaufsliste)
const DB_VERSION = 2

type Schema = DBSchema & {
  [K in CollectionName]: { key: string; value: CollectionMap[K] }
} & {
  meta: { key: string; value: MetaRecord }
}

/** Lokale Speicherung in der IndexedDB des Browsers bzw. der installierten Web-App. */
export class IndexedDBRepository implements DataRepository {
  readonly kind = 'indexeddb'
  readonly label = 'Lokal auf diesem Gerät (IndexedDB)'
  private dbPromise: Promise<IDBPDatabase<Schema>>

  constructor(name = DB_NAME) {
    this.dbPromise = openDB<Schema>(name, DB_VERSION, {
      upgrade(db) {
        for (const c of COLLECTIONS) {
          if (!db.objectStoreNames.contains(c)) db.createObjectStore(c, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' })
      },
    })
  }

  async getAll<C extends CollectionName>(collection: C): Promise<CollectionMap[C][]> {
    const db = await this.dbPromise
    return (await db.getAll(collection as never)) as CollectionMap[C][]
  }

  async put<C extends CollectionName>(collection: C, item: CollectionMap[C]): Promise<void> {
    const db = await this.dbPromise
    await db.put(collection as never, item as never)
  }

  async putMany<C extends CollectionName>(collection: C, items: CollectionMap[C][]): Promise<void> {
    const db = await this.dbPromise
    const tx = db.transaction(collection as never, 'readwrite')
    await Promise.all([...items.map((i) => tx.store.put(i as never)), tx.done])
  }

  async remove<C extends CollectionName>(collection: C, id: string): Promise<void> {
    const db = await this.dbPromise
    await db.delete(collection as never, id)
  }

  async clear(collection?: CollectionName): Promise<void> {
    const db = await this.dbPromise
    const names = collection ? [collection] : [...COLLECTIONS]
    for (const n of names) await db.clear(n as never)
    if (!collection) await db.clear('meta')
  }

  async getSettings(): Promise<Settings | undefined> {
    return this.getMeta<Settings>('settings')
  }

  async saveSettings(settings: Settings): Promise<void> {
    await this.setMeta('settings', settings)
  }

  async getMeta<T = unknown>(key: string): Promise<T | undefined> {
    const db = await this.dbPromise
    const rec = await db.get('meta', key)
    return rec?.value as T | undefined
  }

  async setMeta(key: string, value: unknown): Promise<void> {
    const db = await this.dbPromise
    await db.put('meta', { key, value })
  }
}
