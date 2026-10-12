import { useEffect, useMemo, useState } from 'react'
import { dayTotals } from '../domain/nutrition'
import { computeShopping } from '../domain/shopping'
import { nextSession, programWeek } from '../domain/training'
import { startOfWeek, todayISO } from '../lib/date'
import { useStore } from '../state/store'

/** Heutiges Datum, das sich um Mitternacht von selbst aktualisiert. */
export function useToday(): string {
  const [today, setToday] = useState(todayISO)
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = todayISO()
      setToday((prev) => (prev === t ? prev : t))
    }, 30_000)
    return () => window.clearInterval(id)
  }, [])
  return today
}

export function useDayTotals(date: string) {
  const { data } = useStore()
  return useMemo(() => dayTotals(data, date), [data, date])
}

export function useShoppingWeek(weekStart: string) {
  const { data, settings } = useStore()
  return useMemo(
    () => computeShopping(weekStart, data.mealPlan, data.pantry, settings, data.shopping),
    [weekStart, data.mealPlan, data.pantry, data.shopping, settings],
  )
}

export function useProgram() {
  const { data, settings } = useStore()
  const today = useToday()
  return useMemo(() => {
    const week = programWeek(settings, today)
    return {
      today,
      week,
      weekStart: startOfWeek(today),
      next: nextSession(settings, data.schedule, data.workouts, today),
    }
  }, [settings, data.schedule, data.workouts, today])
}

/** true auf schmalen Bildschirmen (iPhone-Ansicht). */
export function useIsMobile(): boolean {
  const query = '(max-width: 760px)'
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMobile(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return mobile
}
