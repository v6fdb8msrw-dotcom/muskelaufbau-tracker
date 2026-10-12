export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

interface RecordMeta {
  id: string
  createdAt: string
  updatedAt: string
}

/** Vergibt ID und Zeitstempel für einen neuen Datensatz. */
export function stamp<T extends RecordMeta = RecordMeta>(item: Omit<T, keyof RecordMeta> & Partial<RecordMeta>): T {
  const now = new Date().toISOString()
  return { ...item, id: item.id ?? uid(), createdAt: item.createdAt ?? now, updatedAt: now } as T
}
