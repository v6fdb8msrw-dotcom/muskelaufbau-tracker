import { ArrowDownToLine, CheckCircle2, Share } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { COLLECTION_LABEL } from '../data/collections'
import { relativeTime } from '../lib/date'
import { useStore } from '../state/store'
import { useToast } from '../state/toast'
import {
  applyMerge,
  buildSyncFile,
  deviceLabel,
  META_SETTINGS_UPDATED,
  META_TOMBSTONES,
  parseSyncFile,
  planIsEmpty,
  planMerge,
  shareOrDownload,
  syncFileName,
  type MergePlan,
  type SyncFile,
  type SyncState,
  type Tombstone,
} from '../storage/sync'
import type { CollectionName } from '../types'
import { Modal, Notice, Switch } from './ui'

function canShareFiles(): boolean {
  try {
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
    return !!nav.share && !!nav.canShare?.({ files: [new File(['{}'], 'test.json', { type: 'application/json' })] })
  } catch {
    return false
  }
}

/** iPhone ↔ Mac per AirDrop abgleichen: senden oder eine empfangene Datei übernehmen. */
export function SyncDialog({ onClose }: { onClose: () => void }) {
  const store = useStore()
  const { data, settings, meta, repo } = store
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [preview, setPreview] = useState<{ file: SyncFile; plan: MergePlan; settingsDiffer: boolean }>()
  const [withSettings, setWithSettings] = useState(false)
  const device = deviceLabel()
  const other = device === 'iPhone' ? 'Mac' : device === 'Mac' ? 'iPhone' : 'anderen Gerät'
  const toOther = other === 'Mac' ? 'deinen Mac' : other === 'iPhone' ? 'dein iPhone' : 'das andere Gerät'
  const share = useMemo(canShareFiles, [])

  async function localState(): Promise<SyncState> {
    return {
      data,
      settings,
      tombstones: (await repo.getMeta<Tombstone[]>(META_TOMBSTONES)) ?? [],
      settingsUpdatedAt: await repo.getMeta<string>(META_SETTINGS_UPDATED),
    }
  }

  async function send() {
    setBusy(true)
    setError(undefined)
    try {
      const sync = buildSyncFile(await localState(), meta.deviceId, device)
      const file = new File([JSON.stringify(sync)], syncFileName(new Date(), device), { type: 'application/json' })
      const result = await shareOrDownload(file)
      if (result === 'cancelled') return
      await store.setMeta({ lastBackupAt: new Date().toISOString() })
      toast(result === 'shared' ? `Gesendet. Am ${other} jetzt „Übernehmen“ wählen.` : 'Datei liegt in Downloads. Im Finder per Rechtsklick → Teilen → AirDrop senden.')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function read(f: File) {
    setError(undefined)
    setPreview(undefined)
    try {
      const parsed = parseSyncFile(JSON.parse(await f.text()))
      if (!parsed.ok || !parsed.file) {
        setError(parsed.errors.slice(0, 3).join(' '))
        return
      }
      if (parsed.file.sync.deviceId && parsed.file.sync.deviceId === meta.deviceId) {
        setError(`Diese Datei wurde auf diesem Gerät erstellt. Bitte die Datei vom ${other} wählen.`)
        return
      }
      const local = await localState()
      const plan = planMerge(local, parsed.file)
      setPreview({ file: parsed.file, plan, settingsDiffer: JSON.stringify(parsed.file.settings) !== JSON.stringify(local.settings) })
      setWithSettings(false)
    } catch {
      setError('Die Datei konnte nicht gelesen werden. Ist es eine Muscle-Studio-Datei (.json)?')
    }
  }

  async function apply() {
    if (!preview) return
    setBusy(true)
    try {
      const plan =
        withSettings && !preview.plan.settings ? { ...preview.plan, settings: preview.file.settings, settingsUpdatedAt: new Date().toISOString() } : preview.plan
      await applyMerge(repo, plan)
      await store.reload()
      const parts = [plan.added && `${plan.added} neu`, plan.updated && `${plan.updated} aktualisiert`, plan.deleted && `${plan.deleted} gelöscht`].filter(Boolean)
      toast(parts.length ? `Abgeglichen: ${parts.join(', ')}` : plan.settings ? 'Einstellungen übernommen' : 'Schon auf dem gleichen Stand')
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const p = preview?.plan
  const nothing = p && planIsEmpty(p) && !(withSettings && preview.settingsDiffer)

  return (
    <Modal
      title={other === 'anderen Gerät' ? 'Geräte abgleichen' : `${device} ↔ ${other}`}
      onClose={onClose}
      footer={
        preview ? (
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setPreview(undefined)}>
              Zurück
            </button>
            <button type="button" className="btn btn-primary" disabled={busy || nothing} onClick={apply}>
              Übernehmen
            </button>
          </>
        ) : (
          <span className="muted small grow">{meta.lastSyncAt ? `Zuletzt übernommen ${relativeTime(meta.lastSyncAt)}` : 'Noch kein Abgleich auf diesem Gerät'}</span>
        )
      }
    >
      {!preview ? (
        <div className="stack">
          <div className="sync-step">
            <span className="sync-num">1</span>
            <div className="grow">
              <div className="strong">Senden</div>
              <div className="muted small">
                {share
                  ? `Erstellt eine Datei mit all deinen Daten und öffnet das Teilen-Menü. Dort AirDrop und ${toOther} wählen.`
                  : `Erstellt eine Datei mit all deinen Daten in Downloads. Im Finder per Rechtsklick → Teilen → AirDrop an ${toOther} senden.`}
              </div>
              <button type="button" className="btn btn-primary" style={{ marginTop: 10 }} disabled={busy} onClick={send}>
                <Share size={16} /> {share ? 'Per AirDrop senden' : 'Datei erstellen'}
              </button>
            </div>
          </div>
          <div className="sync-step">
            <span className="sync-num">2</span>
            <div className="grow">
              <div className="strong">Übernehmen</div>
              <div className="muted small">
                {device === 'iPhone'
                  ? 'Die Datei vom Mac auswählen. Nach AirDrop liegt sie in der App „Dateien“ (falls gefragt: „In Dateien sichern“).'
                  : `Die Datei vom ${other} auswählen. Nach AirDrop liegt sie im Ordner Downloads.`}{' '}
                Zusammengeführt wird Eintrag für Eintrag: Neues kommt dazu, der neuere Stand gewinnt, Gelöschtes bleibt gelöscht.
              </div>
              <button type="button" className="btn" style={{ marginTop: 10 }} onClick={() => fileRef.current?.click()}>
                <ArrowDownToLine size={16} /> Datei auswählen
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) void read(f)
                }}
              />
            </div>
          </div>
          {error && <Notice kind="warn">{error}</Notice>}
        </div>
      ) : (
        <div className="stack">
          <div className="muted small">
            Datei vom {preview.file.sync.device} · {preview.file.exportedAt ? relativeTime(preview.file.exportedAt) : 'unbekannt'}
          </div>
          {p && !planIsEmpty(p) ? (
            <div className="list">
              {(Object.keys(p.perCollection) as CollectionName[]).map((c) => (
                <div key={c} className="list-item">
                  <div className="grow title">{COLLECTION_LABEL[c]}</div>
                  <span className="badge">{p.perCollection[c]} Änderung(en)</span>
                </div>
              ))}
              {p.settings && (
                <div className="list-item">
                  <div className="grow title">Einstellungen</div>
                  <span className="badge badge-neon">dort zuletzt geändert</span>
                </div>
              )}
            </div>
          ) : (
            <Notice kind="neon" icon={<CheckCircle2 size={17} />}>
              Die Einträge sind schon auf dem gleichen Stand.
            </Notice>
          )}
          {p && (
            <div className="row-wrap small">
              <span className="badge">{p.added} neu</span>
              <span className="badge">{p.updated} aktualisiert</span>
              <span className="badge">{p.deleted} gelöscht</span>
            </div>
          )}
          {!p?.settings && preview.settingsDiffer && (
            <Switch checked={withSettings} onChange={setWithSettings} label={`Auch die Einstellungen vom ${preview.file.sync.device} übernehmen`} />
          )}
          {error && <Notice kind="warn">{error}</Notice>}
        </div>
      )}
    </Modal>
  )
}
