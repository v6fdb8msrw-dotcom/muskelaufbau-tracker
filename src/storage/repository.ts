import type { CollectionMap, CollectionName, Settings } from '../types'

export interface MetaRecord {
  key: string
  value: unknown
}

/**
 * Datenzugriffsschicht. Die App spricht nur mit diesem Interface und weiß nicht,
 * wo die Daten liegen. Heute gibt es nur die lokale IndexedDB-Implementierung.
 * Eine spätere Synchronisierung (z. B. mit einem Server auf dem Mac) kann als weitere
 * Implementierung ergänzt werden, ohne Oberfläche oder Berechnungen anzufassen.
 * Siehe docs/SYNC.md.
 */
export interface DataRepository {
  readonly kind: string
  /** Kurze Beschreibung für die Anzeige („Lokal auf diesem Gerät“) */
  readonly label: string
  getAll<C extends CollectionName>(collection: C): Promise<CollectionMap[C][]>
  put<C extends CollectionName>(collection: C, item: CollectionMap[C]): Promise<void>
  putMany<C extends CollectionName>(collection: C, items: CollectionMap[C][]): Promise<void>
  remove<C extends CollectionName>(collection: C, id: string): Promise<void>
  clear(collection?: CollectionName): Promise<void>
  getSettings(): Promise<Settings | undefined>
  saveSettings(settings: Settings): Promise<void>
  getMeta<T = unknown>(key: string): Promise<T | undefined>
  setMeta(key: string, value: unknown): Promise<void>
}
