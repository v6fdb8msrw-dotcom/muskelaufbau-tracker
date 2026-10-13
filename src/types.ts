// Gemeinsame Typen der App. Reine Datenstrukturen, keine Logik.

export const NUTRIENT_KEYS = [
  'kcal',
  'protein',
  'carbs',
  'sugar',
  'fat',
  'satFat',
  'fiber',
  'vitA',
  'b1',
  'b2',
  'b3',
  'b5',
  'b6',
  'biotin',
  'folate',
  'b12',
  'vitC',
  'vitD',
  'vitE',
  'vitK',
  'calcium',
  'magnesium',
  'potassium',
  'iron',
  'zinc',
  'iodine',
  'selenium',
  'phosphorus',
  'copper',
  'sodium',
  'omega3',
  'epaDha',
  'ala',
] as const

export type NutrientKey = (typeof NUTRIENT_KEYS)[number]

/** Nährwerte. Fehlender Schlüssel = keine Daten (nicht 0!). */
export type Nutrients = Partial<Record<NutrientKey, number>>

/**
 * Nährwerte mit Angabe, wo Daten nur teilweise vorliegen.
 * `partial` enthält Schlüssel, deren Wert eine Untergrenze ist, weil
 * mindestens eine Zutat dafür keine Daten hat.
 */
export interface NutrientProfile {
  values: Nutrients
  partial: NutrientKey[]
}

export type FoodTag =
  | 'mushroom'
  | 'cauliflower'
  | 'brussels'
  | 'broccoli'
  | 'spinach-cooked'
  | 'nut'
  | 'peanut'
  | 'shrimp'
  | 'mollusc'
  | 'kohlrabi'
  | 'tomato'
  | 'potato'

export type FoodCategory =
  | 'fleisch'
  | 'fisch'
  | 'milch'
  | 'ei'
  | 'getreide'
  | 'huelsenfruechte'
  | 'gemuese'
  | 'salat'
  | 'obst'
  | 'fertig'
  | 'fett'
  | 'wuerze'
  | 'sauce'
  | 'getraenk'

export interface Food {
  id: string
  name: string
  category: FoodCategory
  unit: 'g' | 'ml'
  /** Nährwerte pro 100 g bzw. 100 ml. Fehlende Werte = keine Daten. */
  per100: Nutrients
  /** Übliche Stückgröße, z. B. Ei ≈ 55 g essbarer Anteil. */
  piece?: { label: string; amount: number }
  /** Standardpackung und geschätzter Kassenpreis (editierbar). */
  pack?: { amount: number; label: string; price: number }
  tags?: FoodTag[]
  /**
   * liked: ausdrücklich gemocht · optional: Gemüse, bei dem die App vorsichtig ist
   * (wird nur nach Freigabe fest eingeplant).
   */
  pref?: 'liked' | 'optional'
  /** Brot, Toast, üblicher Belag: immer vorhanden, nie auf der Einkaufsliste. */
  staple?: boolean
  /** Grundvorrat (Öl, Salz, Gewürze …): als vorhanden angenommen, in den Einstellungen änderbar. */
  basic?: boolean
  /** Günstigere Alternative als Text. */
  cheaper?: string
  /** Liefert praktisch keine Nährstoffe (Wasser, Tee): fehlende Werte gelten nicht als Datenlücke. */
  negligible?: boolean
  /** Werte sind grobe Produktschätzungen und sollten mit dem Etikett abgeglichen werden. */
  labelEstimate?: boolean
  note?: string
}

export type RecipeCategory =
  | 'reis-nudel-pfanne'
  | 'tortellini-maultaschen'
  | 'fleisch'
  | 'fisch'
  | 'huelsenfruechte'
  | 'salat-kalt'
  | 'brot-ei-kaese'
  | 'convenience'
  | 'protein-kreationen'
  | 'protein-guenstig'
  | 'kalorien-protein'
  | 'kalorien-booster'

export type MealSlot = 'fruehstueck' | 'mittag' | 'snack' | 'abend' | 'spaet'

export interface RecipeIngredient {
  foodId: string
  amount: number
  optional?: boolean
  note?: string
}

export interface Recipe {
  id: string
  name: string
  category: RecipeCategory
  servings: number
  minutes: number
  ingredients: RecipeIngredient[]
  steps: string[]
  /** Rezeptspezifische Spartipps, zusätzlich zu den automatisch ermittelten. */
  tips?: string[]
  meals: MealSlot[]
  /** Hält sich gut bis zum nächsten Tag (Reste, Meal-Prep). */
  keeps?: boolean
  intro?: string
}

// ---------- Training ----------

export type MuscleGroup = 'brust' | 'ruecken' | 'schulter' | 'bizeps' | 'trizeps' | 'bauch' | 'ausdauer'

export interface Exercise {
  id: string
  name: string
  group: MuscleGroup
  unilateral: boolean
  measure: 'reps' | 'time'
  core?: boolean
  equipment: string[]
  muscles: string[]
  start: string[]
  execution: string[]
  breathing: string
  mistakes: string[]
  safety: string[]
  variants: string[]
  /** Bei Körpergewichtsübungen: kein Hantelgewicht. */
  bodyweight?: boolean
  /** Kurzanleitung in drei Punkten für das Mini-Tutorial */
  cues?: string[]
  /** Suchbegriff für Kurzvideos (YouTube) */
  video?: string
  /** Hinweis, dass die Übung später mit anderem Gerät gemacht wird (z. B. Kettlebell) */
  later?: string
  /** Entsprechende Übung im Fitnessstudio */
  gym?: string
  /** Empfehlung für den Start (Oberkörper-Einsteiger, 10–15 Wiederholungen mit 2–3 in Reserve) */
  startWeight?: { kg?: [number, number]; per?: 'hand' | 'hantel'; text?: string }
}

export interface PlannedExercise {
  exerciseId: string
  sets: number
  /** Sätze gelten je Seite (einarmige Übungen, Side Plank). */
  perSide?: boolean
  min: number
  max: number
  unit: 'reps' | 'sec'
  /** Wiederholungen je Seite innerhalb eines Satzes (Dead Bug). */
  repsPerSide?: boolean
  /** Bis zum Muskelversagen (z. B. Plank) */
  toFailure?: boolean
  /** Zusatzübung, darf wegfallen */
  optional?: boolean
  /** Schwerpunkt (Arme, Rücken, Brust): in der Intensivphase ein Satz mehr */
  priority?: boolean
  note?: string
}

/** Aktuelle Einheiten: Pull und Push im Wechsel, je mit Calisthenics-Block. Die alten IDs bleiben für frühere Einträge gültig. */
export type SessionId = 'pull-a' | 'cali-a' | 'push-b' | 'cali-b' | 'leicht' | 'arme-c' | 'mo-a' | 'arme-a' | 'fr-b' | 'ok-b'

/** Ausdauer-Teil einer Einheit in Minuten (Rudergerät zum Einstieg, Walking-Pad am Ende). */
export interface CardioBlock {
  exerciseId: string
  min: number
  max: number
  optional?: boolean
  note?: string
}

export interface TrainingSession {
  id: SessionId
  title: string
  short: string
  focus: string
  /** Teil des Tages, z. B. „Hanteln“ oder „Calisthenics · 1–2 h später“ */
  block?: string
  exercises: PlannedExercise[]
  /** Einstieg vor den Übungen (Farmer’s Walk auf dem Walking-Pad) */
  warmup?: CardioBlock
  /** Aufwärmen in Worten (z. B. leichte Sätze der ersten Übung) */
  warmupText?: string
  finisher?: CardioBlock
  flexible?: boolean
}

// ---------- Gespeicherte Einträge ----------

interface BaseRecord {
  id: string
  createdAt: string
  updatedAt: string
}

export type FoodLogSource =
  | { kind: 'recipe'; recipeId: string; portions: number; optionalIncluded: string[] }
  | { kind: 'food'; foodId: string; amount: number }
  | { kind: 'product'; productId: string; amount: number }
  | { kind: 'leftover'; pantryId: string; recipeId?: string; portions: number }
  | { kind: 'free' }

export interface FoodLogEntry extends BaseRecord {
  date: string
  time: string
  meal: MealSlot
  name: string
  source: FoodLogSource
  nutrients: Nutrients
  partial: NutrientKey[]
  /** Liefert praktisch keine Nährstoffe: fehlende Werte gelten nicht als Datenlücke. */
  negligible?: boolean
  note?: string
  /** Verknüpfter Eintrag im Wochenplan, damit er nicht doppelt zählt. */
  planId?: string
}

export interface DrinkLogEntry extends BaseRecord {
  date: string
  time: string
  drinkId: string
  productId?: string
  name: string
  ml: number
  nutrients: Nutrients
  partial: NutrientKey[]
  negligible?: boolean
}

export interface SupplementLogEntry extends BaseRecord {
  date: string
  time: string
  kind: 'creatine' | 'protein'
  grams: number
  productId?: string
  liquid?: 'wasser' | 'milch'
  liquidMl?: number
  nutrients: Nutrients
  partial: NutrientKey[]
  negligible?: boolean
  note?: string
}

export interface SetLog {
  side?: 'left' | 'right'
  weightKg?: number
  reps?: number
  seconds?: number
  clean: boolean
  extra?: boolean
}

export interface ExerciseLog {
  exerciseId: string
  sets: SetLog[]
  note?: string
}

export interface WorkoutLog extends BaseRecord {
  date: string
  sessionId?: SessionId
  /** Schlüssel der Kalendereinheit (z. B. "w3-mo-a"). Verknüpft Kalender und Protokoll. */
  plannedKey?: string
  title: string
  exercises: ExerciseLog[]
  durationMin?: number
  recovery?: 1 | 2 | 3
  cardio?: { kind: 'rudern' | 'laufband'; minutes: number }[]
  notes?: string
}

export interface WeightEntry extends BaseRecord {
  date: string
  kg: number
  note?: string
}

export interface ArmMeasurement extends BaseRecord {
  date: string
  leftCm: number
  rightCm: number
  state: 'entspannt' | 'angespannt'
  note?: string
}

export interface MealPlanEntry extends BaseRecord {
  date: string
  slot: MealSlot
  recipeId: string
  /** Gekochte Portionen (2 = Rest für den nächsten Tag). */
  portions: number
  /** Dieser Eintrag isst den Rest eines anderen Plan-Eintrags. */
  leftoverOf?: string
  optionalIncluded?: string[]
}

export interface PantryItem extends BaseRecord {
  kind: 'food' | 'leftover'
  foodId?: string
  recipeId?: string
  name: string
  amount: number
  unit: 'g' | 'ml' | 'Portion'
  /** Bei Resten: Nährwerte pro Portion. */
  nutrients?: Nutrients
  partial?: NutrientKey[]
  bestBefore?: string
}

export interface ShoppingCheck extends BaseRecord {
  week: string
  foodId: string
  checked: boolean
  transferred?: boolean
  /** Beim Übernehmen in den Vorrat gekaufte Packungen (für die Budgetübersicht) */
  boughtPacks?: number
  /** Zusätzlich von Hand oder per Vorschlag hinzugefügte Menge (außerhalb des Wochenplans) */
  extraAmount?: number
}

/** Freihand-Eintrag auf der Einkaufsliste: Produkt, Menge, Preis und wofür es gedacht ist. */
export interface ShoppingItem extends BaseRecord {
  /** Montag der Woche */
  week: string
  name: string
  /** Eigenes Produkt mit Etikettwerten (für die Nährwert-Analyse) */
  productId?: string
  /** Anzahl Packungen */
  packs: number
  /** Preis pro Packung in Euro */
  price?: number
  /** Für welches Essen (frei, z. B. „Meal-Prep Hähnchen-Reis“) */
  meal?: string
  store?: string
  /** Gekauft */
  checked: boolean
  /** Zählt zum Wochenbudget */
  inBudget: boolean
  note?: string
}

export interface Product extends BaseRecord {
  kind: 'smoothie' | 'protein' | 'drink' | 'food'
  name: string
  brand?: string
  shop?: string
  unit: 'g' | 'ml'
  /** Packungs- bzw. Flaschengröße. */
  size?: number
  price?: number
  /** Werte laut Etikett pro 100 g/ml. Nur eintragen, was auf dem Etikett steht. */
  per100: Nutrients
  favorite: boolean
  /** Übliche Portion (z. B. 30 g Pulver pro Shake) */
  serving?: number
  /** Bezeichnung der Portion, z. B. „1 Becher“ */
  portionLabel?: string
  /** Von der App mitgeliefert (z. B. ESN), Werte trotzdem änderbar */
  builtin?: boolean
  note?: string
}

export interface DayStatus extends BaseRecord {
  date: string
  complete: boolean
  note?: string
}

export interface SuggestionState extends BaseRecord {
  status: 'accepted' | 'ignored'
}

export interface ScheduleChange extends BaseRecord {
  /** = plannedKey */
  movedTo?: string
  skipped?: boolean
}

export interface TargetWeight extends BaseRecord {
  /** = exerciseId */
  kg: number
}

export interface CollectionMap {
  foodLogs: FoodLogEntry
  drinkLogs: DrinkLogEntry
  supplementLogs: SupplementLogEntry
  workouts: WorkoutLog
  weights: WeightEntry
  arms: ArmMeasurement
  mealPlan: MealPlanEntry
  pantry: PantryItem
  shopping: ShoppingCheck
  products: Product
  days: DayStatus
  suggestions: SuggestionState
  schedule: ScheduleChange
  targetWeights: TargetWeight
  shoppingItems: ShoppingItem
}

export type CollectionName = keyof CollectionMap

export const COLLECTIONS: CollectionName[] = [
  'foodLogs',
  'drinkLogs',
  'supplementLogs',
  'workouts',
  'weights',
  'arms',
  'mealPlan',
  'pantry',
  'shopping',
  'products',
  'days',
  'suggestions',
  'schedule',
  'targetWeights',
  'shoppingItems',
]

export type DataSet = { [K in CollectionName]: CollectionMap[K][] }

// ---------- Einstellungen ----------

export type Weekday = 'mo' | 'di' | 'mi' | 'do' | 'fr' | 'sa' | 'so'

export interface Settings {
  version: number
  profile: {
    name: string
    age: number
    sex: 'm' | 'w' | 'd'
    heightCm: number
    startWeightKg: number
    activity: string
    experience: string
    goal: string
  }
  program: {
    startDate: string
    weeks: number
    /** 5. Einheit (Tag C): Samstag, Sonntag oder „aus“ für 4 Einheiten pro Woche */
    /** Nicht mehr genutzt (bis Oktober 2026: Tag C am Samstag oder Sonntag) */
    extraDay: 'sa' | 'so' | 'aus'
    pulloverSuitable: boolean
    extraWeakSet: boolean
    dumbbellStepKg: number
    equipment: { dumbbells: boolean; rower: boolean; treadmill: boolean; pullupBar: boolean }
  }
  targets: {
    kcal: number
    protein: number
    fat: number
    carbs: number
    fiber: number
    fluidMl: number
    gainMinG: number
    gainMaxG: number
    bmrEstimate: number
    maintenanceMin: number
    maintenanceMax: number
  }
  arms: { weakerSide: 'left' | 'right' | null }
  supplements: {
    creatineEnabled: boolean
    creatineDoseG: number
    creatineReminder: boolean
    proteinPowderAvailable: boolean
    proteinProductId?: string
  }
  budget: {
    min: number
    max: number
    mondayLeftovers: boolean
    co2Needed: boolean
    co2Price: number
  }
  prices: Record<string, { price?: number; amount?: number }>
  /** Grundvorrat: false = nicht vorhanden, erscheint dann auf der Einkaufsliste. */
  basics: Record<string, boolean>
  food: {
    excludedTags: FoodTag[]
    avoidTags: FoodTag[]
    /** Optionale Gemüse, die du freigegeben hast (werden fest eingeplant). */
    acceptedOptional: string[]
    /** Produkte, die trotz Tag erlaubt sind (z. B. Fertigpizza trotz Tomatensoße). */
    exceptions: string[]
    excludedFoods: string[]
  }
  favorites: string[]
  spotify: {
    artists: string[]
    savedPlaylists: { id: string; name: string; url: string; sessionId?: SessionId }[]
  }
  mealTimes: { lunch: string; dinner: string; late: string }
}
