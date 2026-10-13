import { describe, expect, it } from 'vitest'
import { testSettings } from '../test/fixtures'
import { buildCreatineLog, buildDrinkLog, buildFoodLog, buildFreeLog, buildProteinLog, buildRecipeLog, findDuplicate } from '../state/actions'
import { COLLECTIONS, type DataSet, type MealPlanEntry, type Product, type Settings, type ShoppingItem, type WeightEntry, type WorkoutLog } from '../types'
import { generateLunchPlan } from './mealplan'
import { analyzeRange, dayTotals } from './nutrition'
import { analyzeProduct, groupByMeal, perPortionToPer100, weekBudget } from './purchases'
import { planNeeds } from './shopping'
import { EXERCISE_MAP } from '../data/exercises'
import { PICTOGRAMS } from '../data/pictograms'
import { PHASES, SESSION_MAP, SESSIONS, WEEKLY_ROWING } from '../data/plan'
import {
  formatDosage,
  makeupDay,
  plannedSessionsForWeek,
  programWeek,
  progressionHints,
  sessionStatus,
  setSlots,
  setsForWeek,
  startWeightLabel,
  videoSearchUrl,
} from './training'
import { buildWeeklyReport } from './weekly'
import { calorieSuggestion, withMovingAverage } from './weight'

const MONDAY = '2026-10-12'

function settingsWith(patch: (s: Settings) => Settings = (s) => s): Settings {
  return patch(testSettings())
}

function emptyData(): DataSet {
  return Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as DataSet
}

const ts = '2026-10-12T10:00:00.000Z'
const meta = (id: string) => ({ id, createdAt: ts, updatedAt: ts })

describe('Tagesprotokoll und Nährwerte', () => {
  it('fehlende Einträge sind keine Nullwerte', () => {
    const data = emptyData()
    const t = dayTotals(data, MONDAY)
    expect(t.entryCount).toBe(0)
    expect(t.profile.values.kcal).toBeUndefined()
  })

  it('freie Einträge machen Mikronährstoffe zur Untergrenze', () => {
    const s = settingsWith()
    const data = emptyData()
    data.foodLogs.push(buildRecipeLog('r001', s, { date: MONDAY, time: '11:00' }))
    data.foodLogs.push(buildFreeLog('Mensa-Essen', { kcal: 700, protein: 30 }, { date: MONDAY, time: '13:00' }))
    const t = dayTotals(data, MONDAY)
    expect(t.profile.values.kcal).toBeGreaterThan(1200)
    expect(t.profile.partial).toContain('vitC')
    expect(t.profile.partial).not.toContain('kcal')
  })

  it('Wasser verursacht keine Datenlücke, kalorienhaltige Getränke zählen zu den Kalorien', () => {
    const data = emptyData()
    data.drinkLogs.push(buildDrinkLog({ drinkId: 'wasser', ml: 500, date: MONDAY }))
    data.drinkLogs.push(buildDrinkLog({ drinkId: 'afri-cola', ml: 330, date: MONDAY }))
    data.foodLogs.push(buildFoodLog('ei', 110, { date: MONDAY, time: '08:00' }))
    const t = dayTotals(data, MONDAY)
    expect(t.fluidMl).toBe(830)
    expect(t.profile.values.kcal).toBeCloseTo(154 + 330 * 0.42, 0)
    expect(t.profile.partial).not.toContain('vitA')
  })

  it('Kreatin liefert kein Protein, Proteinshake erst nach Eintrag', () => {
    const data = emptyData()
    data.supplementLogs.push(buildCreatineLog(3, MONDAY))
    expect(dayTotals(data, MONDAY).profile.values.protein ?? 0).toBe(0)
    const product: Product = { ...meta('p1'), kind: 'protein', name: 'Whey', unit: 'g', per100: { kcal: 380, protein: 78, carbs: 6, fat: 5 }, favorite: false }
    data.supplementLogs.push(buildProteinLog({ product, grams: 30, liquid: 'milch', liquidMl: 300, date: MONDAY }))
    const t = dayTotals(data, MONDAY)
    expect(t.profile.values.protein).toBeCloseTo(23.4 + 10.2, 1)
    expect(t.fluidMl).toBe(300)
  })

  it('7-Tage-Auswertung nutzt nur vollständige Tage und markiert sonst vorläufig', () => {
    const s = settingsWith()
    const data = emptyData()
    data.foodLogs.push(buildRecipeLog('r001', s, { date: '2026-10-12' }))
    data.foodLogs.push(buildRecipeLog('r002', s, { date: '2026-10-13' }))
    let r = analyzeRange(data, '2026-10-18')
    expect(r.provisional).toBe(true)
    expect(r.usedDays).toHaveLength(2)
    data.days.push({ ...meta('d1'), date: '2026-10-13', complete: true })
    r = analyzeRange(data, '2026-10-18')
    expect(r.provisional).toBe(false)
    expect(r.usedDays.map((d) => d.date)).toEqual(['2026-10-13'])
  })

  it('erkennt mögliche Doppeleinträge', () => {
    const s = settingsWith()
    const a = buildRecipeLog('r001', s, { date: MONDAY, time: '11:00' })
    const b = buildRecipeLog('r001', s, { date: MONDAY, time: '11:10' })
    const c = buildRecipeLog('r001', s, { date: MONDAY, time: '19:00' })
    expect(findDuplicate([a], b)).toBe(a)
    expect(findDuplicate([a], c)).toBeUndefined()
  })
})

describe('Training', () => {
  it('Pull und Push im Wechsel: Mo, Di, Do, Fr plus Tag C als 5. Einheit', () => {
    const s = settingsWith()
    const week1 = plannedSessionsForWeek(s, [], 1)
    expect(week1.map((p) => p.date)).toEqual(['2026-10-12', '2026-10-13', '2026-10-15', '2026-10-16', '2026-10-17'])
    expect(week1.map((p) => p.sessionId)).toEqual(['pull-a', 'push-b', 'pull-a', 'push-b', 'arme-c'])
    expect(week1.every((p) => !p.optional)).toBe(true)
    const sunday = settingsWith((x) => ({ ...x, program: { ...x.program, extraDay: 'so' } }))
    expect(plannedSessionsForWeek(sunday, [], 1).at(-1)?.date).toBe('2026-10-18')
    const four = settingsWith((x) => ({ ...x, program: { ...x.program, extraDay: 'aus' } }))
    expect(plannedSessionsForWeek(four, [], 1)).toHaveLength(4)
    // Tag C zählt bei 5 Einheiten wie jede andere Einheit
    expect(sessionStatus(week1[4], [], '2026-10-19')).toBe('missed')
    // Farmer’s Walk 15 min zu Beginn jeder Einheit
    for (const x of SESSIONS) expect(x.warmup, x.id).toMatchObject({ exerciseId: 'farmers-walk', min: 15, max: 15 })
    // Rudern nur einmal pro Woche, am Ende der letzten Einheit
    expect(week1.filter((p) => p.rowing).map((p) => p.date)).toEqual(['2026-10-17'])
    expect(plannedSessionsForWeek(settingsWith((x) => ({ ...x, program: { ...x.program, extraDay: 'aus' } })), [], 1).filter((p) => p.rowing).map((p) => p.date)).toEqual(['2026-10-16'])
  })

  it('Plan: nur Oberkörper, jeder Muskel 2× pro Woche, keine Klimmzugstange', () => {
    const groups = (id: string) => SESSION_MAP[id as 'pull-a'].exercises.filter((e) => !e.optional).map((e) => EXERCISE_MAP[e.exerciseId].group)
    expect(groups('pull-a')).toEqual(expect.arrayContaining(['ruecken', 'bizeps', 'bauch']))
    expect(groups('push-b')).toEqual(expect.arrayContaining(['brust', 'schulter', 'trizeps', 'bauch']))
    expect(groups('arme-c')).toEqual(expect.arrayContaining(['bizeps', 'trizeps']))
    for (const session of SESSIONS) {
      for (const e of session.exercises) {
        const ex = EXERCISE_MAP[e.exerciseId]
        expect(/klimmzug|chin|pull-?up|kniebeuge|squat|ausfallschritt/i.test(ex.name + ex.equipment.join(' ')), e.exerciseId).toBe(false)
      }
    }
  })

  it('Wöchentliche Sätze in der Aufbauphase: mindestens 10 je Schwerpunkt-Muskel', () => {
    const week = 6
    const sets: Record<string, number> = {}
    for (const id of ['pull-a', 'push-b', 'pull-a', 'push-b'] as const) {
      for (const pe of SESSION_MAP[id].exercises.filter((e) => !e.optional)) {
        const g = EXERCISE_MAP[pe.exerciseId].group
        sets[g] = (sets[g] ?? 0) + setsForWeek(pe, week)
      }
    }
    for (const g of ['ruecken', 'bizeps', 'brust', 'trizeps', 'schulter']) expect(sets[g] ?? 0, g).toBeGreaterThanOrEqual(6)
    expect(sets.ruecken).toBeGreaterThanOrEqual(10)
    expect(sets.bizeps).toBeGreaterThanOrEqual(10)
  })

  it('Phasen: Technik 2 Sätze, Aufbau 3, Intensiv 4 für Schwerpunkte, Testwoche 2', () => {
    expect(PHASES.map((p) => [p.from, p.to])).toEqual([
      [1, 3],
      [4, 8],
      [9, 12],
      [13, 15],
      [16, 16],
    ])
    const curl = SESSION_MAP['pull-a'].exercises.find((e) => e.exerciseId === 'bizepscurl')!
    const fly = SESSION_MAP['pull-a'].exercises.find((e) => e.exerciseId === 'reverse-fly')!
    expect([1, 4, 10, 14, 16].map((w) => setsForWeek(curl, w))).toEqual([2, 3, 4, 4, 2])
    expect([1, 4, 10, 14, 16].map((w) => setsForWeek(fly, w))).toEqual([2, 3, 3, 3, 2])
  })

  it('Tutorials: jede Planübung hat Kurzanleitung, Video und animierte Figur', () => {
    const ids = [...SESSIONS.flatMap((x) => [x.warmup?.exerciseId, ...x.exercises.map((e) => e.exerciseId), x.finisher?.exerciseId]).filter(Boolean), WEEKLY_ROWING.exerciseId] as string[]
    for (const id of ids) {
      const ex = EXERCISE_MAP[id]
      expect(ex?.cues?.length, id).toBe(3)
      expect(ex.video, id).toBeTruthy()
      const pic = PICTOGRAMS[id]
      expect(pic, id).toBeDefined()
      const names = new Set([...pic.segments.flat(), ...(pic.far ?? []).flat(), ...(pic.thin ?? []).flat(), pic.head, ...(pic.db ?? [])])
      for (const f of pic.frames) for (const n of names) expect(f[n], `${id}: ${n}`).toBeDefined()
    }
    expect(videoSearchUrl('Seitheben')).toMatch(/^https:\/\/www\.youtube\.com\/results\?search_query=/)
  })

  it('Startgewicht für jede Planübung, Hantelübungen mit kg', () => {
    const ids = [...SESSIONS.flatMap((x) => [x.warmup?.exerciseId, ...x.exercises.map((e) => e.exerciseId), x.finisher?.exerciseId]).filter(Boolean), WEEKLY_ROWING.exerciseId] as string[]
    for (const id of new Set(ids)) {
      const ex = EXERCISE_MAP[id]
      expect(ex.startWeight?.kg ?? ex.startWeight?.text, id).toBeTruthy()
      if (!ex.bodyweight && ex.group !== 'ausdauer' && ex.measure === 'reps') expect(ex.startWeight?.kg, id).toBeDefined()
    }
    expect(startWeightLabel(EXERCISE_MAP['bizepscurl'])).toBe('5–6 kg (eine Hantel)')
    expect(startWeightLabel(EXERCISE_MAP['seitheben'])).toBe('2–3 kg pro Hand')
  })

  it('Dosierung für die Anzeige', () => {
    expect(formatDosage({ exerciseId: 'bizepscurl', sets: 2, perSide: true, min: 15, max: 15, unit: 'reps' })).toBe('2 × 15 je Seite')
    expect(formatDosage({ exerciseId: 'plank', sets: 2, min: 20, max: 120, unit: 'sec', toFailure: true })).toBe('2 × bis Versagen')
  })

  it('Programmwochen 1 bis 16', () => {
    const s = settingsWith()
    expect(programWeek(s, '2026-10-11')).toBe(0)
    expect(programWeek(s, '2026-10-12')).toBe(1)
    expect(programWeek(s, '2026-10-26')).toBe(3)
  })

  it('in den ersten drei Wochen höchstens zwei Arbeitssätze', () => {
    const pe = { exerciseId: 'floor-press', sets: 3, min: 8, max: 12, unit: 'reps' as const }
    expect(setsForWeek(pe, 1)).toBe(2)
    expect(setsForWeek(pe, 3)).toBe(2)
    expect(setsForWeek(pe, 4)).toBe(3)
  })

  it('einarmige Übungen beginnen mit der schwächeren Seite, ab Woche 4 mit Zusatzsatz', () => {
    const s = settingsWith((x) => ({ ...x, arms: { weakerSide: 'right' }, program: { ...x.program, extraWeakSet: false } }))
    const curl = { exerciseId: 'bizepscurl', sets: 3, perSide: true, min: 10, max: 15, unit: 'reps' as const }
    const slots = setSlots(curl, s, 5)
    expect(slots[0].side).toBe('right')
    expect(slots[1].side).toBe('left')
    expect(slots).toHaveLength(6)
    const on = { ...s, program: { ...s.program, extraWeakSet: true } }
    expect(setSlots(curl, on, 3)).toHaveLength(4)
    const extra = setSlots(curl, on, 5)
    expect(extra).toHaveLength(7)
    expect(extra[6]).toMatchObject({ side: 'right', extra: true })
    expect(setSlots(curl, on, 16)).toHaveLength(4)
  })

  it('Progression erst, wenn alle Sätze sauber die Obergrenze erreichen', () => {
    const s = settingsWith()
    const w = (reps: number[], clean = true): WorkoutLog => ({
      ...meta('w' + reps.join('')),
      date: '2026-10-26',
      title: 'Test',
      exercises: [{ exerciseId: 'schulterdruecken', sets: reps.map((r) => ({ reps: r, weightKg: 10, clean })) }],
    })
    expect(progressionHints([w([15, 14])], s, []).filter((h) => h.exerciseId === 'schulterdruecken')).toHaveLength(0)
    expect(progressionHints([w([15, 15], false)], s, []).filter((h) => h.exerciseId === 'schulterdruecken')).toHaveLength(0)
    const hint = progressionHints([w([15, 15])], s, []).find((h) => h.exerciseId === 'schulterdruecken')
    expect(hint?.suggestedKg).toBe(11)
  })

  it('verpasste Einheit: Nachholtag ohne Doppelbelastung', () => {
    const s = settingsWith((x) => ({ ...x, program: { ...x.program, extraDay: 'aus' } }))
    const week = plannedSessionsForWeek(s, [], 1)
    const monday = week[0]
    expect(sessionStatus(monday, [], '2026-10-13')).toBe('missed')
    // Mi liegt neben Do (auch Pull), deshalb Samstag
    const day = makeupDay(monday, week, '2026-10-13')
    expect(day).toBe('2026-10-17')
    expect(week.some((x) => x.date === day)).toBe(false)
  })

  it('Trainings aus dem früheren Plan zählen weiter', () => {
    const s = settingsWith()
    const monday = plannedSessionsForWeek(s, [], 1)[0]
    const old: WorkoutLog = { ...meta('alt'), date: '2026-10-12', plannedKey: 'w1-mo-a', sessionId: 'mo-a', title: 'Alt', exercises: [] }
    expect(sessionStatus(monday, [old], '2026-10-13')).toBe('done')
  })
})

describe('Gewicht', () => {
  const entries = (start: number, perDay: number): WeightEntry[] =>
    Array.from({ length: 21 }, (_, i) => ({
      ...meta('g' + i),
      date: `2026-10-${String(12 + i).padStart(2, '0')}`,
      kg: start + perDay * i,
    }))

  it('gleitender 7-Tage-Durchschnitt', () => {
    const pts = withMovingAverage(entries(70, 0.1))
    expect(pts[6].avg7).toBeCloseTo(70.3, 5)
  })

  it('kein Anstieg in zwei Wochen → +150 kcal', () => {
    const sug = calorieSuggestion(entries(70, 0), settingsWith(), '2026-11-01')
    expect(sug?.delta).toBe(150)
    expect(sug?.newKcal).toBe(2350)
  })

  it('zu schnelle Zunahme → Reduktion um 100–150 kcal', () => {
    const sug = calorieSuggestion(entries(70, 0.08), settingsWith(), '2026-11-01')
    expect(sug?.delta).toBeLessThan(0)
    expect(sug!.delta).toBeGreaterThanOrEqual(-150)
  })

  it('Schlank bleiben: stabiles Gewicht ist ok, erst bei Abnahme +100 kcal', () => {
    const lean = settingsWith((x) => ({ ...x, targets: { ...x.targets, kcal: 1500, gainMinG: 0, gainMaxG: 150 } }))
    expect(calorieSuggestion(entries(60, 0), lean, '2026-11-01')).toBeUndefined()
    const losing = calorieSuggestion(entries(60, -0.04), lean, '2026-11-01')
    expect(losing?.delta).toBe(100)
    expect(losing?.newKcal).toBe(1600)
  })

  it('Zunahme im Plan → kein Vorschlag', () => {
    expect(calorieSuggestion(entries(70, 0.025), settingsWith(), '2026-11-01')).toBeUndefined()
  })
})

describe('Einkauf und Budget', () => {
  const plan = (id: string, date: string, recipeId: string, portions = 1, leftoverOf?: string): MealPlanEntry => ({
    ...meta(id),
    date,
    slot: 'mittag',
    recipeId,
    portions,
    leftoverOf,
  })
  const item = (id: string, patch: Partial<ShoppingItem>): ShoppingItem => ({
    ...meta(id),
    week: MONDAY,
    name: 'Produkt',
    packs: 1,
    checked: false,
    inBudget: true,
    ...patch,
  })

  it('Vorschläge aus dem Wochenplan ziehen den Vorrat ab', () => {
    const s = settingsWith()
    const res = planNeeds(MONDAY, [plan('a', '2026-10-13', 'r001')], [], s)
    const chicken = res.lines.find((l) => l.foodId === 'haehnchenbrust')!
    expect(chicken.needed).toBe(150)
    expect(chicken.packs).toBe(1)
    expect(res.lines.some((l) => l.foodId === 'rapsoel')).toBe(false)
    const withPantry = planNeeds(MONDAY, [plan('a', '2026-10-13', 'r001')], [{ ...meta('p'), kind: 'food', foodId: 'haehnchenbrust', name: 'Hähnchen', amount: 200, unit: 'g' }], s)
    expect(withPantry.lines.find((l) => l.foodId === 'haehnchenbrust')!.toBuy).toBe(0)
  })

  it('Reste-Einträge kaufen nichts nach, Brot und Belag nie als Vorschlag', () => {
    const res = planNeeds(MONDAY, [plan('a', '2026-10-13', 'r087', 2), plan('b', '2026-10-14', 'r087', 1, 'a')], [], settingsWith())
    expect(res.lines).toHaveLength(0)
  })

  it('Budget besteht nur aus eigenen Einträgen, Getränke inklusive', () => {
    const s = settingsWith()
    const items = [
      item('a', { name: 'Skyr', price: 1.99, packs: 2, checked: true }),
      item('b', { name: 'Afri-Cola 1 l', price: 1.49 }),
      item('c', { name: 'Ohne Preis' }),
      item('d', { name: 'Nicht im Budget', price: 5, inBudget: false }),
      item('e', { name: 'Andere Woche', price: 9, week: '2026-10-19' }),
    ]
    const b = weekBudget(items, MONDAY, s)
    expect(b.bought).toBeCloseTo(3.98)
    expect(b.planned).toBeCloseTo(1.49)
    expect(b.free).toBeCloseTo(20 - 3.98 - 1.49)
    expect(b.withoutPrice).toBe(1)
    expect(b.status).toBe('frei')
    const co2 = weekBudget(items, MONDAY, { ...s, budget: { ...s.budget, co2Needed: true } })
    expect(co2.free).toBeCloseTo(20 - 3.98 - 1.49 - 9.99)
    expect(weekBudget([item('k', { price: 18 })], MONDAY, s).status).toBe('knapp')
    expect(weekBudget([item('x', { price: 25 })], MONDAY, s).status).toBe('ueber')
  })

  it('Produktanalyse aus Etikettwerten: Portion, Kosten, Protein pro Euro', () => {
    const skyr: Product = { ...meta('skyr'), kind: 'food', name: 'Skyr', unit: 'g', size: 500, price: 1.99, serving: 250, per100: { kcal: 63, protein: 11 }, favorite: false }
    const a = analyzeProduct(skyr)
    expect(a.perPortion.protein).toBeCloseTo(27.5)
    expect(a.perPortion.kcal).toBeCloseTo(157.5)
    expect(a.portionsPerPack).toBe(2)
    expect(a.pricePerPortion).toBeCloseTo(0.995)
    expect(a.proteinPerEuro).toBeCloseTo(55 / 1.99)
    expect(a.rating).toBe('top')
    // Abweichender Preis beim Einkauf zählt
    expect(analyzeProduct(skyr, 1.49).pricePerPortion).toBeCloseTo(0.745)
  })

  it('Werte pro Portion werden auf 100 g umgerechnet', () => {
    expect(perPortionToPer100({ kcal: 112, protein: 22.5 }, 30)).toEqual({ kcal: (112 / 30) * 100, protein: 75 })
    expect(perPortionToPer100({ kcal: 100 }, 0)).toEqual({})
  })

  it('Einträge nach Essen gruppieren, Protein über alle Packungen', () => {
    const quark: Product = { ...meta('q'), kind: 'food', name: 'Magerquark', unit: 'g', size: 500, per100: { kcal: 67, protein: 12 }, favorite: false }
    const groups = groupByMeal(
      [item('a', { name: 'Magerquark', productId: 'q', packs: 2, price: 0.99, meal: 'Käsekuchen im Glas' }), item('b', { name: 'Red Bull', price: 1.29 })],
      [quark],
    )
    expect(groups.map((g) => g.meal)).toEqual(['Käsekuchen im Glas', 'Ohne Zuordnung'])
    expect(groups[0].protein).toBeCloseTo(120)
    expect(groups[0].cost).toBeCloseTo(1.98)
    expect(groups[1].protein).toBeUndefined()
  })

  it('der automatische Plan lässt Montag frei und bleibt grob im Budget', () => {
    const s = settingsWith()
    const draft = generateLunchPlan({ weekStart: MONDAY, settings: s, pantry: [], recentLogs: [], mode: 'mealprep', seed: 1 })
    expect(draft.some((d) => d.date === MONDAY)).toBe(false)
    expect(draft).toHaveLength(4)
    const entries: MealPlanEntry[] = draft.map((d, i) => plan(`e${i}`, d.date, d.recipeId, d.portions, d.leftoverOfIndex !== undefined ? `e${d.leftoverOfIndex}` : undefined))
    expect(planNeeds(MONDAY, entries, [], s).estimateTotal).toBeLessThanOrEqual(20)
  })
})

describe('Wochenkorrektur', () => {
  it('liefert Vorschläge mit Übernehmen-Aktion und markiert fehlende Tage', () => {
    const s = settingsWith()
    const data = emptyData()
    data.foodLogs.push(buildFreeLog('Snack', { kcal: 300, protein: 10 }, { date: MONDAY, time: '15:00' }))
    const report = buildWeeklyReport(data, s, MONDAY, '2026-10-15')
    expect(report.incomplete.some((t) => t.includes('keine Einträge'))).toBe(true)
    expect(report.suggestions.some((x) => x.action.type === 'moveSession')).toBe(true)
    expect(report.suggestions.some((x) => x.action.type === 'addMeal')).toBe(true)
  })
})
