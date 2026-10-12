import type { NutrientKey, Settings } from '../types'

export type NutrientGroup = 'makro' | 'vitamin' | 'mineral' | 'weitere'

export interface NutrientMeta {
  key: NutrientKey
  label: string
  short?: string
  unit: 'kcal' | 'g' | 'mg' | 'µg'
  group: NutrientGroup
  decimals: number
  /** Referenzwert pro Tag für Männer 19 bis unter 25 Jahre (DGE/ÖGE), falls fest. */
  reference?: number
  /** Art des Referenzwerts laut DGE bzw. Herkunft. */
  refKind?: 'Empfehlung' | 'Schätzwert' | 'Richtwert' | 'Orientierung' | 'dein Ziel'
  /** Höchstens (z. B. Salz, gesättigte Fette): dann ist weniger gut. */
  limit?: boolean
  refNote?: string
}

/**
 * Referenzwerte der DGE/ÖGE für Männer von 19 bis unter 25 Jahren, abgeglichen mit
 * https://www.dge.de/wissenschaft/referenzwerte/ (3. Auflage 2025, abgerufen am 12.10.2026).
 * Werte, die vom Kalorienziel oder deinen Zielen abhängen, berechnet `referenceFor`.
 */
export const NUTRIENTS: NutrientMeta[] = [
  { key: 'kcal', label: 'Kalorien', unit: 'kcal', group: 'makro', decimals: 0, refKind: 'dein Ziel' },
  {
    key: 'protein',
    label: 'Protein',
    unit: 'g',
    group: 'makro',
    decimals: 0,
    refKind: 'dein Ziel',
    refNote: 'DGE-Mindestwert 0,8 g/kg (≈ 48 g bei 60 kg). Dein Muskelaufbau-Ziel liegt bewusst höher.',
  },
  {
    key: 'carbs',
    label: 'Kohlenhydrate',
    unit: 'g',
    group: 'makro',
    decimals: 0,
    refKind: 'dein Ziel',
    refNote: 'DGE: mehr als 50 % der Energie aus Kohlenhydraten. Angaben wie auf EU-Etiketten (ohne Ballaststoffe).',
  },
  { key: 'sugar', label: 'davon Zucker', unit: 'g', group: 'makro', decimals: 0 },
  {
    key: 'fat',
    label: 'Fett',
    unit: 'g',
    group: 'makro',
    decimals: 0,
    refKind: 'dein Ziel',
    refNote: 'DGE-Richtwert: 30 % der Energie, bei hohem Energiebedarf auch mehr.',
  },
  {
    key: 'satFat',
    label: 'Gesättigte Fettsäuren',
    short: 'ges. Fett',
    unit: 'g',
    group: 'makro',
    decimals: 0,
    refKind: 'Orientierung',
    limit: true,
    refNote: 'Orientierung (WHO): höchstens 10 % der Energie. Die DGE nennt dafür keinen eigenen Tageswert.',
  },
  {
    key: 'fiber',
    label: 'Ballaststoffe',
    unit: 'g',
    group: 'makro',
    decimals: 0,
    refKind: 'dein Ziel',
    refNote: 'DGE-Richtwert: mindestens 30 g pro Tag.',
  },
  { key: 'vitA', label: 'Vitamin A', unit: 'µg', group: 'vitamin', decimals: 0, reference: 850, refKind: 'Empfehlung', refNote: 'µg Retinol-Aktivitätsäquivalente' },
  { key: 'b1', label: 'Vitamin B1 (Thiamin)', short: 'B1', unit: 'mg', group: 'vitamin', decimals: 2, reference: 1.3, refKind: 'Empfehlung' },
  { key: 'b2', label: 'Vitamin B2 (Riboflavin)', short: 'B2', unit: 'mg', group: 'vitamin', decimals: 2, reference: 1.4, refKind: 'Empfehlung' },
  {
    key: 'b3',
    label: 'Vitamin B3 (Niacin)',
    short: 'Niacin',
    unit: 'mg',
    group: 'vitamin',
    decimals: 1,
    reference: 16,
    refKind: 'Empfehlung',
    refNote: 'mg Niacin-Äquivalente. Geschätzt als Niacin + Tryptophan/60 (Tryptophan ≈ 1,2 % des Proteins).',
  },
  { key: 'b5', label: 'Vitamin B5 (Pantothensäure)', short: 'B5', unit: 'mg', group: 'vitamin', decimals: 1, reference: 5, refKind: 'Schätzwert' },
  { key: 'b6', label: 'Vitamin B6', short: 'B6', unit: 'mg', group: 'vitamin', decimals: 2, reference: 1.6, refKind: 'Empfehlung' },
  {
    key: 'biotin',
    label: 'Biotin',
    unit: 'µg',
    group: 'vitamin',
    decimals: 0,
    reference: 40,
    refKind: 'Schätzwert',
    refNote: 'Für viele Lebensmittel gibt es keine verlässlichen Biotin-Daten. Der Wert ist deshalb meist unvollständig.',
  },
  { key: 'folate', label: 'Folat', unit: 'µg', group: 'vitamin', decimals: 0, reference: 300, refKind: 'Empfehlung', refNote: 'µg Folat-Äquivalente' },
  { key: 'b12', label: 'Vitamin B12', short: 'B12', unit: 'µg', group: 'vitamin', decimals: 1, reference: 4, refKind: 'Schätzwert' },
  { key: 'vitC', label: 'Vitamin C', unit: 'mg', group: 'vitamin', decimals: 0, reference: 110, refKind: 'Empfehlung' },
  {
    key: 'vitD',
    label: 'Vitamin D',
    unit: 'µg',
    group: 'vitamin',
    decimals: 1,
    reference: 20,
    refKind: 'Schätzwert',
    refNote: 'Gilt bei fehlender Eigenbildung. Den Großteil bildet die Haut bei Sonnenlicht, über Essen ist der Wert kaum erreichbar.',
  },
  { key: 'vitE', label: 'Vitamin E', unit: 'mg', group: 'vitamin', decimals: 1, reference: 8, refKind: 'Schätzwert', refNote: 'mg RRR-α-Tocopherol' },
  { key: 'vitK', label: 'Vitamin K', unit: 'µg', group: 'vitamin', decimals: 0, reference: 70, refKind: 'Schätzwert' },
  { key: 'calcium', label: 'Calcium', unit: 'mg', group: 'mineral', decimals: 0, reference: 1000, refKind: 'Empfehlung' },
  { key: 'magnesium', label: 'Magnesium', unit: 'mg', group: 'mineral', decimals: 0, reference: 350, refKind: 'Schätzwert' },
  { key: 'potassium', label: 'Kalium', unit: 'mg', group: 'mineral', decimals: 0, reference: 4000, refKind: 'Schätzwert' },
  { key: 'iron', label: 'Eisen', unit: 'mg', group: 'mineral', decimals: 1, reference: 11, refKind: 'Empfehlung' },
  {
    key: 'zinc',
    label: 'Zink',
    unit: 'mg',
    group: 'mineral',
    decimals: 1,
    reference: 14,
    refKind: 'Empfehlung',
    refNote: 'Bei mittlerer Phytatzufuhr. Niedrige Phytatzufuhr: 11 mg, hohe: 16 mg.',
  },
  {
    key: 'iodine',
    label: 'Jod',
    unit: 'µg',
    group: 'mineral',
    decimals: 0,
    reference: 150,
    refKind: 'Empfehlung',
    refNote: 'Für Fleisch, Getreide und Gemüse fehlen oft Jod-Daten. Jodsalz ist meist die wichtigste Quelle.',
  },
  { key: 'selenium', label: 'Selen', unit: 'µg', group: 'mineral', decimals: 0, reference: 70, refKind: 'Schätzwert' },
  { key: 'phosphorus', label: 'Phosphor', unit: 'mg', group: 'mineral', decimals: 0, reference: 550, refKind: 'Schätzwert' },
  { key: 'copper', label: 'Kupfer', unit: 'mg', group: 'mineral', decimals: 2, reference: 1, refKind: 'Schätzwert', refNote: 'Schätzwert-Bereich 1,0–1,5 mg.' },
  {
    key: 'sodium',
    label: 'Natrium',
    unit: 'mg',
    group: 'mineral',
    decimals: 0,
    reference: 2400,
    refKind: 'Orientierung',
    limit: true,
    refNote: 'DGE-Schätzwert für eine angemessene Zufuhr: 1500 mg. Als Obergrenze gilt die Orientierung von höchstens 6 g Salz (≈ 2400 mg Natrium).',
  },
  {
    key: 'omega3',
    label: 'Omega-3 gesamt',
    short: 'Omega-3',
    unit: 'g',
    group: 'weitere',
    decimals: 2,
    refNote: 'Summe aus ALA, EPA und DHA, soweit Daten vorliegen.',
  },
  {
    key: 'epaDha',
    label: 'EPA + DHA',
    unit: 'mg',
    group: 'weitere',
    decimals: 0,
    reference: 250,
    refKind: 'Orientierung',
    refNote: 'Die DGE nennt für Erwachsene keinen Tageswert. Orientierung: EFSA 250 mg/Tag, entspricht etwa 1–2 Portionen fettem Fisch pro Woche.',
  },
  {
    key: 'ala',
    label: 'Alpha-Linolensäure (ALA)',
    short: 'ALA',
    unit: 'g',
    group: 'weitere',
    decimals: 2,
    refKind: 'Schätzwert',
    refNote: 'DGE-Schätzwert: 0,5 % der Energie.',
  },
]

export const NUTRIENT_META: Record<NutrientKey, NutrientMeta> = Object.fromEntries(
  NUTRIENTS.map((n) => [n.key, n]),
) as Record<NutrientKey, NutrientMeta>

export const FLUID_DGE_ML = 1470

/** Referenzwert pro Tag, abhängig von deinen Zielen in den Einstellungen. */
export function referenceFor(key: NutrientKey, settings: Settings): number | undefined {
  const t = settings.targets
  switch (key) {
    case 'kcal':
      return t.kcal
    case 'protein':
      return t.protein
    case 'carbs':
      return t.carbs
    case 'fat':
      return t.fat
    case 'fiber':
      return t.fiber
    case 'satFat':
      return Math.round((t.kcal * 0.1) / 9)
    case 'ala':
      return Math.round(((t.kcal * 0.005) / 9) * 100) / 100
    default:
      return NUTRIENT_META[key].reference
  }
}

/** Nährstoffe, die in Übersichten und Analysen als Mikronährstoffe gezeigt werden. */
export const MICRO_KEYS: NutrientKey[] = NUTRIENTS.filter((n) => n.group !== 'makro').map((n) => n.key)

export const MACRO_KEYS: NutrientKey[] = ['kcal', 'protein', 'carbs', 'fat', 'satFat', 'fiber']
