import { describe, expect, it } from 'vitest'
import { parseNumberInput } from '../components/ui'
import { createDefaultSettings, migrateSettings, SETTINGS_VERSION } from '../data/defaults'
import { ESN_PRODUCTS } from '../data/supplements'
import type { Settings } from '../types'

describe('Startwerte', () => {
  it('Profil wie im Auftrag, Ziele wie am 13.10.2026 vereinbart', () => {
    const s = createDefaultSettings()
    expect(s.profile).toMatchObject({ age: 22, sex: 'm', heightCm: 171, startWeightKg: 60.3 })
    expect(s.targets).toEqual({
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
    expect(settings.targets.kcal).toBe(1900)
    expect(settings.targets.protein).toBe(110)
  })

  it('aktuelle Einstellungen bleiben unverändert', () => {
    const s = { ...createDefaultSettings(), targets: { ...createDefaultSettings().targets, kcal: 2300 } }
    const { settings, changed } = migrateSettings(s)
    expect(changed).toBe(false)
    expect(settings.targets.kcal).toBe(2300)
  })

  it('Version 2 → 3: feste Getränke (Afri-Cola, Energy) verschwinden aus dem Budget, eigene Werte bleiben', () => {
    const v2 = { ...createDefaultSettings(), version: 2, budget: { ...createDefaultSettings().budget, max: 18 }, funDrinks: [{ id: 'afri', name: 'Afri-Cola', perWeek: 4, price: 1.39 }] }
    const { settings, changed } = migrateSettings(v2)
    expect(changed).toBe(true)
    expect(settings.version).toBe(SETTINGS_VERSION)
    expect('funDrinks' in settings).toBe(false)
    expect(settings.budget.max).toBe(18)
    expect(settings.targets.kcal).toBe(1900)
  })

  it('Version 3 → 4: Pull/Push mit optionaler 5. Einheit, links als schwächerer Arm', () => {
    const v3 = { ...createDefaultSettings(), version: 3, program: { ...createDefaultSettings().program, secondDay: 'mi', weekendDay: 'so' }, arms: { weakerSide: null } } as unknown as Settings
    const { settings } = migrateSettings(v3)
    expect(settings.program.extraDay).toBe('sa')
    expect('secondDay' in settings.program).toBe(false)
    expect(settings.arms.weakerSide).toBe('left')
    expect(settings.program.extraWeakSet).toBe(true)
  })

  it('Version 5/6 → 7: Ziele 1.900 kcal, 110 g Eiweiß, 1,5 l, Profil bleibt', () => {
    const v5 = { ...createDefaultSettings(), version: 5, profile: { ...createDefaultSettings().profile, name: 'Tim' }, targets: { ...createDefaultSettings().targets, kcal: 2150, protein: 120, fluidMl: 2300, gainMinG: 100 } }
    const { settings } = migrateSettings(v5)
    expect(settings.targets).toMatchObject({ kcal: 1900, protein: 110, fluidMl: 1500, gainMinG: 0 })
    const v6 = { ...v5, version: 6, targets: { ...v5.targets, kcal: 1500, protein: 130 } }
    expect(migrateSettings(v6).settings.targets).toMatchObject({ kcal: 1900, protein: 110 })
    expect(settings.profile.name).toBe('Tim')
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
