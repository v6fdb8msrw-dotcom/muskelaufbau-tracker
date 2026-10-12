import { useState } from 'react'
import { todayISO } from '../lib/date'
import { stamp } from '../lib/id'
import { useStore } from '../state/store'
import { useToast } from '../state/toast'
import type { ArmMeasurement, WeightEntry } from '../types'
import { Field, Modal, NumberInput, Seg } from './ui'

export function WeightDialog({ onClose, entry }: { onClose: () => void; entry?: WeightEntry }) {
  const store = useStore()
  const { toast } = useToast()
  const last = [...store.data.weights].sort((a, b) => b.date.localeCompare(a.date))[0]
  const [date, setDate] = useState(entry?.date ?? todayISO())
  const [kg, setKg] = useState<number | undefined>(entry?.kg ?? last?.kg ?? store.settings.profile.startWeightKg)
  const [note, setNote] = useState(entry?.note ?? '')
  const existingSameDay = !entry && store.data.weights.find((w) => w.date === date)

  async function save() {
    if (!kg || kg < 20 || kg > 300) return
    const record: WeightEntry = entry
      ? { ...entry, date, kg, note: note || undefined, updatedAt: new Date().toISOString() }
      : stamp<WeightEntry>({ date, kg, note: note || undefined } as WeightEntry)
    await store.save('weights', record)
    toast('Gewicht gespeichert')
    onClose()
  }

  return (
    <Modal
      title={entry ? 'Gewicht bearbeiten' : 'Gewicht eintragen'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" disabled={!kg} onClick={save}>
            Speichern
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="form-grid">
          <Field label="Datum">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Gewicht">
            <NumberInput value={kg} onChange={setKg} suffix="kg" step={0.1} min={20} max={300} />
          </Field>
        </div>
        <Field label="Notiz (optional)">
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="z. B. morgens nüchtern" />
        </Field>
        {existingSameDay && <div className="muted small">Für diesen Tag gibt es schon einen Wert ({existingSameDay.kg} kg). Beide fließen als Tagesmittel ein.</div>}
        <div className="muted small">Tipp: Am besten morgens nach dem Aufstehen wiegen. Einzelwerte schwanken, entscheidend ist der 7-Tage-Durchschnitt.</div>
      </div>
    </Modal>
  )
}

export function ArmDialog({ onClose, entry }: { onClose: () => void; entry?: ArmMeasurement }) {
  const store = useStore()
  const { toast } = useToast()
  const [date, setDate] = useState(entry?.date ?? todayISO())
  const [left, setLeft] = useState<number | undefined>(entry?.leftCm)
  const [right, setRight] = useState<number | undefined>(entry?.rightCm)
  const [state, setState] = useState<ArmMeasurement['state']>(entry?.state ?? 'angespannt')
  const [note, setNote] = useState(entry?.note ?? '')

  async function save() {
    if (!left || !right) return
    const record: ArmMeasurement = entry
      ? { ...entry, date, leftCm: left, rightCm: right, state, note: note || undefined, updatedAt: new Date().toISOString() }
      : stamp<ArmMeasurement>({ date, leftCm: left, rightCm: right, state, note: note || undefined } as ArmMeasurement)
    await store.save('arms', record)
    toast('Armumfang gespeichert')
    onClose()
  }

  return (
    <Modal
      title="Oberarmumfang messen"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" disabled={!left || !right} onClick={save}>
            Speichern
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="form-grid">
          <Field label="Datum">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Links">
            <NumberInput value={left} onChange={setLeft} suffix="cm" step={0.1} />
          </Field>
          <Field label="Rechts">
            <NumberInput value={right} onChange={setRight} suffix="cm" step={0.1} />
          </Field>
        </div>
        <div className="row-wrap">
          <span className="field-label">Zustand</span>
          <Seg value={state} onChange={setState} options={[{ value: 'angespannt', label: 'Angespannt' }, { value: 'entspannt', label: 'Entspannt' }]} />
        </div>
        <Field label="Notiz (optional)">
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="muted small">
          Messen an der dicksten Stelle des Oberarms, immer gleich (z. B. morgens, vor dem Training). Vergleiche nur Messungen mit demselben Zustand.
        </div>
      </div>
    </Modal>
  )
}
