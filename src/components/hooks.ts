import { useEffect, useMemo, useRef, useState } from 'react'
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

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true
  const pref = document.documentElement.getAttribute('data-motion')
  if (pref === 'reduced') return true
  if (pref === 'normal') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Zahl, die beim ersten Anzeigen und bei Änderungen sanft hochzählt. */
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0))
  const from = useRef(value)
  useEffect(() => {
    if (prefersReducedMotion()) {
      from.current = target
      setValue(target)
      return
    }
    const start = performance.now()
    const begin = from.current
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const v = begin + (target - begin) * eased
      from.current = v
      setValue(v)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])
  return value
}

/** Uhrzeit, die sich jede Minute aktualisiert. */
export function useClock(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 20_000)
    return () => window.clearInterval(id)
  }, [])
  return now
}
