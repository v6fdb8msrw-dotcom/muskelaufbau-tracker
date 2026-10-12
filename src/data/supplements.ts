import type { Product } from '../types'

/*
 * ESN-Produkte, die du nutzt: Designer Whey (für Shakes) und Ultrapure Creatine.
 * Nährwerte pro 100 g sind Herstellerangaben, wie sie Händler im Oktober 2026 zeigen
 * (REWE-Onlineshop, Müller, Open Food Facts). Sie schwanken je nach Sorte und Charge:
 * Bitte mit dem Etikett deiner Dose abgleichen und bei Bedarf unter
 * „Trinken & Hydration → Produkte“ korrigieren. Nussige Sorten (Haselnuss, Mandel)
 * sind wegen deiner Ausschlüsse nicht vorbelegt.
 */

const stamp = '2026-10-12T00:00:00.000Z'

export const ESN_DEFAULT_PROTEIN = 'esn-designer-whey-vanilla-milk'

export const ESN_PRODUCTS: Product[] = [
  {
    id: 'esn-designer-whey-vanilla-milk',
    createdAt: stamp,
    updatedAt: stamp,
    kind: 'protein',
    name: 'ESN Designer Whey · Vanilla Milk',
    brand: 'ESN',
    unit: 'g',
    serving: 30,
    favorite: true,
    builtin: true,
    note: 'Herstellerangaben laut Müller-Shop und Open Food Facts. Salz 1,4 g pro 100 g.',
    per100: { kcal: 374, protein: 75, carbs: 6.8, sugar: 5, fat: 4.4, satFat: 2.3, sodium: 560 },
  },
  {
    id: 'esn-designer-whey-stracciatella',
    createdAt: stamp,
    updatedAt: stamp,
    kind: 'protein',
    name: 'ESN Designer Whey · Stracciatella',
    brand: 'ESN',
    unit: 'g',
    serving: 30,
    favorite: false,
    builtin: true,
    note: 'Herstellerangaben laut REWE-Onlineshop. Zucker, gesättigte Fette und Salz dort nicht angegeben.',
    per100: { kcal: 379, protein: 73, carbs: 7.5, fat: 5.3 },
  },
  {
    id: 'esn-designer-whey-dark-cookie',
    createdAt: stamp,
    updatedAt: stamp,
    kind: 'protein',
    name: 'ESN Designer Whey · Dark Cookie & Cream',
    brand: 'ESN',
    unit: 'g',
    serving: 30,
    favorite: false,
    builtin: true,
    note: 'Herstellerangaben laut REWE-Onlineshop. Zucker, gesättigte Fette und Salz dort nicht angegeben.',
    per100: { kcal: 383, protein: 71, carbs: 9.8, fat: 5.8 },
  },
]

export const ESN_CREATINE = {
  name: 'ESN Ultrapure Creatine Monohydrate',
  doseG: 3,
  note: 'Tagesportion laut ESN: 3 g Kreatin (Kapseln: 3 Stück; Pulver: etwa 3,4–3,5 g Kreatin-Monohydrat). Bitte mit dem Etikett deiner Dose abgleichen.',
}
