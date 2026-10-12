import { describe, expect, it } from 'vitest'
import { parseNumberInput } from '../components/ui'
import { createDefaultSettings, migrateSettings, SETTINGS_VERSION } from '../data/defaults'
import { ESN_PRODUCTS } from '../data/supplements'
import type { Settings } from '../types'

describe('Startwerte aus dem Auftrag', () => {
  it('Profil und Ziele entsprechen genau den Vorgaben', () => {
    const s = createDefaultSettings()
    expect(s.profile).toMatchObject({ age: 22, sex: 'm', heightCm: 171, startWeightKg: 60.3 })
    expect(s.targets).toEqual({
      kcal: 2150,
      protein: 120,
      fat: 65,
      carbs: 270,
      fiber: 30,
      fluidMl: 2300,
      gainMinG: 100,
      gainMaxG: 250,
      bmrEstimate: 1567,
      maintenanceMin: 1900,
      maintenanceMax: 2100,
    })
    expect(s.budget).toMatchObject({ min: 15, max: 20, mondayLeftovers: true })
    expect(s.supplements).toMatchObject({ creatineEnabled: true, proteinPowderAvailable: true })
  })

  it('alte Einstellungen mit Platzhaltern werden auf die Startwerte angehoben', () => {
    const old = { ...createDefaultSettings(), version: 1, profile: { ...createDefaultSettings().profile, startWeightKg: 7, age: 25 }, targets: { ...createDefaultSettings().targets, kcal: 2200, protein: 110 } } as Settings
    const { settings, changed } = migrateSettings(old)
    expect(changed).toBe(true)
    expect(settings.version).toBe(SETTINGS_VERSION)
    expect(settings.profile.startWeightKg).toBe(60.3)
    expect(settings.targets.kcal).toBe(2150)
    expect(settings.targets.protein).toBe(120)
  })

  it('aktuelle Einstellungen bleiben unverändert', () => {
    const s = { ...createDefaultSettings(), targets: { ...createDefaultSettings().targets, kcal: 2300 } }
    const { settings, changed } = migrateSettings(s)
    expect(changed).toBe(false)
    expect(settings.targets.kcal).toBe(2300)
  })

  it('ESN-Produkte haben Etikettwerte und keine nussigen Sorten', () => {
    expect(ESN_PRODUCTS.length).toBeGreaterThan(0)
    for (const p of ESN_PRODUCTS) {
      expect(p.per100.kcal).toBeGreaterThan(350)
      expect(p.per100.protein).toBeGreaterThan(65)
      expect(/nut|nuss|hazel|almond|mandel/i.test(p.name)).toBe(false)
    }
  })
})

describe('Zahleneingabe', () => {
  it('versteht Komma und Punkt und lässt unfertige Eingaben zu', () => {
    expect(parseNumberInput('60,3')).toBe(60.3)
    expect(parseNumberInput('60.3')).toBe(60.3)
    expect(parseNumberInput('60,')).toBe(60)
    expect(parseNumberInput('')).toBeUndefined()
    expect(parseNumberInput(',')).toBeUndefined()
    expect(parseNumberInput('-')).toBeUndefined()
  })
})
