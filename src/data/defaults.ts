import type { FoodTag, Settings } from '../types'
import { todayISO } from '../lib/date'
import { ESN_DEFAULT_PROTEIN } from './supplements'

export const EXCLUDED_TAG_LABEL: Record<FoodTag, string> = {
  mushroom: 'Pilze',
  cauliflower: 'Blumenkohl',
  brussels: 'Rosenkohl',
  broccoli: 'Brokkoli',
  'spinach-cooked': 'Gekochter Spinat',
  nut: 'Nüsse aller Art (inkl. Pistazien)',
  peanut: 'Erdnüsse',
  shrimp: 'Garnelen und Shrimps',
  mollusc: 'Muscheln und andere Weichtiere',
  kohlrabi: 'Kohlrabi',
  tomato: 'Tomaten, Tomatensoße, Tomatenmark',
  potato: 'Gekochte Kartoffeln als Grundlage',
}

export const DEFAULT_EXCLUDED_TAGS: FoodTag[] = [
  'mushroom',
  'cauliflower',
  'brussels',
  'broccoli',
  'spinach-cooked',
  'nut',
  'peanut',
  'shrimp',
  'mollusc',
  'kohlrabi',
]

export const DEFAULT_AVOID_TAGS: FoodTag[] = ['tomato', 'potato']

export const SETTINGS_VERSION = 7

/** Deine Startwerte aus dem Auftrag. In den Einstellungen jederzeit änderbar. */
export function createDefaultSettings(): Settings {
  return {
    version: SETTINGS_VERSION,
    profile: {
      name: '',
      age: 22,
      sex: 'm',
      heightCm: 171,
      startWeightKg: 60.3,
      activity: 'gering, überwiegend sitzend',
      experience: 'kaum Krafttraining',
      goal: 'Möglichst viel Muskelmasse in drei bis vier Monaten aufbauen',
    },
    program: {
      startDate: todayISO(),
      weeks: 16,
      extraDay: 'sa',
      pulloverSuitable: true,
      extraWeakSet: true,
      dumbbellStepKg: 1,
      equipment: { dumbbells: true, rower: true, treadmill: true, pullupBar: false },
    },
    // Ziele seit 13.10.2026 (Tims Wunsch): schlank bleiben und sichtbar Muskeln aufbauen.
    // Etwa Erhaltungsbedarf. Eiweiß 110 g (≈ 1,8 g/kg) statt mehr, weil Eiweiß stark sättigt
    // und sonst kein Platz für Kalorien bleibt. Mehr Kalorien nur, wenn das Gewicht sinkt.
    targets: {
      kcal: 1900,
      protein: 110,
      fat: 65,
      carbs: 220,
      fiber: 25,
      fluidMl: 1500,
      gainMinG: 0,
      gainMaxG: 150,
      bmrEstimate: 1567,
      maintenanceMin: 1900,
      maintenanceMax: 2100,
    },
    // Links ist schwächer: links beginnen, rechts gleiches Gewicht und gleiche Wiederholungen
    arms: { weakerSide: 'left' },
    supplements: {
      creatineEnabled: true,
      creatineDoseG: 3,
      creatineReminder: false,
      proteinPowderAvailable: true,
      proteinProductId: ESN_DEFAULT_PROTEIN,
    },
    budget: {
      min: 15,
      max: 20,
      mondayLeftovers: true,
      co2Needed: false,
      co2Price: 9.99,
    },
    prices: {},
    basics: {},
    food: {
      excludedTags: [...DEFAULT_EXCLUDED_TAGS],
      avoidTags: [...DEFAULT_AVOID_TAGS],
      acceptedOptional: [],
      exceptions: ['pizza-salami'],
      excludedFoods: [],
    },
    favorites: [],
    spotify: {
      artists: ['Gunna', 'Ty Dolla Sign', 'Kid Cudi', 'Don Toliver', 'Future', 'Young Thug', 'Casper', 'Chapo102', 'Badchieff'],
      savedPlaylists: [],
    },
    mealTimes: { lunch: '11:00', dinner: '19:00', late: '22:00' },
  }
}

/** Fehlende Felder (z. B. nach einem Update) mit Standardwerten auffüllen. */
export function normalizeSettings(input: Partial<Settings> | undefined): Settings {
  const d = createDefaultSettings()
  if (!input) return d
  return {
    ...d,
    ...input,
    version: SETTINGS_VERSION,
    profile: { ...d.profile, ...input.profile },
    program: { ...d.program, ...input.program, equipment: { ...d.program.equipment, ...input.program?.equipment } },
    targets: { ...d.targets, ...input.targets },
    arms: { ...d.arms, ...input.arms },
    supplements: { ...d.supplements, ...input.supplements },
    budget: { ...d.budget, ...input.budget },
    prices: input.prices ?? {},
    basics: input.basics ?? {},
    food: { ...d.food, ...input.food },
    favorites: input.favorites ?? [],
    spotify: { ...d.spotify, ...input.spotify },
    mealTimes: { ...d.mealTimes, ...input.mealTimes },
  }
}

/**
 * Gespeicherte Einstellungen älterer Versionen anheben.
 * 1 → 2: Profil und Ziele auf deine Startwerte aus dem Auftrag setzen (vorher konnten dort
 *   neutrale Platzhalter stehen), Kreatin und Proteinpulver aktivieren.
 * 2 → 3: Afri-Cola und Energy-Drinks sind nicht mehr automatisch im Budget. Getränke trägst du
 *   wie alles andere selbst auf der Einkaufsliste ein.
 */
export function migrateSettings(stored: (Partial<Settings> & { funDrinks?: unknown }) | undefined): { settings: Settings; changed: boolean } {
  if (!stored) return { settings: createDefaultSettings(), changed: true }
  const version = stored.version ?? 1
  if (version >= SETTINGS_VERSION) return { settings: normalizeSettings(stored), changed: false }
  const rest = { ...stored }
  delete rest.funDrinks
  let s = normalizeSettings(rest)
  if (version < 2) {
    const d = createDefaultSettings()
    s = {
      ...s,
      profile: { ...d.profile, name: s.profile.name },
      targets: d.targets,
      supplements: { ...s.supplements, creatineEnabled: true, proteinPowderAvailable: true, proteinProductId: s.supplements.proteinProductId ?? ESN_DEFAULT_PROTEIN },
      budget: s.budget.max === 25 ? d.budget : s.budget,
      spotify: { ...s.spotify, artists: s.spotify.artists.length ? s.spotify.artists : d.spotify.artists },
    }
  }
  if (version < 4) {
    // Version 4: Pull/Push-Split mit optionaler 5. Einheit, linker Arm als schwächerer
    const old = s.program as Settings['program'] & { secondDay?: string; weekendDay?: string }
    const program = { ...old, extraDay: old.extraDay ?? 'sa' } as Settings['program'] & { secondDay?: string; weekendDay?: string }
    delete program.secondDay
    delete program.weekendDay
    s = { ...s, program, arms: { ...s.arms, weakerSide: s.arms.weakerSide ?? 'left' } }
  }
  if (version < 7) {
    // Version 6/7: realistische Ziele (1.900 kcal, 110 g Eiweiß, 1,5 l), mehr Kalorien nur bei Gewichtsverlust
    const d = createDefaultSettings()
    s = { ...s, targets: { ...s.targets, kcal: d.targets.kcal, protein: d.targets.protein, fat: d.targets.fat, carbs: d.targets.carbs, fiber: d.targets.fiber, fluidMl: d.targets.fluidMl, gainMinG: d.targets.gainMinG, gainMaxG: d.targets.gainMaxG } }
  }
  if (version < 5) {
    // Version 5: Zusatzsatz für die schwächere Seite ab Woche 4 standardmäßig an
    s = { ...s, program: { ...s.program, extraWeakSet: true } }
  }
  return { changed: true, settings: s }
}

export const DRINK_PRESETS: { id: string; foodId: string; label: string; icon: string }[] = [
  { id: 'wasser', foodId: 'wasser', label: 'Wasser', icon: 'droplet' },
  { id: 'sprudel', foodId: 'sprudel', label: 'Sprudel', icon: 'sparkles' },
  { id: 'tee', foodId: 'tee', label: 'Tee', icon: 'leaf' },
  { id: 'kaffee', foodId: 'kaffee', label: 'Kaffee', icon: 'coffee' },
  { id: 'afri-cola', foodId: 'afri-cola', label: 'Afri-Cola', icon: 'cup' },
  { id: 'energy', foodId: 'energy', label: 'Energy', icon: 'zap' },
  { id: 'milch', foodId: 'milch', label: 'Milch', icon: 'milk' },
  { id: 'orangensaft', foodId: 'orangensaft', label: 'O-Saft', icon: 'citrus' },
]

export const QUICK_AMOUNTS = [150, 250, 330, 500, 750]
