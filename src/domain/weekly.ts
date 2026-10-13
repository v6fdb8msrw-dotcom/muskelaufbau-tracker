import { FOOD_MAP } from '../data/foods'
import { NUTRIENT_META, referenceFor } from '../data/nutrients'
import { PLAN_RULES, SESSION_MAP } from '../data/plan'
import { RECIPE_MAP } from '../data/recipes'
import { addDays, formatDate, weekDates } from '../lib/date'
import { num } from '../lib/format'
import type { DataSet, MealSlot, NutrientKey, SessionId, Settings, ShoppingItem } from '../types'
import { foodIdeas, recipeIdeas } from './ideas'
import { analyzeRange, dayTotals } from './nutrition'
import { itemsForWeek, weekBudget, type WeekBudget } from './purchases'
import { planForWeek } from './shopping'
import {
  makeupDay,
  plannedSessionsForWeek,
  programWeek,
  progressionHints,
  sessionStatus,
  type PlannedSession,
} from './training'
import { calorieSuggestion, weeklyTrend } from './weight'

export type SuggestionAction =
  | { type: 'addMeal'; date: string; slot: MealSlot; recipeId: string; portions: number }
  | { type: 'addShopping'; week: string; foodId: string; amount: number }
  | { type: 'setKcal'; value: number }
  | { type: 'moveSession'; key: string; to: string }
  | { type: 'swapMeal'; planId: string; recipeId: string }
  | { type: 'enableExtraWeakSet' }
  | { type: 'setTargetWeight'; id: string; kg: number }
  | { type: 'note' }

export interface Suggestion {
  id: string
  area: 'ernaehrung' | 'training' | 'gewicht' | 'einkauf' | 'arme'
  title: string
  detail: string
  action: SuggestionAction
  acceptLabel?: string
}

export interface WeekDayInfo {
  date: string
  hasEntries: boolean
  complete: boolean
  future: boolean
  kcal?: number
  protein?: number
  fluid: number
  proteinOk: boolean
  sessions: { planned: PlannedSession; status: ReturnType<typeof sessionStatus> }[]
}

export interface WeeklyReport {
  weekStart: string
  weekEnd: string
  programWeek: number
  days: WeekDayInfo[]
  good: string[]
  open: string[]
  incomplete: string[]
  suggestions: Suggestion[]
  shoppingOpen: ShoppingItem[]
  upcoming: PlannedSession[]
  budget: WeekBudget
}

const MICRO_CHECK: NutrientKey[] = ['vitC', 'fiber', 'calcium', 'magnesium', 'potassium', 'iron', 'zinc', 'folate', 'iodine', 'epaDha', 'vitD']

export function buildWeeklyReport(data: DataSet, settings: Settings, weekStart: string, today: string): WeeklyReport {
  const weekEnd = addDays(weekStart, 6)
  const pw = programWeek(settings, weekStart)
  const dates = weekDates(weekStart)
  const sessions = pw >= 1 ? plannedSessionsForWeek(settings, data.schedule, pw) : []
  const completeSet = new Set(data.days.filter((d) => d.complete).map((d) => d.date))
  const t = settings.targets

  const days: WeekDayInfo[] = dates.map((date) => {
    const totals = dayTotals(data, date)
    const protein = totals.profile.values.protein
    return {
      date,
      hasEntries: totals.entryCount > 0,
      complete: completeSet.has(date),
      future: date > today,
      kcal: totals.profile.values.kcal,
      protein,
      fluid: totals.fluidMl,
      proteinOk: (protein ?? 0) >= t.protein,
      sessions: sessions.filter((s) => s.date === date).map((planned) => ({ planned, status: sessionStatus(planned, data.workouts, today) })),
    }
  })

  const past = days.filter((d) => !d.future)
  const recorded = past.filter((d) => d.hasEntries)
  const evaluated = recorded.filter((d) => d.complete).length ? recorded.filter((d) => d.complete) : recorded
  const good: string[] = []
  const open: string[] = []
  const incomplete: string[] = []
  const suggestions: Suggestion[] = []
  const sid = (s: string) => `${weekStart}:${s}`

  // ---- Protein (täglich bewertet) ----
  const proteinDays = evaluated.filter((d) => d.proteinOk).length
  if (evaluated.length) {
    if (proteinDays === evaluated.length) good.push(`Protein an allen ${evaluated.length} ausgewerteten Tagen erreicht (Ziel ${t.protein} g).`)
    else if (proteinDays > 0) good.push(`Protein an ${proteinDays} von ${evaluated.length} ausgewerteten Tagen erreicht.`)
    if (proteinDays < evaluated.length) {
      const avg = evaluated.reduce((s, d) => s + (d.protein ?? 0), 0) / evaluated.length
      open.push(`Protein: an ${evaluated.length - proteinDays} Tag(en) unter ${t.protein} g (Schnitt ${num(avg)} g).`)
    }
  }

  // ---- Kalorien ----
  if (evaluated.length) {
    const avgKcal = evaluated.reduce((s, d) => s + (d.kcal ?? 0), 0) / evaluated.length
    if (avgKcal >= t.kcal * 0.95) good.push(`Kalorien im Schnitt bei ${num(avgKcal)} kcal, nah am Ziel von ${num(t.kcal)} kcal.`)
    else open.push(`Kalorien im Schnitt ${num(avgKcal)} kcal, Ziel ${num(t.kcal)} kcal (Tagesprotokoll wie erfasst).`)
  }

  // ---- Trinken ----
  if (recorded.length) {
    const avgFluid = recorded.reduce((s, d) => s + d.fluid, 0) / recorded.length
    if (avgFluid >= t.fluidMl) good.push(`Trinkmenge im Schnitt ${num(avgFluid / 1000, 1)} l, Ziel erreicht.`)
    else open.push(`Trinkmenge im Schnitt ${num(avgFluid / 1000, 1)} l, Orientierung ${num(t.fluidMl / 1000, 1)} l.`)
  }

  // ---- Unvollständige Daten ----
  for (const d of past) {
    if (!d.hasEntries) incomplete.push(`${formatDate(d.date)}: keine Einträge. Das zählt nicht als „nichts gegessen“, sondern als fehlende Daten.`)
    else if (!d.complete) incomplete.push(`${formatDate(d.date)}: nicht als vollständig markiert, die Werte sind vorläufig.`)
  }
  const weighIns = data.weights.filter((w) => w.date >= weekStart && w.date <= weekEnd).length
  if (weighIns === 0 && past.length >= 3) incomplete.push('Diese Woche noch kein Gewicht eingetragen.')

  // ---- Mikronährstoffe: 7-Tage-Muster statt Einzeltage ----
  const range = analyzeRange(data, today <= weekEnd ? today : weekEnd, 7)
  if (range.usedDays.length >= 3) {
    for (const key of MICRO_CHECK) {
      const ref = referenceFor(key, settings)
      const avg = range.averages[key]
      if (!ref || avg.value === undefined || avg.daysWithData < 3) continue
      const share = avg.value / ref
      const label = NUTRIENT_META[key].label
      if (share >= 1) good.push(`${label}: im 7-Tage-Schnitt erreicht.`)
      else if (share < 0.7) {
        open.push(`${label}: im 7-Tage-Schnitt etwa ${Math.round(share * 100)} % des Referenzwerts${avg.partial ? ' (Daten unvollständig, eher eine Untergrenze)' : ''}.`)
        if (key === 'vitC' || key === 'fiber' || key === 'calcium' || key === 'iodine' || key === 'epaDha' || key === 'magnesium') {
          const idea = foodIdeas(key, settings, data.products, 1)[0]
          if (idea?.foodId && FOOD_MAP[idea.foodId] && !FOOD_MAP[idea.foodId].staple) {
            const food = FOOD_MAP[idea.foodId]
            const amount = food.pack?.amount ?? 200
            suggestions.push({
              id: sid(`micro-${key}-${idea.foodId}`),
              area: 'ernaehrung',
              title: `${label}: ${food.name} einplanen`,
              detail: `${idea.amountLabel} ${food.name} liefert etwa ${Math.round((idea.share ?? 0) * 100)} % des Tagesbedarfs. „Übernehmen“ setzt eine Packung auf die Einkaufsliste (außerhalb des Mittagessen-Budgets).`,
              action: { type: 'addShopping', week: weekStart, foodId: food.id, amount },
              acceptLabel: 'Auf Einkaufsliste',
            })
          } else if (idea) {
            suggestions.push({
              id: sid(`micro-${key}-note`),
              area: 'ernaehrung',
              title: `${label}: ${idea.label} öfter einbauen`,
              detail: `${idea.amountLabel} liefert etwa ${Math.round((idea.share ?? 0) * 100)} % des Tagesbedarfs. Das ist eine Ernährungsidee und keine Diagnose, ein einzelner Wert unter der Referenz ist unbedenklich.`,
              action: { type: 'note' },
              acceptLabel: 'Merken',
            })
          }
        }
      }
    }
  }

  // ---- Protein-Ergänzung als Mahlzeit ----
  const futureLunchDates = dates.filter((d) => d >= today && planForWeek(data.mealPlan, weekStart).every((m) => !(m.date === d && m.slot === 'mittag')))
  const todayInfo = days.find((d) => d.date === today)
  if (evaluated.length && proteinDays < evaluated.length) {
    const idea = recipeIdeas('protein', settings, { limit: 3, slot: 'mittag' }).find((r) => (r.recipe && !data.mealPlan.some((m) => m.recipeId === r.recipe.id && m.date >= weekStart && m.date <= weekEnd)))
    if (idea) {
      const date = futureLunchDates.find((d) => d > today) ?? futureLunchDates[0]
      if (date) {
        suggestions.push({
          id: sid(`protein-meal-${idea.recipe.id}`),
          area: 'ernaehrung',
          title: `Proteinreich: ${idea.recipe.name}`,
          detail: `${num(idea.value)} g Protein bei ${num(idea.kcal)} kcal. Vorschlag für ${formatDate(date)} mittags. Der Wochenplan und die Einkaufsliste passen sich an.`,
          action: { type: 'addMeal', date, slot: 'mittag', recipeId: idea.recipe.id, portions: 1 },
          acceptLabel: 'In den Plan',
        })
      }
    }
  }
  if (todayInfo && todayInfo.hasEntries && (todayInfo.protein ?? 0) < t.protein && settings.supplements.proteinPowderAvailable) {
    const gap = t.protein - (todayInfo.protein ?? 0)
    if (gap >= 15) {
      suggestions.push({
        id: sid(`shake-${today}`),
        area: 'ernaehrung',
        title: 'Optional: Proteinshake',
        detail: `Heute fehlen noch etwa ${num(gap)} g Protein. Zuerst zählt Essen (z. B. Quark, Thunfisch, Eier). Ein Shake ist nur eine freiwillige Option und wird erst gebucht, wenn du ihn wirklich trinkst.`,
        action: { type: 'note' },
        acceptLabel: 'Verstanden',
      })
    }
  }

  // ---- Training ----
  const done = sessions.filter((s) => sessionStatus(s, data.workouts, today) === 'done')
  const missed = sessions.filter((s) => sessionStatus(s, data.workouts, today) === 'missed')
  const upcoming = sessions.filter((s) => ['today', 'upcoming'].includes(sessionStatus(s, data.workouts, today)))
  if (sessions.length) {
    if (done.length) good.push(`${done.length} von ${sessions.length} Trainingseinheiten absolviert.`)
    if (upcoming.length) open.push(`Noch ${upcoming.length} Einheit(en) diese Woche: ${upcoming.map((u) => `${SESSION_MAP[u.sessionId].short} (${formatDate(u.date)})`).join(', ')}.`)
  }
  for (const m of missed) {
    const day = makeupDay(m, sessions, today)
    const title = SESSION_MAP[m.sessionId as SessionId].title
    if (day) {
      suggestions.push({
        id: sid(`makeup-${m.key}`),
        area: 'training',
        title: `${title} nachholen`,
        detail: `Verpasst am ${formatDate(m.date)}. Vorschlag: ${formatDate(day)}. Das ist ein freier Tag ohne direkt angrenzende ähnliche Einheit. Bitte keine doppelte Einheit an einem Tag.`,
        action: { type: 'moveSession', key: m.key, to: day },
        acceptLabel: 'Verschieben',
      })
    } else {
      suggestions.push({
        id: sid(`makeup-${m.key}-skip`),
        area: 'training',
        title: `${title} auslassen`,
        detail: 'Diese Woche passt kein freier Tag mehr ohne Doppelbelastung. Einfach mit dem normalen Plan weitermachen, eine verpasste Einheit ist kein Problem.',
        action: { type: 'note' },
        acceptLabel: 'OK',
      })
    }
  }
  const lastRecoveries = [...data.workouts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2)
  if (lastRecoveries.length && lastRecoveries.every((w) => w.recovery === 1)) {
    const extra = sessions.find((s) => s.optional && s.date >= today)
    if (extra) {
      suggestions.push({
        id: sid('reduce-extra'),
        area: 'training',
        title: 'Optionale Einheit auslassen',
        detail: 'Deine letzten Einheiten hast du mit schlechter Erholung bewertet. Vorschlag: die optionale Einheit am Wochenende weglassen oder nur einen Farmer’s Walk auf dem Walking-Pad machen.',
        action: { type: 'note' },
        acceptLabel: 'Merken',
      })
    }
  }
  for (const h of progressionHints(data.workouts, settings, data.targetWeights).slice(0, 4)) {
    suggestions.push({
      id: h.id,
      area: 'training',
      title: h.kind === 'weight' ? 'Gewicht erhöhen?' : 'Nächste Stufe?',
      detail: h.text,
      action: h.kind === 'weight' && h.suggestedKg ? { type: 'setTargetWeight', id: h.side ? `${h.exerciseId}:${h.side}` : h.exerciseId, kg: h.suggestedKg } : { type: 'note' },
      acceptLabel: h.kind === 'weight' ? `Auf ${h.suggestedKg} kg` : 'Merken',
    })
  }

  // ---- Arm-Balance ----
  if (pw >= PLAN_RULES.extraWeakSetFromWeek - 1 && settings.arms.weakerSide && !settings.program.extraWeakSet) {
    suggestions.push({
      id: `extra-weak-set-${settings.arms.weakerSide}`,
      area: 'arme',
      title: 'Optional: Zusatzsatz für den schwächeren Arm',
      detail: `Nach ${pw} Wochen kannst du bei einarmigen Armübungen einen zusätzlichen Satz nur für den ${settings.arms.weakerSide === 'left' ? 'linken' : 'rechten'} Arm machen. Die stärkere Seite bekommt keine Extra-Wiederholungen.`,
      action: { type: 'enableExtraWeakSet' },
      acceptLabel: 'Aktivieren',
    })
  }

  // ---- Gewicht ----
  const trend = weeklyTrend(data.weights, today)
  if (trend.enoughData && trend.perWeek !== undefined) {
    const g = Math.round(trend.perWeek * 1000)
    if (g >= t.gainMinG && g <= t.gainMaxG) good.push(`Gewicht steigt im geplanten Rahmen (${g > 0 ? '+' : ''}${g} g/Woche im 7-Tage-Schnitt).`)
    else open.push(`Gewichtsverlauf: ${g > 0 ? '+' : ''}${g} g/Woche im 7-Tage-Schnitt (geplant +${t.gainMinG}–${t.gainMaxG} g).`)
  }
  const kcalSug = calorieSuggestion(data.weights, settings, today)
  if (kcalSug) {
    suggestions.push({
      id: kcalSug.id,
      area: 'gewicht',
      title: `Kalorienziel ${kcalSug.delta > 0 ? 'erhöhen' : 'senken'}: ${kcalSug.delta > 0 ? '+' : ''}${kcalSug.delta} kcal`,
      detail: `${kcalSug.reason} Neues Ziel wäre ${num(kcalSug.newKcal)} kcal pro Tag. Erst nach deiner Bestätigung wird es geändert.`,
      action: { type: 'setKcal', value: kcalSug.newKcal },
      acceptLabel: `Auf ${num(kcalSug.newKcal)} kcal`,
    })
  }

  // ---- Einkauf & Budget (deine eigenen Einträge mit echten Preisen) ----
  const budget = weekBudget(data.shoppingItems, weekStart, settings)
  const shoppingOpen = itemsForWeek(data.shoppingItems, weekStart).filter((i) => !i.checked)
  if (budget.status === 'ueber') {
    open.push(`Wochenbudget: ${num(budget.bought + budget.planned + budget.co2, 2)} € eingetragen, ${num(-budget.free, 2)} € über ${settings.budget.max} €. Auf der Einkaufsliste siehst du, welche Einträge am meisten kosten.`)
  } else if (budget.bought + budget.planned > 0) {
    good.push(`Wochenbudget im Rahmen: noch ${num(budget.free, 2)} € frei von ${settings.budget.max} €.`)
  }
  if (budget.withoutPrice > 0) incomplete.push(`${budget.withoutPrice} Einkaufseintrag/-einträge ohne Preis. Sie zählen noch nicht zum Budget.`)
  if (!planForWeek(data.mealPlan, weekStart).length && today <= weekEnd) {
    open.push('Für diese Woche sind noch keine Mittagessen geplant. Unter „Ernährung & Rezepte → Wochenplan“ kannst du einen Plan erstellen lassen.')
  }

  return {
    weekStart,
    weekEnd,
    programWeek: pw,
    days,
    good,
    open,
    incomplete,
    suggestions,
    shoppingOpen,
    upcoming,
    budget,
  }
}

export function recipeName(id: string): string {
  return RECIPE_MAP[id]?.name ?? id
}
