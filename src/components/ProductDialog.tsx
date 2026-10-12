import { Wand2 } from 'lucide-react'
import { useState } from 'react'
import { FOOD_MAP } from '../data/foods'
import { analyzeProduct, perPortionToPer100 } from '../domain/purchases'
import { stamp } from '../lib/id'
import { euro, num } from '../lib/format'
import { useStore } from '../state/store'
import { useToast } from '../state/toast'
import type { NutrientKey, Nutrients, Product } from '../types'
import { Disclosure, Field, Modal, NumberInput, Seg } from './ui'

const MAIN: { key: NutrientKey; label: string; unit: string }[] = [
  { key: 'kcal', label: 'Energie', unit: 'kcal' },
  { key: 'protein', label: 'Eiweiß', unit: 'g' },
  { key: 'carbs', label: 'Kohlenhydrate', unit: 'g' },
  { key: 'sugar', label: 'davon Zucker', unit: 'g' },
  { key: 'fat', label: 'Fett', unit: 'g' },
  { key: 'satFat', label: 'davon gesättigt', unit: 'g' },
  { key: 'fiber', label: 'Ballaststoffe', unit: 'g' },
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
  food: 'Lebensmittel',
  drink: 'Getränk',
  smoothie: 'Smoothie',
  protein: 'Proteinpulver',
}

/** Formularzustand eines Produkts. Nährwerte werden so eingegeben, wie sie auf dem Etikett stehen. */
export interface ProductDraft {
  kind: Product['kind']
  name: string
  brand: string
  shop: string
  unit: 'g' | 'ml'
  size?: number
  price?: number
  serving?: number
  portionLabel: string
  basis: 'per100' | 'portion'
  values: Nutrients
  salt?: number
}

export function draftFromProduct(p?: Product, kind: Product['kind'] = 'food', name = ''): ProductDraft {
  return {
    kind: p?.kind ?? kind,
    name: p?.name ?? name,
    brand: p?.brand ?? '',
    shop: p?.shop ?? '',
    unit: p?.unit ?? (kind === 'drink' || kind === 'smoothie' ? 'ml' : 'g'),
    size: p?.size,
    price: p?.price,
    serving: p?.serving,
    portionLabel: p?.portionLabel ?? '',
    basis: 'per100',
    values: p ? { ...p.per100 } : {},
    salt: p?.per100.sodium !== undefined ? Math.round((p.per100.sodium / 1000) * 2.5 * 100) / 100 : undefined,
  }
}

/** Werte pro 100 g/ml aus dem Formular berechnen (Portion → 100 g, Salz → Natrium). */
export function per100FromDraft(d: ProductDraft): Nutrients {
  const values: Nutrients = { ...d.values }
  delete values.sodium
  if (d.salt !== undefined) values.sodium = (d.salt / 2.5) * 1000
  return d.basis === 'portion' && d.serving ? perPortionToPer100(values, d.serving) : values
}

export function draftValid(d: ProductDraft): boolean {
  return !!d.name.trim() && d.values.kcal !== undefined && (d.basis === 'per100' || !!d.serving)
}

export function productFromDraft(d: ProductDraft, existing?: Product): Product {
  const base = {
    kind: d.kind,
    name: d.name.trim(),
    brand: d.brand.trim() || undefined,
    shop: d.shop.trim() || undefined,
    unit: d.unit,
    size: d.size,
    price: d.price,
    serving: d.serving,
    portionLabel: d.portionLabel.trim() || undefined,
    per100: per100FromDraft(d),
  }
  return existing ? { ...existing, ...base, updatedAt: new Date().toISOString() } : stamp<Product>({ ...base, favorite: false })
}

/** Eingabefelder für ein Produkt mit Etikettwerten und Live-Auswertung. */
export function ProductForm({ draft, onChange, suggestFoodId }: { draft: ProductDraft; onChange: (d: ProductDraft) => void; suggestFoodId?: string }) {
  const set = (patch: Partial<ProductDraft>) => onChange({ ...draft, ...patch })
  const setValue = (k: NutrientKey, v: number | undefined) => {
    const values = { ...draft.values }
    if (v === undefined) delete values[k]
    else values[k] = v
    set({ values })
  }
  const preview = draftValid(draft) ? analyzeProduct({ ...productFromDraft(draft), id: 'preview' }) : undefined
  const suggest = suggestFoodId ? FOOD_MAP[suggestFoodId] : undefined
  const basisLabel = draft.basis === 'portion' ? `pro Portion (${draft.serving ?? '?'} ${draft.unit})` : `pro 100 ${draft.unit}`

  return (
    <div className="stack">
      <Seg value={draft.kind} onChange={(kind) => set({ kind })} options={(Object.keys(PRODUCT_KIND_LABEL) as Product['kind'][]).map((k) => ({ value: k, label: PRODUCT_KIND_LABEL[k] }))} />
      <div className="form-grid">
        <Field label="Produktname">
          <input className="input" value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="z. B. Hähnchenbrustfilet 1 kg" />
        </Field>
        <Field label="Marke (optional)">
          <input className="input" value={draft.brand} onChange={(e) => set({ brand: e.target.value })} />
        </Field>
        <Field label="Laden (optional)">
          <input className="input" value={draft.shop} onChange={(e) => set({ shop: e.target.value })} placeholder="Kaufland, REWE …" list="shops" />
          <datalist id="shops">
            <option value="Kaufland" />
            <option value="REWE" />
            <option value="Lidl" />
            <option value="Aldi" />
            <option value="Netto" />
            <option value="Edeka" />
            <option value="dm" />
          </datalist>
        </Field>
        <Field label="Einheit">
          <Seg value={draft.unit} onChange={(unit) => set({ unit })} options={[{ value: 'g', label: 'Gramm' }, { value: 'ml', label: 'Milliliter' }]} />
        </Field>
        <Field label="Packungsgröße">
          <NumberInput value={draft.size} onChange={(size) => set({ size })} suffix={draft.unit} />
        </Field>
        <Field label="Preis pro Packung">
          <NumberInput value={draft.price} onChange={(price) => set({ price })} suffix="€" step={0.01} />
        </Field>
        <Field label="Deine Portion">
          <NumberInput value={draft.serving} onChange={(serving) => set({ serving })} suffix={draft.unit} placeholder="z. B. 150" />
        </Field>
        <Field label="Portion heißt (optional)">
          <input className="input" value={draft.portionLabel} onChange={(e) => set({ portionLabel: e.target.value })} placeholder="1 Becher, 1 Dose …" />
        </Field>
      </div>

      <div className="row-between" style={{ flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
        <div className="eyebrow">Nährwerte {basisLabel}, wie auf dem Etikett</div>
        <Seg value={draft.basis} onChange={(basis) => set({ basis })} options={[{ value: 'per100', label: `pro 100 ${draft.unit}` }, { value: 'portion', label: 'pro Portion' }]} />
      </div>
      {draft.basis === 'portion' && !draft.serving && <div className="tiny warn-text">Für „pro Portion“ bitte oben die Portionsgröße eintragen.</div>}
      {suggest && (
        <button
          type="button"
          className="btn btn-sm"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => set({ basis: 'per100', values: { ...suggest.per100 }, unit: suggest.unit, salt: undefined })}
        >
          <Wand2 size={14} /> Richtwerte für „{suggest.name}“ einsetzen (danach mit dem Etikett abgleichen)
        </button>
      )}
      <div className="form-grid">
        {MAIN.map((n) => (
          <Field key={n.key} label={n.label + (n.key === 'kcal' ? ' (Pflicht)' : '')}>
            <NumberInput value={draft.values[n.key]} onChange={(v) => setValue(n.key, v)} suffix={n.unit} step={0.1} />
          </Field>
        ))}
        <Field label="Salz">
          <NumberInput value={draft.salt} onChange={(salt) => set({ salt })} suffix="g" step={0.01} />
        </Field>
      </div>
      <Disclosure title="Vitamine & Mineralstoffe (falls auf dem Etikett)">
        <div className="form-grid">
          {EXTRA.map((n) => (
            <Field key={n.key} label={n.label}>
              <NumberInput value={draft.values[n.key]} onChange={(v) => setValue(n.key, v)} suffix={n.unit} step={0.1} />
            </Field>
          ))}
        </div>
      </Disclosure>

      {preview && <ProductAnalysisStrip analysis={preview} unit={draft.unit} />}
    </div>
  )
}

/** Kompakte Auswertung: was eine Portion bringt und was sie kostet. */
export function ProductAnalysisStrip({ analysis: a, unit }: { analysis: ReturnType<typeof analyzeProduct>; unit: string }) {
  return (
    <div className="analysis-strip">
      <div>
        <span className="eyebrow">1 Portion ({a.portionLabel.includes(unit) ? a.portionLabel : `${a.portionLabel}, ${a.portion} ${unit}`})</span>
        <strong className="num">
          {num(a.perPortion.kcal ?? 0)} kcal · {num(a.perPortion.protein ?? 0)} g Protein
        </strong>
      </div>
      {a.pricePerPortion !== undefined && (
        <div>
          <span className="eyebrow">Kosten / Portion</span>
          <strong className="num">{euro(a.pricePerPortion)}</strong>
        </div>
      )}
      {a.proteinPerEuro !== undefined && (
        <div>
          <span className="eyebrow">Protein pro Euro</span>
          <strong className="num">{num(a.proteinPerEuro)} g</strong>
        </div>
      )}
      {a.proteinPer100kcal !== undefined && (
        <div>
          <span className="eyebrow">Proteindichte</span>
          <strong className="num">
            {num(a.proteinPer100kcal, 1)} g / 100 kcal {a.rating === 'top' && <span className="badge badge-neon">Top</span>}
          </strong>
        </div>
      )}
      {a.portionsPerPack !== undefined && (
        <div>
          <span className="eyebrow">Portionen / Packung</span>
          <strong className="num">{num(a.portionsPerPack, 1)}</strong>
        </div>
      )}
    </div>
  )
}

/** Produkt mit Werten vom Etikett anlegen oder bearbeiten. Leere Felder bleiben „keine Daten“. */
export function ProductDialog({
  onClose,
  product,
  kind = 'food',
  onSaved,
}: {
  onClose: () => void
  product?: Product
  kind?: Product['kind']
  onSaved?: (p: Product) => void
}) {
  const store = useStore()
  const { toast } = useToast()
  const [draft, setDraft] = useState<ProductDraft>(() => draftFromProduct(product, kind))

  async function save() {
    if (!draftValid(draft)) return
    const record = productFromDraft(draft, product)
    await store.save('products', record)
    toast('Produkt gespeichert')
    onSaved?.(record)
    onClose()
  }

  return (
    <Modal
      title={product ? 'Produkt bearbeiten' : 'Produkt anlegen'}
      onClose={onClose}
      wide
      footer={
        <>
          <span className="muted small grow">Werte vom Etikett. Leere Felder werden nicht als 0 gezählt.</span>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" disabled={!draftValid(draft)} onClick={save}>
            Speichern
          </button>
        </>
      }
    >
      <ProductForm draft={draft} onChange={setDraft} />
    </Modal>
  )
}
