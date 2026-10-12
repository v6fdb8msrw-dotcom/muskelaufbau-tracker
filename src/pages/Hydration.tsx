import { Droplets, Pencil, Plus, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BarChart } from '../components/charts'
import { ConfirmButton } from '../components/ConfirmButton'
import { DrinkQuick } from '../components/DrinkQuick'
import { useDayTotals, useToday } from '../components/hooks'
import { ProductDialog, PRODUCT_KIND_LABEL } from '../components/ProductDialog'
import { Card, CardHead, Field, Modal, NumberInput, Notice, PageHead, Ring, Seg, Switch } from '../components/ui'
import { FLUID_DGE_ML } from '../data/nutrients'
import { ESN_CREATINE } from '../data/supplements'
import { dayTotals, productProfile } from '../domain/nutrition'
import { addDays, WEEKDAY_SHORT, weekdayIndex } from '../lib/date'
import { ml, num } from '../lib/format'
import { buildCreatineLog, buildProteinLog } from '../state/actions'
import { href } from '../state/router'
import { useStore } from '../state/store'
import { useToast } from '../state/toast'
import type { Product } from '../types'

export default function Hydration() {
  const store = useStore()
  const { data, settings } = store
  const { toast } = useToast()
  const today = useToday()
  const totals = useDayTotals(today)
  const [productDialog, setProductDialog] = useState<{ product?: Product; kind?: Product['kind'] } | null>(null)
  const [shake, setShake] = useState(false)
  const t = settings.targets
  const drinks = data.drinkLogs.filter((d) => d.date === today).sort((a, b) => b.time.localeCompare(a.time))
  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(today, i - 6)
        const tot = dayTotals(data, d)
        return { label: WEEKDAY_SHORT[weekdayIndex(d)], value: tot.entryCount ? tot.fluidMl : undefined, highlight: d === today }
      }),
    [data, today],
  )
  const creatineToday = data.supplementLogs.filter((s) => s.date === today && s.kind === 'creatine')
  const proteinFromFood = (totals.profile.values.protein ?? 0) - data.supplementLogs.filter((s) => s.date === today && s.kind === 'protein').reduce((s, x) => s + (x.nutrients.protein ?? 0), 0)
  const proteinGap = t.protein - (totals.profile.values.protein ?? 0)
  const proteinProducts = data.products.filter((p) => p.kind === 'protein')
  const drinkKcal = drinks.reduce((s, d) => s + (d.nutrients.kcal ?? 0), 0)

  return (
    <div className="page">
      <PageHead eyebrow="Getränke & Supplements" title="Trinken & Hydration" lead={`Orientierung ${ml(t.fluidMl)} pro Tag (DGE-Richtwert für Getränke: ${ml(FLUID_DGE_ML)}). Kalorienhaltige Getränke zählen automatisch zum Ernährungstagebuch.`} />

      <div className="grid grid-3">
        <Card marble index={0} className="span-2">
          <div className="row" style={{ gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <Ring value={totals.fluidMl} max={t.fluidMl} size={150} stroke={12}>
              <div>
                <Droplets size={18} color="var(--neon-ink)" />
                <div className="stat-value" style={{ fontSize: 26 }}>
                  {ml(totals.fluidMl)}
                </div>
                <div className="muted tiny">von {ml(t.fluidMl)}</div>
              </div>
            </Ring>
            <div className="grow" style={{ minWidth: 260 }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>
                Getränk hinzufügen
              </div>
              <DrinkQuick date={today} />
            </div>
          </div>
        </Card>

        <Card index={1}>
          <CardHead eyebrow="Heute" title={`${drinks.length} ${drinks.length === 1 ? 'Getränk' : 'Getränke'}`} action={drinkKcal > 0 ? <span className="badge">{num(drinkKcal)} kcal</span> : undefined} />
          {drinks.length === 0 ? (
            <div className="muted small">Noch nichts getrunken eingetragen.</div>
          ) : (
            <div className="list">
              {drinks.map((d) => (
                <div className="list-item" key={d.id}>
                  <span className="entry-time">{d.time}</span>
                  <div className="grow">
                    <div className="title">{d.name}</div>
                    <div className="meta">
                      {num(d.ml)} ml{(d.nutrients.kcal ?? 0) > 0 ? ` · ${num(d.nutrients.kcal ?? 0)} kcal · ${num(d.nutrients.sugar ?? d.nutrients.carbs ?? 0)} g Zucker` : ''}
                    </div>
                  </div>
                  <ConfirmButton onConfirm={() => store.remove('drinkLogs', d.id)} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card index={2} className="span-2">
          <CardHead eyebrow="Letzte 7 Tage" title="Trinkmenge" />
          <BarChart data={week} target={t.fluidMl} unit="ml" />
          <div className="muted tiny">Gestrichelte Felder: keine Einträge an diesem Tag (zählt nicht als 0 ml).</div>
        </Card>

        <Card index={3}>
          <CardHead eyebrow="Supplement · Kreatin" title={ESN_CREATINE.name} />
          <div className="stack">
            <Switch
              checked={settings.supplements.creatineEnabled}
              onChange={(v) => store.updateSettings((s) => ({ ...s, supplements: { ...s.supplements, creatineEnabled: v } }))}
              label="Kreatin dokumentieren"
            />
            {settings.supplements.creatineEnabled && (
              <>
                <div className="row-between">
                  <div className="small">
                    Heute: {creatineToday.length ? <strong className="ok-text">{num(creatineToday.reduce((s, c) => s + c.grams, 0))} g eingetragen</strong> : <span className="muted">noch nicht eingetragen</span>}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-dark"
                    onClick={async () => {
                      await store.save('supplementLogs', buildCreatineLog(settings.supplements.creatineDoseG, today))
                      toast(`Kreatin ${settings.supplements.creatineDoseG} g eingetragen`)
                    }}
                  >
                    {settings.supplements.creatineDoseG} g eintragen
                  </button>
                </div>
                <Field label="Übliche Menge">
                  <NumberInput
                    value={settings.supplements.creatineDoseG}
                    onChange={(v) => v && store.updateSettings((s) => ({ ...s, supplements: { ...s.supplements, creatineDoseG: v } }))}
                    suffix="g"
                    step={0.5}
                    min={1}
                    max={10}
                  />
                </Field>
                <Switch
                  checked={settings.supplements.creatineReminder}
                  onChange={(v) => store.updateSettings((s) => ({ ...s, supplements: { ...s.supplements, creatineReminder: v } }))}
                  label="Dezenten Hinweis in der Übersicht zeigen"
                />
              </>
            )}
            <div className="muted tiny">
              {ESN_CREATINE.note} Üblicher Richtwert bei Verwendung: 3–5 g täglich, keine Ladephase nötig. Kreatin ist keine Proteinquelle und wird nicht beim Protein mitgezählt. Es gibt keine Serien und keinen Druck. Mehr Muskeln sind damit nicht garantiert.
            </div>
          </div>
        </Card>

        <Card index={4}>
          <CardHead eyebrow="Supplement" title="Proteinpulver" />
          <div className="stack">
            <Switch
              checked={settings.supplements.proteinPowderAvailable}
              onChange={(v) => store.updateSettings((s) => ({ ...s, supplements: { ...s.supplements, proteinPowderAvailable: v } }))}
              label="Ich habe Proteinpulver zu Hause"
            />
            <div className="small">
              Protein aus Lebensmitteln heute: <strong className="num">{num(Math.max(0, proteinFromFood))} g</strong> von {t.protein} g
            </div>
            {settings.supplements.proteinPowderAvailable ? (
              proteinGap > 0 ? (
                <Notice>
                  Es fehlen noch {num(proteinGap)} g. Ein Shake ist eine <strong>freiwillige</strong> Option. Zuerst lieber eine Mahlzeit mit Hähnchen, Quark, Eiern oder Thunfisch.
                </Notice>
              ) : (
                <div className="muted small">Proteinziel erreicht, ein Shake ist heute nicht nötig.</div>
              )
            ) : (
              <div className="muted small">Ohne Proteinpulver schlägt die App nur Lebensmittel vor.</div>
            )}
            <div className="row-wrap">
              <button type="button" className="btn btn-sm" onClick={() => setShake(true)} disabled={!settings.supplements.proteinPowderAvailable}>
                Shake eintragen (getrunken)
              </button>
              {proteinProducts.length === 0 && (
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setProductDialog({ kind: 'protein' })}>
                  Pulver anlegen
                </button>
              )}
            </div>
            <div className="muted tiny">Nährwerte werden erst gebucht, wenn du den Shake als getrunken einträgst. Kein Pflicht-Shake am Morgen, keine automatische Einplanung.</div>
          </div>
        </Card>

        <Card index={5}>
          <CardHead
            eyebrow="Eigene Produkte"
            title="Smoothies, Pulver & Co."
            action={
              <button type="button" className="btn btn-sm" onClick={() => setProductDialog({})}>
                <Plus size={15} /> Neu
              </button>
            }
          />
          {data.products.length === 0 ? (
            <div className="muted small">
              Lege gekaufte Frucht-Smoothies (Kaufland, REWE …), dein Proteinpulver oder andere Produkte mit den Werten vom Etikett an. Die App erfindet keine Produktwerte.
            </div>
          ) : (
            <div className="list">
              {[...data.products]
                .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name))
                .map((p) => {
                  const portion = p.serving ?? (p.kind === 'protein' ? 30 : (p.size ?? 250))
                  const prof = productProfile(p, portion).values
                  return (
                    <div className="list-item" key={p.id}>
                      <button
                        type="button"
                        className="fav-btn"
                        aria-pressed={p.favorite}
                        onClick={() => store.save('products', { ...p, favorite: !p.favorite, updatedAt: new Date().toISOString() })}
                        aria-label="Favorit"
                      >
                        <Star size={16} fill={p.favorite ? 'currentColor' : 'none'} />
                      </button>
                      <div className="grow">
                        <div className="title">{p.name}</div>
                        <div className="meta">
                          {p.builtin ? 'ESN · ' : ''}
                          {PRODUCT_KIND_LABEL[p.kind]}
                          {p.shop ? ` · ${p.shop}` : ''} · {portion} {p.unit}: {num(prof.kcal ?? 0)} kcal
                          {prof.protein !== undefined ? `, ${num(prof.protein)} g Protein` : ''}
                          {prof.vitC !== undefined ? `, ${num(prof.vitC)} mg Vit. C` : ''}
                        </div>
                        {p.note && <div className="meta">{p.note}</div>}
                      </div>
                      <button type="button" className="btn btn-ghost btn-icon sm" onClick={() => setProductDialog({ product: p })} aria-label="Bearbeiten">
                        <Pencil size={15} />
                      </button>
                      <ConfirmButton onConfirm={() => store.remove('products', p.id)} />
                    </div>
                  )
                })}
            </div>
          )}
        </Card>
      </div>

      {productDialog && <ProductDialog product={productDialog.product} kind={productDialog.kind} onClose={() => setProductDialog(null)} />}
      {shake && <ProteinShakeDialog date={today} onClose={() => setShake(false)} />}
    </div>
  )
}

export function ProteinShakeDialog({ date, onClose }: { date: string; onClose: () => void }) {
  const store = useStore()
  const { toast } = useToast()
  const products = store.data.products.filter((p) => p.kind === 'protein')
  const [productId, setProductId] = useState(store.settings.supplements.proteinProductId ?? products[0]?.id)
  const [grams, setGrams] = useState<number | undefined>(30)
  const [liquid, setLiquid] = useState<'wasser' | 'milch'>('wasser')
  const [liquidMl, setLiquidMl] = useState<number | undefined>(300)
  const product = products.find((p) => p.id === productId)

  async function save() {
    if (!product || !grams) return
    await store.save('supplementLogs', buildProteinLog({ product, grams, liquid, liquidMl: liquidMl ?? 0, date }))
    await store.updateSettings((s) => ({ ...s, supplements: { ...s.supplements, proteinProductId: product.id } }))
    toast('Proteinshake eingetragen')
    onClose()
  }

  return (
    <Modal
      title="Proteinshake eintragen"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" disabled={!product || !grams} onClick={save}>
            Getrunken – eintragen
          </button>
        </>
      }
    >
      {products.length === 0 ? (
        <div className="stack">
          <div className="small">Lege zuerst dein Proteinpulver mit den Werten vom Etikett an. Ohne Etikettwerte rechnet die App keine Nährwerte.</div>
          <a className="btn" href={href('/trinken')} onClick={onClose}>
            Zu „Trinken & Hydration“
          </a>
        </div>
      ) : (
        <div className="stack">
          <Field label="Pulver">
            <select className="select" value={productId} onChange={(e) => setProductId(e.target.value)}>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="form-grid">
            <Field label="Pulvermenge">
              <NumberInput value={grams} onChange={setGrams} suffix="g" />
            </Field>
            <Field label="Flüssigkeit">
              <NumberInput value={liquidMl} onChange={setLiquidMl} suffix="ml" />
            </Field>
          </div>
          <Seg value={liquid} onChange={setLiquid} options={[{ value: 'wasser', label: 'mit Wasser' }, { value: 'milch', label: 'mit Milch 1,5 %' }]} />
          {product && grams && (
            <div className="muted small">
              Ergibt etwa {num(productProfile(product, grams).values.protein ?? 0)} g Protein aus dem Pulver{liquid === 'milch' ? ` + ${num(((liquidMl ?? 0) * 3.4) / 100)} g aus der Milch` : ''}. Die Flüssigkeit zählt zur Trinkmenge.
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
