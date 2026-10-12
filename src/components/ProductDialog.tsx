import { useState } from 'react'
import { stamp } from '../lib/id'
import { useStore } from '../state/store'
import { useToast } from '../state/toast'
import type { NutrientKey, Nutrients, Product } from '../types'
import { Disclosure, Field, Modal, NumberInput, Seg } from './ui'

const MAIN: { key: NutrientKey; label: string; unit: string }[] = [
  { key: 'kcal', label: 'Energie', unit: 'kcal' },
  { key: 'fat', label: 'Fett', unit: 'g' },
  { key: 'satFat', label: 'davon gesättigt', unit: 'g' },
  { key: 'carbs', label: 'Kohlenhydrate', unit: 'g' },
  { key: 'sugar', label: 'davon Zucker', unit: 'g' },
  { key: 'fiber', label: 'Ballaststoffe', unit: 'g' },
  { key: 'protein', label: 'Eiweiß', unit: 'g' },
]

const EXTRA: { key: NutrientKey; label: string; unit: string }[] = [
  { key: 'vitC', label: 'Vitamin C', unit: 'mg' },
  { key: 'vitA', label: 'Vitamin A', unit: 'µg' },
  { key: 'vitD', label: 'Vitamin D', unit: 'µg' },
  { key: 'vitE', label: 'Vitamin E', unit: 'mg' },
  { key: 'b1', label: 'Vitamin B1', unit: 'mg' },
  { key: 'b2', label: 'Vitamin B2', unit: 'mg' },
  { key: 'b3', label: 'Niacin', unit: 'mg' },
  { key: 'b6', label: 'Vitamin B6', unit: 'mg' },
  { key: 'b12', label: 'Vitamin B12', unit: 'µg' },
  { key: 'folate', label: 'Folsäure', unit: 'µg' },
  { key: 'calcium', label: 'Calcium', unit: 'mg' },
  { key: 'magnesium', label: 'Magnesium', unit: 'mg' },
  { key: 'potassium', label: 'Kalium', unit: 'mg' },
  { key: 'iron', label: 'Eisen', unit: 'mg' },
  { key: 'zinc', label: 'Zink', unit: 'mg' },
  { key: 'iodine', label: 'Jod', unit: 'µg' },
]

export const PRODUCT_KIND_LABEL: Record<Product['kind'], string> = {
  smoothie: 'Smoothie',
  protein: 'Proteinpulver',
  drink: 'Getränk',
  food: 'Lebensmittel',
}

/** Produkt mit Werten vom Etikett anlegen. Leere Felder bleiben „keine Daten“. */
export function ProductDialog({ onClose, product, kind: initialKind = 'smoothie' }: { onClose: () => void; product?: Product; kind?: Product['kind'] }) {
  const store = useStore()
  const { toast } = useToast()
  const [kind, setKind] = useState<Product['kind']>(product?.kind ?? initialKind)
  const [name, setName] = useState(product?.name ?? '')
  const [brand, setBrand] = useState(product?.brand ?? '')
  const [shop, setShop] = useState(product?.shop ?? '')
  const [size, setSize] = useState<number | undefined>(product?.size)
  const [price, setPrice] = useState<number | undefined>(product?.price)
  const [values, setValues] = useState<Nutrients>(product?.per100 ?? {})
  const [salt, setSalt] = useState<number | undefined>(product?.per100.sodium !== undefined ? Math.round((product.per100.sodium / 1000) * 2.5 * 100) / 100 : undefined)
  const unit: Product['unit'] = kind === 'protein' || kind === 'food' ? 'g' : 'ml'

  const set = (k: NutrientKey, v: number | undefined) => {
    const next = { ...values }
    if (v === undefined) delete next[k]
    else next[k] = v
    setValues(next)
  }

  async function save() {
    if (!name.trim() || values.kcal === undefined) return
    const per100 = { ...values }
    if (salt !== undefined) per100.sodium = (salt / 2.5) * 1000
    else delete per100.sodium
    const record: Product = product
      ? { ...product, kind, name: name.trim(), brand: brand || undefined, shop: shop || undefined, unit, size, price, per100, updatedAt: new Date().toISOString() }
      : stamp<Product>({ kind, name: name.trim(), brand: brand || undefined, shop: shop || undefined, unit, size, price, per100, favorite: false } as Product)
    await store.save('products', record)
    toast('Produkt gespeichert')
    onClose()
  }

  return (
    <Modal
      title={product ? 'Produkt bearbeiten' : 'Produkt anlegen'}
      onClose={onClose}
      wide
      footer={
        <>
          <span className="muted small grow">Nur Werte vom Etikett eintragen. Leere Felder werden nicht als 0 gezählt.</span>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" disabled={!name.trim() || values.kcal === undefined} onClick={save}>
            Speichern
          </button>
        </>
      }
    >
      <div className="stack">
        <Seg
          value={kind}
          onChange={setKind}
          options={(Object.keys(PRODUCT_KIND_LABEL) as Product['kind'][]).map((k) => ({ value: k, label: PRODUCT_KIND_LABEL[k] }))}
        />
        <div className="form-grid">
          <Field label="Produktname">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'smoothie' ? 'z. B. Mango-Maracuja-Smoothie' : ''} />
          </Field>
          <Field label="Marke (optional)">
            <input className="input" value={brand} onChange={(e) => setBrand(e.target.value)} />
          </Field>
          <Field label="Laden (optional)">
            <input className="input" value={shop} onChange={(e) => setShop(e.target.value)} placeholder="Kaufland, REWE …" list="shops" />
            <datalist id="shops">
              <option value="Kaufland" />
              <option value="REWE" />
              <option value="Lidl" />
              <option value="Aldi" />
              <option value="dm" />
            </datalist>
          </Field>
          <Field label={kind === 'protein' ? 'Packungsgröße' : 'Flaschen-/Packungsgröße'}>
            <NumberInput value={size} onChange={setSize} suffix={unit} />
          </Field>
          <Field label="Preis (optional)">
            <NumberInput value={price} onChange={setPrice} suffix="€" step={0.01} />
          </Field>
        </div>
        <div className="eyebrow" style={{ marginTop: 6 }}>
          Nährwerte pro 100 {unit} laut Etikett
        </div>
        <div className="form-grid">
          {MAIN.map((n) => (
            <Field key={n.key} label={n.label + (n.key === 'kcal' ? ' (Pflicht)' : '')}>
              <NumberInput value={values[n.key]} onChange={(v) => set(n.key, v)} suffix={n.unit} step={0.1} />
            </Field>
          ))}
          <Field label="Salz">
            <NumberInput value={salt} onChange={setSalt} suffix="g" step={0.01} />
          </Field>
        </div>
        <Disclosure title="Vitamine & Mineralstoffe (falls auf dem Etikett)">
          <div className="form-grid">
            {EXTRA.map((n) => (
              <Field key={n.key} label={n.label}>
                <NumberInput value={values[n.key]} onChange={(v) => set(n.key, v)} suffix={n.unit} step={0.1} />
              </Field>
            ))}
          </div>
        </Disclosure>
      </div>
    </Modal>
  )
}
