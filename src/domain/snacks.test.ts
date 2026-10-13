import { describe, expect, it } from 'vitest'
import { FOOD_MAP } from '../data/foods'
import { SNACKS } from '../data/snacks'
import { snackProfile, snackTips } from './snacks'

describe('Snack-Tipps', () => {
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

  it('fehlt Eiweiß, kommen Eiweiß-Snacks zuerst, sonst kalorienreiche', () => {
    const protein = snackTips({ kcalOpen: 800, proteinOpen: 50, hour: 15, seed: 1 })
    expect(['eiweiss', 'beides']).toContain(protein[0].snack.kind)
    const kcal = snackTips({ kcalOpen: 800, proteinOpen: 0, hour: 21, seed: 1 })
    expect(kcal[0].snack.kind).toBe('kalorien')
  })

  it('nur Snacks, die in die offenen Kalorien passen, und keine bei erreichtem Ziel', () => {
    for (const t of snackTips({ kcalOpen: 250, proteinOpen: 0, hour: 12, seed: 3 })) expect(t.kcal).toBeLessThanOrEqual(350)
    expect(snackTips({ kcalOpen: 100, proteinOpen: 0, hour: 12, seed: 3 })).toHaveLength(0)
  })

  it('genug Auswahl: mindestens 15 Kalorien-Snacks', () => {
    expect(SNACKS.filter((s) => s.kind === 'kalorien').length).toBeGreaterThanOrEqual(15)
    expect(new Set(SNACKS.map((s) => s.id)).size).toBe(SNACKS.length)
  })

  it('keine Datteln und keine Nüsse in Snacks', () => {
    for (const s of SNACKS) expect(/dattel|erdnuss|mandel|haselnuss|nougat|nutella/i.test(s.name + s.items.map(([id]) => `${id} ${FOOD_MAP[id].name}`).join(' ')), s.id).toBe(false)
  })
})
