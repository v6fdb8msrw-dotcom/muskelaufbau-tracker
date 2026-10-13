import { describe, expect, it } from 'vitest'
import { FOOD_MAP } from '../data/foods'
import { SNACKS } from '../data/snacks'
import { snackProfile } from './snacks'

describe('Snacks', () => {
  it('alle Snacks nutzen bekannte Lebensmittel und haben Nährwerte', () => {
    for (const s of SNACKS) {
      for (const [id] of s.items) expect(FOOD_MAP[id], `${s.id}: ${id}`).toBeDefined()
      const v = snackProfile(s).values
      expect(v.kcal, s.id).toBeGreaterThan(150)
      expect(v.kcal, s.id).toBeLessThan(600)
    }
    // Skyr mit Honig und Cornflakes: rund 320 kcal und 30 g Eiweiß
    const skyr = snackProfile(SNACKS.find((s) => s.id === 's01')!).values
    expect(skyr.kcal).toBeCloseTo(317, -1)
    expect(skyr.protein).toBeGreaterThan(28)
  })

  it('genug Auswahl: mindestens 15 Kalorien-Snacks', () => {
    expect(SNACKS.filter((s) => s.kind === 'kalorien').length).toBeGreaterThanOrEqual(15)
    expect(new Set(SNACKS.map((s) => s.id)).size).toBe(SNACKS.length)
  })

  it('kein Glas Milch als Snack (Milch nur im Proteinshake)', () => {
    for (const s of SNACKS) if (s.items.some(([id]) => id === 'vollmilch' || id === 'milch')) expect(s.id).toBe('s02')
  })

  it('keine Datteln und keine Nüsse in Snacks', () => {
    for (const s of SNACKS) expect(/dattel|erdnuss|mandel|haselnuss|nougat|nutella/i.test(s.name + s.items.map(([id]) => `${id} ${FOOD_MAP[id].name}`).join(' ')), s.id).toBe(false)
  })
})
