import { Download, HardDrive, Plus, RotateCcw, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useDisplayPrefs } from '../components/displayPrefs'
import { useToday } from '../components/hooks'
import { Card, CardHead, Field, Modal, Notice, NumberInput, PageHead, Seg, Switch } from '../components/ui'
import { createDefaultSettings, EXCLUDED_TAG_LABEL } from '../data/defaults'
import { FOOD_CATEGORY_LABEL, FOODS } from '../data/foods'
import { RECIPE_MAP } from '../data/recipes'
import { formatDateFull } from '../lib/date'
import { uid } from '../lib/id'
import { euro, num } from '../lib/format'
import { backupFileName, buildBackup, importBackup, validateBackup, type ValidationResult } from '../storage/backup'
import { href, navigate, type Route } from '../state/router'
import { useStore } from '../state/store'
import { useToast } from '../state/toast'
import { COLLECTIONS, type FoodTag, type FunDrink, type Settings } from '../types'

type Section = 'profil' | 'ziele' | 'training' | 'supplements' | 'budget' | 'preise' | 'vorrat' | 'lebensmittel' | 'anzeige' | 'daten'

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'profil', label: 'Persönliche Daten' },
  { id: 'ziele', label: 'Ziele' },
  { id: 'training', label: 'Training & Arme' },
  { id: 'supplements', label: 'Supplements' },
  { id: 'budget', label: 'Budget & Getränke' },
  { id: 'preise', label: 'Preise & Packungen' },
  { id: 'vorrat', label: 'Grundvorrat' },
  { id: 'lebensmittel', label: 'Lebensmittel' },
  { id: 'anzeige', label: 'Anzeige' },
  { id: 'daten', label: 'Daten & Backup' },
]

export default function SettingsPage({ route }: { route: Route }) {
  const section = (route.query.get('tab') as Section) ?? 'profil'
  return (
    <div className="page">
      <PageHead eyebrow="Alles lokal gespeichert" title="Einstellungen" lead="Änderungen werden sofort auf diesem Gerät gespeichert." />
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Einstellungsbereiche">
          {SECTIONS.map((s) => (
            <button key={s.id} type="button" aria-current={section === s.id} onClick={() => navigate(`/einstellungen?tab=${s.id}`)}>
              {s.label}
            </button>
          ))}
        </nav>
        <div className="stack-lg">
          {section === 'profil' && <ProfileSection />}
          {section === 'ziele' && <TargetsSection />}
          {section === 'training' && <TrainingSection />}
          {section === 'supplements' && <SupplementSection />}
          {section === 'budget' && <BudgetSection />}
          {section === 'preise' && <PriceSection />}
          {section === 'vorrat' && <BasicsSection />}
          {section === 'lebensmittel' && <FoodSection />}
          {section === 'anzeige' && <DisplaySection />}
          {section === 'daten' && <DataSection />}
        </div>
      </div>
    </div>
  )
}

function useSettingsUpdate() {
  const { settings, updateSettings } = useStore()
  const set = <K extends keyof Settings>(key: K, patch: Partial<Settings[K]>) =>
    updateSettings((s) => ({
      ...s,
      [key]: { ...(s[key] as object), ...patch },
      // Wer Profil oder Ziele bearbeitet, hat die Platzhalter durch eigene Werte ersetzt
      ...(key === 'profile' || key === 'targets' ? { profile: { ...s.profile, ...(key === 'profile' ? patch : {}), confirmed: true } } : {}),
    }))
  return { settings, set, updateSettings }
}

function Section({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHead eyebrow={eyebrow} title={title} />
      {children}
    </Card>
  )
}

function ProfileSection() {
  const { settings, set } = useSettingsUpdate()
  const p = settings.profile
  return (
    <Section title="Persönliche Daten" eyebrow="Profil">
      {!p.confirmed && (
        <div style={{ marginBottom: 14 }}>
          <Notice kind="warn">
            Hier stehen noch neutrale Platzhalter. Trage deine Werte ein (oder importiere unter „Daten & Backup“ ein Backup von deinem anderen Gerät).
            <div style={{ marginTop: 8 }}>
              <button type="button" className="btn btn-sm" onClick={() => set('profile', { confirmed: true })}>
                Werte passen so
              </button>
            </div>
          </Notice>
        </div>
      )}
      <div className="form-grid">
        <Field label="Name (optional, für die Begrüßung)">
          <input className="input" value={p.name} onChange={(e) => set('profile', { name: e.target.value })} />
        </Field>
        <Field label="Alter">
          <NumberInput value={p.age} onChange={(v) => v && set('profile', { age: v })} suffix="Jahre" />
        </Field>
        <Field label="Geschlecht">
          <select className="select" value={p.sex} onChange={(e) => set('profile', { sex: e.target.value as Settings['profile']['sex'] })}>
            <option value="m">männlich</option>
            <option value="w">weiblich</option>
            <option value="d">divers</option>
          </select>
        </Field>
        <Field label="Größe">
          <NumberInput value={p.heightCm} onChange={(v) => v && set('profile', { heightCm: v })} suffix="cm" />
        </Field>
        <Field label="Startgewicht">
          <NumberInput value={p.startWeightKg} onChange={(v) => v && set('profile', { startWeightKg: v })} suffix="kg" step={0.1} />
        </Field>
        <Field label="Alltagsaktivität">
          <input className="input" value={p.activity} onChange={(e) => set('profile', { activity: e.target.value })} />
        </Field>
        <Field label="Trainingserfahrung">
          <input className="input" value={p.experience} onChange={(e) => set('profile', { experience: e.target.value })} />
        </Field>
      </div>
      <div style={{ marginTop: 14 }}>
        <Field label="Ziel">
          <input className="input" value={p.goal} onChange={(e) => set('profile', { goal: e.target.value })} />
        </Field>
      </div>
      <div className="muted tiny" style={{ marginTop: 10 }}>
        Die DGE-Referenzwerte in der App gelten für Männer von 19 bis unter 25 Jahren. Bei anderem Alter oder Geschlecht bitte die Werte im DGE-Tool prüfen.
      </div>
    </Section>
  )
}

function TargetsSection() {
  const { settings, set } = useSettingsUpdate()
  const { toast } = useToast()
  const t = settings.targets
  const p = settings.profile
  const lastWeight = useStore().data.weights.slice().sort((a, b) => b.date.localeCompare(a.date))[0]?.kg ?? p.startWeightKg
  const mifflin = Math.round(10 * lastWeight + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'w' ? -161 : 5))
  const kcalFromMacros = t.protein * 4 + t.carbs * 4 + t.fat * 9
  return (
    <>
      <Section title="Kalorien & Makronährstoffe" eyebrow="Ziele pro Tag">
        <div className="form-grid">
          <Field label="Kalorienziel" hint="Startwert, wird anhand des Gewichtsverlaufs überprüft">
            <NumberInput value={t.kcal} onChange={(v) => v && set('targets', { kcal: v })} suffix="kcal" step={50} />
          </Field>
          <Field label="Protein">
            <NumberInput value={t.protein} onChange={(v) => v && set('targets', { protein: v })} suffix="g" />
          </Field>
          <Field label="Fett">
            <NumberInput value={t.fat} onChange={(v) => v && set('targets', { fat: v })} suffix="g" />
          </Field>
          <Field label="Kohlenhydrate">
            <NumberInput value={t.carbs} onChange={(v) => v && set('targets', { carbs: v })} suffix="g" />
          </Field>
          <Field label="Ballaststoffe (mindestens)">
            <NumberInput value={t.fiber} onChange={(v) => v && set('targets', { fiber: v })} suffix="g" />
          </Field>
          <Field label="Trinkziel">
            <NumberInput value={t.fluidMl} onChange={(v) => v && set('targets', { fluidMl: v })} suffix="ml" step={100} />
          </Field>
        </div>
        <div className="muted small" style={{ marginTop: 12 }}>
          Makros ergeben rechnerisch {num(kcalFromMacros)} kcal ({kcalFromMacros > t.kcal + 60 ? 'etwas mehr als' : kcalFromMacros < t.kcal - 60 ? 'etwas weniger als' : 'passend zum'} Kalorienziel).
        </div>
      </Section>
      <Section title="Gewichtszunahme & Energiebedarf" eyebrow="Schätzungen">
        <div className="form-grid">
          <Field label="Zunahme pro Woche, von">
            <NumberInput value={t.gainMinG} onChange={(v) => v !== undefined && set('targets', { gainMinG: v })} suffix="g" step={10} />
          </Field>
          <Field label="bis">
            <NumberInput value={t.gainMaxG} onChange={(v) => v !== undefined && set('targets', { gainMaxG: v })} suffix="g" step={10} />
          </Field>
          <Field label="Grundumsatz (geschätzt)">
            <NumberInput value={t.bmrEstimate} onChange={(v) => v && set('targets', { bmrEstimate: v })} suffix="kcal" />
          </Field>
          <Field label="Erhaltungsbedarf von (geschätzt)">
            <NumberInput value={t.maintenanceMin} onChange={(v) => v && set('targets', { maintenanceMin: v })} suffix="kcal" step={50} />
          </Field>
          <Field label="bis">
            <NumberInput value={t.maintenanceMax} onChange={(v) => v && set('targets', { maintenanceMax: v })} suffix="kcal" step={50} />
          </Field>
        </div>
        <div className="row-wrap" style={{ marginTop: 12 }}>
          <span className="muted small">
            Mifflin-St-Jeor mit {num(lastWeight, 1)} kg ergibt etwa {num(mifflin)} kcal Grundumsatz. Das ist eine Schätzung, kein Messwert.
          </span>
          {mifflin !== t.bmrEstimate && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                set('targets', { bmrEstimate: mifflin })
                toast('Grundumsatz-Schätzung aktualisiert')
              }}
            >
              Übernehmen
            </button>
          )}
        </div>
      </Section>
    </>
  )
}

function TrainingSection() {
  const { settings, set } = useSettingsUpdate()
  const pr = settings.program
  return (
    <>
      <Section title="Programm" eyebrow="16 Wochen">
        <div className="form-grid">
          <Field label="Startdatum" hint="Woche 1 beginnt am Montag dieser Woche">
            <input className="input" type="date" value={pr.startDate} onChange={(e) => e.target.value && set('program', { startDate: e.target.value })} />
          </Field>
          <Field label="Gewichtsstufe deiner Hanteln" hint="für Steigerungsvorschläge">
            <NumberInput value={pr.dumbbellStepKg} onChange={(v) => v && set('program', { dumbbellStepKg: v })} suffix="kg" step={0.25} />
          </Field>
        </div>
        <div className="stack" style={{ marginTop: 14 }}>
          <div className="row-wrap">
            <span className="field-label" style={{ minWidth: 170 }}>
              Zusätzlicher Wochentag
            </span>
            <Seg value={pr.secondDay} onChange={(v) => set('program', { secondDay: v })} options={[{ value: 'di', label: 'Dienstag' }, { value: 'mi', label: 'Mittwoch' }]} />
          </div>
          <div className="row-wrap">
            <span className="field-label" style={{ minWidth: 170 }}>
              Wochenendtag
            </span>
            <Seg value={pr.weekendDay} onChange={(v) => set('program', { weekendDay: v })} options={[{ value: 'sa', label: 'Samstag' }, { value: 'so', label: 'Sonntag' }]} />
          </div>
          <Switch checked={pr.pulloverSuitable} onChange={(v) => set('program', { pulloverSuitable: v })} label="Kurzhantel-Überzüge sind für mich geeignet (sonst Reverse Fly)" />
        </div>
      </Section>
      <Section title="Vorhandene Geräte" eyebrow="Ausrüstung">
        <div className="stack">
          <Switch checked={pr.equipment.dumbbells} onChange={(v) => set('program', { equipment: { ...pr.equipment, dumbbells: v } })} label="Verstellbare Kurzhanteln" />
          <Switch checked={pr.equipment.rower} onChange={(v) => set('program', { equipment: { ...pr.equipment, rower: v } })} label="Rudergerät" />
          <Switch checked={pr.equipment.treadmill} onChange={(v) => set('program', { equipment: { ...pr.equipment, treadmill: v } })} label="Laufband" />
          <Switch checked={pr.equipment.pullupBar} onChange={(v) => set('program', { equipment: { ...pr.equipment, pullupBar: v } })} label="Klimmzugstange (optional, der Plan braucht keine)" />
        </div>
      </Section>
      <Section title="Arm-Balance" eyebrow="Links & rechts">
        <div className="stack">
          <div className="row-wrap">
            <span className="field-label" style={{ minWidth: 170 }}>
              Schwächerer Arm
            </span>
            <Seg
              value={settings.arms.weakerSide ?? ('none' as 'left' | 'right' | 'none')}
              onChange={(v) => set('arms', { weakerSide: v === 'none' ? null : v })}
              options={[
                { value: 'left', label: 'Links' },
                { value: 'right', label: 'Rechts' },
                { value: 'none', label: 'Noch offen' },
              ]}
            />
          </div>
          <Switch checked={pr.extraWeakSet} onChange={(v) => set('program', { extraWeakSet: v })} label="Zusatzsatz für die schwächere Seite (empfohlen frühestens nach 6–8 Wochen)" />
          <a className="btn btn-sm" href={href('/fortschritt?tab=arme')} style={{ alignSelf: 'flex-start' }}>
            Armumfänge messen & ansehen
          </a>
        </div>
      </Section>
    </>
  )
}

function SupplementSection() {
  const { settings, set } = useSettingsUpdate()
  const { data } = useStore()
  const s = settings.supplements
  return (
    <Section title="Kreatin & Proteinpulver" eyebrow="Getrennt vom Lebensmittelbudget">
      <div className="stack">
        <Switch checked={s.creatineEnabled} onChange={(v) => set('supplements', { creatineEnabled: v })} label="Kreatin-Monohydrat dokumentieren" />
        <div style={{ maxWidth: 220 }}>
          <Field label="Übliche Kreatin-Menge" hint="Richtwert 3–5 g täglich">
            <NumberInput value={s.creatineDoseG} onChange={(v) => v && set('supplements', { creatineDoseG: v })} suffix="g" step={0.5} />
          </Field>
        </div>
        <Switch checked={s.creatineReminder} onChange={(v) => set('supplements', { creatineReminder: v })} label="Dezente Erinnerung in der App (keine Serien, kein Druck)" />
        <hr className="divider" />
        <Switch checked={s.proteinPowderAvailable} onChange={(v) => set('supplements', { proteinPowderAvailable: v })} label="Proteinpulver ist verfügbar" />
        <Field label="Standard-Pulver">
          <select className="select" value={s.proteinProductId ?? ''} onChange={(e) => set('supplements', { proteinProductId: e.target.value || undefined })}>
            <option value="">–</option>
            {data.products
              .filter((p) => p.kind === 'protein')
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </Field>
        <div className="muted tiny">
          Produkte mit Etikettwerten legst du unter <a href={href('/trinken')}>Trinken & Hydration</a> an. Die App schlägt Proteinpulver nur vor, wenn über Lebensmittel noch Protein fehlt.
        </div>
      </div>
    </Section>
  )
}

function BudgetSection() {
  const { settings, set, updateSettings } = useSettingsUpdate()
  const b = settings.budget
  const updateDrink = (id: string, patch: Partial<FunDrink>) => updateSettings((s) => ({ ...s, funDrinks: s.funDrinks.map((d) => (d.id === id ? { ...d, ...patch } : d)) }))
  return (
    <>
      <Section title="Wochenbudget" eyebrow="Mittagessen Mo–Fr + Spaßgetränke">
        <div className="form-grid">
          <Field label="Budget von">
            <NumberInput value={b.min} onChange={(v) => v !== undefined && set('budget', { min: v })} suffix="€" />
          </Field>
          <Field label="bis">
            <NumberInput value={b.max} onChange={(v) => v !== undefined && set('budget', { max: v })} suffix="€" />
          </Field>
          <Field label="Preis CO₂-Kartusche">
            <NumberInput value={b.co2Price} onChange={(v) => v !== undefined && set('budget', { co2Price: v })} suffix="€" step={0.01} />
          </Field>
        </div>
        <div style={{ marginTop: 14 }}>
          <Switch checked={b.mondayLeftovers} onChange={(v) => set('budget', { mondayLeftovers: v })} label="Montags Reste vom Wochenende (kein Mittagessen einkaufen)" />
        </div>
      </Section>
      <Section title="Spaßgetränke im Budget" eyebrow="Werden nie automatisch verändert">
        <div className="stack">
          {settings.funDrinks.map((d) => (
            <div key={d.id} className="card flat" style={{ padding: 14 }}>
              <div className="form-grid">
                <Field label="Getränk">
                  <input className="input" value={d.name} onChange={(e) => updateDrink(d.id, { name: e.target.value })} />
                </Field>
                <Field label="Rhythmus">
                  <select className="select" value={d.frequency} onChange={(e) => updateDrink(d.id, { frequency: e.target.value as FunDrink['frequency'] })}>
                    <option value="daily">täglich</option>
                    <option value="perWeek">pro Woche</option>
                  </select>
                </Field>
                <Field label={d.frequency === 'daily' ? 'Menge pro Tag' : 'Menge pro Portion'}>
                  <NumberInput value={d.ml} onChange={(v) => v !== undefined && updateDrink(d.id, { ml: v })} suffix="ml" step={50} />
                </Field>
                {d.frequency === 'perWeek' && (
                  <Field label="Portionen pro Woche">
                    <NumberInput value={d.perWeek} onChange={(v) => v !== undefined && updateDrink(d.id, { perWeek: v })} step={0.5} />
                  </Field>
                )}
                <Field label="Packungsgröße">
                  <NumberInput value={d.packMl} onChange={(v) => v && updateDrink(d.id, { packMl: v })} suffix="ml" />
                </Field>
                <Field label="Preis pro Packung" hint="ohne Pfand">
                  <NumberInput value={d.packPrice} onChange={(v) => v !== undefined && updateDrink(d.id, { packPrice: v })} suffix="€" step={0.01} />
                </Field>
              </div>
              <div className="row-between" style={{ marginTop: 10 }}>
                <Switch checked={d.inBudget} onChange={(v) => updateDrink(d.id, { inBudget: v })} label="zählt zum Budget" />
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => updateSettings((s) => ({ ...s, funDrinks: s.funDrinks.filter((x) => x.id !== d.id) }))}>
                  <Trash2 size={14} /> Entfernen
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-sm"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => updateSettings((s) => ({ ...s, funDrinks: [...s.funDrinks, { id: uid(), name: 'Neues Getränk', ml: 330, frequency: 'perWeek', perWeek: 2, packMl: 330, packPrice: 0.99, inBudget: true }] }))}
          >
            <Plus size={15} /> Getränk hinzufügen
          </button>
          <div className="muted tiny">Afri-Cola und Energy-Drink haben Schätzpreise. Bitte mit deinem Kassenbon abgleichen.</div>
        </div>
      </Section>
    </>
  )
}

function PriceSection() {
  const { settings, updateSettings } = useSettingsUpdate()
  const [cat, setCat] = useState<string>('alle')
  const foods = FOODS.filter((f) => f.pack && !f.staple && f.category !== 'getraenk' && (cat === 'alle' || f.category === cat))
  const setPrice = (id: string, patch: { price?: number; amount?: number }) =>
    updateSettings((s) => {
      const next = { ...s.prices, [id]: { ...s.prices[id], ...patch } }
      if (next[id].price === undefined && next[id].amount === undefined) delete next[id]
      return { ...s, prices: next }
    })
  return (
    <Section title="Einkaufspreise & Packungsgrößen" eyebrow="Schätzwerte überschreiben">
      <div className="row-between" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
        <div className="muted small">Die Standardpreise sind grobe Schätzungen, keine aktuellen Marktpreise. Trage deine echten Preise ein.</div>
        <select className="select" style={{ width: 'auto' }} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="alle">Alle Kategorien</option>
          {Object.entries(FOOD_CATEGORY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Produkt</th>
              <th>Standard</th>
              <th className="num">Packung</th>
              <th className="num">Preis</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {foods.map((f) => {
              const o = settings.prices[f.id]
              return (
                <tr key={f.id}>
                  <td className="strong">{f.name}</td>
                  <td className="muted small">
                    {f.pack!.label} · {euro(f.pack!.price)}
                  </td>
                  <td style={{ width: 130 }}>
                    <NumberInput value={o?.amount} onChange={(v) => setPrice(f.id, { amount: v })} placeholder={String(f.pack!.amount)} suffix={f.unit} ariaLabel={`Packungsgröße ${f.name}`} />
                  </td>
                  <td style={{ width: 120 }}>
                    <NumberInput value={o?.price} onChange={(v) => setPrice(f.id, { price: v })} placeholder={f.pack!.price.toFixed(2)} suffix="€" step={0.01} ariaLabel={`Preis ${f.name}`} />
                  </td>
                  <td>
                    {o && (
                      <button type="button" className="btn btn-ghost btn-icon sm" title="Zurücksetzen" aria-label="Zurücksetzen" onClick={() => setPrice(f.id, { price: undefined, amount: undefined })}>
                        <RotateCcw size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

function BasicsSection() {
  const { settings, updateSettings } = useSettingsUpdate()
  const basics = FOODS.filter((f) => f.basic)
  const staples = FOODS.filter((f) => f.staple)
  return (
    <>
      <Section title="Grundvorrat" eyebrow="Wird als vorhanden angenommen">
        <div className="muted small" style={{ marginBottom: 12 }}>
          Abgewählte Dinge erscheinen auf der Einkaufsliste, sobald ein Rezept sie braucht.
        </div>
        <div className="form-grid">
          {basics.map((f) => (
            <Switch
              key={f.id}
              checked={settings.basics[f.id] !== false}
              onChange={(v) => updateSettings((s) => ({ ...s, basics: { ...s.basics, [f.id]: v } }))}
              label={f.name}
            />
          ))}
        </div>
      </Section>
      <Section title="Brot, Toast & üblicher Belag" eyebrow="Immer vorhanden, nie auf der Liste">
        <div className="row-wrap">
          {staples.map((f) => (
            <span key={f.id} className="badge">
              {f.name}
            </span>
          ))}
        </div>
        <div className="muted tiny" style={{ marginTop: 10 }}>
          Echte Vorräte (z. B. Reis, Nudeln, Dosen) pflegst du unter <a href={href('/einkauf?tab=vorrat')}>Einkaufsliste → Vorrat</a>.
        </div>
      </Section>
    </>
  )
}

function FoodSection() {
  const { settings, set, updateSettings } = useSettingsUpdate()
  const f = settings.food
  const tags = Object.keys(EXCLUDED_TAG_LABEL) as FoodTag[]
  return (
    <>
      <Section title="Ausschlüsse" eyebrow="Nie in Standardrezepten und Einkaufslisten">
        <div className="stack">
          {tags.map((t) => {
            const state = f.excludedTags.includes(t) ? 'aus' : f.avoidTags.includes(t) ? 'vermeiden' : 'ok'
            return (
              <div key={t} className="row-between">
                <span className="small strong">{EXCLUDED_TAG_LABEL[t]}</span>
                <Seg
                  value={state}
                  onChange={(v) =>
                    set('food', {
                      excludedTags: v === 'aus' ? [...new Set([...f.excludedTags, t])] : f.excludedTags.filter((x) => x !== t),
                      avoidTags: v === 'vermeiden' ? [...new Set([...f.avoidTags, t])] : f.avoidTags.filter((x) => x !== t),
                    })
                  }
                  options={[
                    { value: 'aus', label: 'Ausgeschlossen' },
                    { value: 'vermeiden', label: 'Vermeiden' },
                    { value: 'ok', label: 'Erlaubt' },
                  ]}
                />
              </div>
            )
          })}
        </div>
        <div className="muted tiny" style={{ marginTop: 12 }}>
          Roher Spinat ist erlaubt, gekochter nicht. Bratkartoffeln sind gelegentlich in Ordnung.
        </div>
      </Section>
      <Section title="Ausnahmen" eyebrow="Trotz Ausschluss erlaubt">
        <Switch
          checked={f.exceptions.includes('pizza-salami')}
          onChange={(v) => set('food', { exceptions: v ? [...new Set([...f.exceptions, 'pizza-salami'])] : f.exceptions.filter((x) => x !== 'pizza-salami') })}
          label="Fertigpizza trotz Tomatensoße (du hast sie als Lieblingsessen genannt)"
        />
      </Section>
      <Section title="Optionales Gemüse" eyebrow="Erst nach Freigabe fest eingeplant">
        <div className="row-wrap">
          {FOODS.filter((x) => x.pref === 'optional').map((x) => (
            <button
              key={x.id}
              type="button"
              className="chip"
              aria-pressed={f.acceptedOptional.includes(x.id)}
              onClick={() => set('food', { acceptedOptional: f.acceptedOptional.includes(x.id) ? f.acceptedOptional.filter((y) => y !== x.id) : [...f.acceptedOptional, x.id] })}
            >
              {x.name}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Einzelne Lebensmittel ausschließen" eyebrow="Zusätzlich">
        <div className="row-wrap">
          {FOODS.filter((x) => !x.basic && x.category !== 'getraenk' && !x.tags?.length).map((x) => (
            <button
              key={x.id}
              type="button"
              className="chip"
              aria-pressed={f.excludedFoods.includes(x.id)}
              onClick={() => set('food', { excludedFoods: f.excludedFoods.includes(x.id) ? f.excludedFoods.filter((y) => y !== x.id) : [...f.excludedFoods, x.id] })}
            >
              {x.name}
            </button>
          ))}
        </div>
        <div className="muted tiny" style={{ marginTop: 8 }}>
          Markierte Lebensmittel sind ausgeschlossen. Rezepte mit ihnen als feste Zutat werden ausgeblendet.
        </div>
        {f.excludedTags.length === 0 && <div className="tiny warn-text">Achtung: Alle Ausschlüsse sind aufgehoben.</div>}
        <button type="button" className="btn btn-sm btn-ghost" style={{ marginTop: 10 }} onClick={() => updateSettings((s) => ({ ...s, food: createDefaultSettings().food }))}>
          <RotateCcw size={14} /> Standard-Ausschlüsse wiederherstellen
        </button>
      </Section>
      <Section title="Bevorzugte Rezepte" eyebrow={`${settings.favorites.length} Favoriten`}>
        {settings.favorites.length === 0 ? (
          <div className="muted small">Markiere Rezepte mit dem Stern. Favoriten werden im Wochenplan bevorzugt.</div>
        ) : (
          <div className="row-wrap">
            {settings.favorites.map((id) => (
              <span key={id} className="chip">
                <a href={href(`/rezepte/${id}`)} style={{ textDecoration: 'none' }}>
                  {RECIPE_MAP[id]?.name ?? id}
                </a>
                <button type="button" className="btn btn-ghost btn-icon sm" style={{ width: 22, minHeight: 22 }} aria-label="Entfernen" onClick={() => updateSettings((s) => ({ ...s, favorites: s.favorites.filter((x) => x !== id) }))}>
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </Section>
    </>
  )
}

function DisplaySection() {
  const [prefs, setPrefs] = useDisplayPrefs()
  return (
    <Section title="Anzeige" eyebrow="Nur auf diesem Gerät">
      <div className="stack">
        <div className="row-wrap">
          <span className="field-label" style={{ minWidth: 150 }}>
            Animationen
          </span>
          <Seg
            value={prefs.motion}
            onChange={(v) => setPrefs({ ...prefs, motion: v })}
            options={[
              { value: 'system', label: 'Wie System' },
              { value: 'reduziert', label: 'Reduziert' },
              { value: 'normal', label: 'Normal' },
            ]}
          />
        </div>
        <Switch checked={prefs.marble} onChange={(v) => setPrefs({ ...prefs, marble: v })} label="Dezente Marmorstruktur anzeigen" />
        <Switch checked={prefs.compact} onChange={(v) => setPrefs({ ...prefs, compact: v })} label="Kompaktere Abstände" />
        <div className="muted tiny">„Wie System“ folgt der Einstellung „Bewegung reduzieren“ von macOS bzw. iOS.</div>
      </div>
    </Section>
  )
}

function DataSection() {
  const store = useStore()
  const { data, settings, meta, repo } = store
  const { toast } = useToast()
  const today = useToday()
  const fileRef = useRef<HTMLInputElement>(null)
  const [validation, setValidation] = useState<ValidationResult>()
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')
  const [reset, setReset] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [persisted, setPersisted] = useState<boolean>()
  const [estimate, setEstimate] = useState<{ usage?: number; quota?: number }>()
  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted)
    void navigator.storage?.estimate?.().then(setEstimate)
  }, [])
  const counts = COLLECTIONS.map((c) => [c, data[c].length] as const)
  const total = counts.reduce((s, [, n]) => s + n, 0)

  async function exportJson() {
    const backup = buildBackup(data, settings)
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = backupFileName()
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    await store.setMeta({ lastBackupAt: new Date().toISOString() })
    toast('Backup exportiert')
  }

  async function onFile(file: File) {
    try {
      const raw = JSON.parse(await file.text())
      setValidation(validateBackup(raw))
    } catch {
      setValidation({ ok: false, errors: ['Die Datei ist kein gültiges JSON.'], counts: {} })
    }
  }

  async function runImport() {
    if (!validation?.backup) return
    const summary = await importBackup(repo, validation.backup, data, mode)
    // Neues Gerät ohne eigene Startwerte: Einstellungen aus dem Backup übernehmen
    const adoptSettings = mode === 'merge' && !settings.profile.confirmed
    if (adoptSettings) await repo.saveSettings(validation.backup.settings)
    await store.reload()
    setValidation(undefined)
    toast(mode === 'replace' ? `Wiederhergestellt: ${summary.added} Einträge` : `Importiert: ${summary.added} neu, ${summary.updated} aktualisiert, ${summary.skipped} doppelt übersprungen`)
  }

  async function resetAll() {
    await repo.clear()
    await repo.saveSettings(createDefaultSettings())
    await store.reload()
    setReset(false)
    setConfirmText('')
    toast('Alle lokalen Daten wurden gelöscht')
  }

  return (
    <>
      <Section title="Lokale Datenspeicherung" eyebrow="Status">
        <div className="stack-sm small">
          <div className="row-between">
            <span className="muted">Speicherort</span>
            <span className="row" style={{ gap: 6 }}>
              <HardDrive size={14} /> {repo.label}
            </span>
          </div>
          <div className="row-between">
            <span className="muted">Einträge gesamt</span>
            <span className="num">{num(total)}</span>
          </div>
          <div className="row-between">
            <span className="muted">Dauerhafter Speicher</span>
            <span>
              {persisted ? (
                <span className="ok-text row" style={{ gap: 4 }}>
                  <ShieldCheck size={14} /> aktiv
                </span>
              ) : (
                <button type="button" className="btn btn-sm" onClick={() => navigator.storage?.persist?.().then(setPersisted)}>
                  Anfragen
                </button>
              )}
            </span>
          </div>
          {estimate?.usage !== undefined && (
            <div className="row-between">
              <span className="muted">Belegt</span>
              <span className="num">{num((estimate.usage ?? 0) / 1024 / 1024, 1)} MB</span>
            </div>
          )}
          <div className="row-between">
            <span className="muted">Letztes Backup</span>
            <span>{meta.lastBackupAt ? formatDateFull(meta.lastBackupAt.slice(0, 10)) : 'noch keins'}</span>
          </div>
          <div className="row-between">
            <span className="muted">Geräte-ID</span>
            <span className="tiny muted">{meta.deviceId.slice(0, 8)}</span>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <Notice>
            Alle persönlichen Daten liegen nur auf diesem Gerät. Mac und iPhone haben getrennte Datenbestände, es gibt keine automatische Synchronisierung. Zum Übertragen: hier exportieren und auf dem anderen Gerät importieren (zum Beispiel per AirDrop oder iCloud Drive).
          </Notice>
        </div>
      </Section>

      <Section title="Backup & Übertragung" eyebrow="JSON-Export und -Import">
        <div className="row-wrap">
          <button type="button" className="btn btn-primary" onClick={exportJson}>
            <Download size={16} /> Backup exportieren
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> Backup importieren
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void onFile(file)
              e.target.value = ''
            }}
          />
        </div>
        <div className="muted tiny" style={{ marginTop: 10 }}>
          Der Export enthält alle Einträge und Einstellungen, aber keine Spotify-Zugangsdaten oder sonstigen Geheimnisse. Empfehlung: etwa einmal pro Woche sichern.
          {meta.lastBackupAt && ` Letztes Backup vor ${Math.max(0, Math.round((new Date(today).getTime() - new Date(meta.lastBackupAt.slice(0, 10)).getTime()) / 86400000))} Tag(en).`}
        </div>
      </Section>

      <Section title="Zurücksetzen" eyebrow="Vorsicht">
        <div className="small" style={{ marginBottom: 12 }}>
          Löscht alle Einträge und Einstellungen auf diesem Gerät. Vorher am besten ein Backup exportieren.
        </div>
        <button type="button" className="btn btn-danger" onClick={() => setReset(true)}>
          <Trash2 size={16} /> Alle Daten löschen …
        </button>
      </Section>

      {validation && (
        <Modal
          title="Backup importieren"
          onClose={() => setValidation(undefined)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setValidation(undefined)}>
                Abbrechen
              </button>
              {validation.ok && (
                <button type="button" className={`btn ${mode === 'replace' ? 'btn-danger solid' : 'btn-primary'}`} onClick={runImport}>
                  {mode === 'replace' ? 'Alles ersetzen' : 'Zusammenführen'}
                </button>
              )}
            </>
          }
        >
          {validation.ok ? (
            <div className="stack">
              <div className="small">
                Backup vom {validation.backup?.exportedAt ? formatDateFull(validation.backup.exportedAt.slice(0, 10)) : 'unbekannt'} mit{' '}
                {Object.values(validation.counts).reduce((s, n) => s + (n ?? 0), 0)} Einträgen ist gültig.
              </div>
              <Seg
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'merge', label: 'Zusammenführen (empfohlen)' },
                  { value: 'replace', label: 'Alles ersetzen' },
                ]}
              />
              <div className="muted small">
                {mode === 'merge'
                  ? settings.profile.confirmed
                    ? 'Neue Einträge kommen dazu. Bei gleichen Einträgen gewinnt der neuere Stand, Doppelte werden übersprungen. Deine Einstellungen bleiben.'
                    : 'Neue Einträge kommen dazu, Doppelte werden übersprungen. Weil auf diesem Gerät noch keine eigenen Startwerte stehen, werden die Einstellungen aus dem Backup übernommen.'
                  : 'Alle lokalen Daten und Einstellungen werden durch das Backup ersetzt.'}
              </div>
            </div>
          ) : (
            <div className="stack">
              <Notice kind="warn">Die Datei kann nicht importiert werden. Es wurde nichts verändert.</Notice>
              <ul className="bullets small">
                {validation.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </Modal>
      )}

      {reset && (
        <Modal
          title="Wirklich alles löschen?"
          onClose={() => setReset(false)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setReset(false)}>
                Abbrechen
              </button>
              <button type="button" className="btn btn-danger solid" disabled={confirmText !== 'LÖSCHEN'} onClick={resetAll}>
                Endgültig löschen
              </button>
            </>
          }
        >
          <div className="stack">
            <div className="small">
              Das löscht {num(total)} Einträge und alle Einstellungen auf diesem Gerät. Das lässt sich nur mit einem Backup rückgängig machen.
            </div>
            <Field label='Zur Bestätigung „LÖSCHEN“ eingeben'>
              <input className="input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
            </Field>
          </div>
        </Modal>
      )}
    </>
  )
}
