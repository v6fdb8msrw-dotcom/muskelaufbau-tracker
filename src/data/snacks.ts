/*
 * Schnelle Snacks (höchstens 5 Minuten, kein Kochen). Nährwerte werden aus den Zutaten berechnet.
 * Keine Snacks mit einem Glas Milch: Milch gibt es nur im Proteinshake.
 * art: 'kalorien' = viel Energie, macht wenig satt · 'eiweiss' = viel Eiweiß · 'beides'
 */

export type SnackKind = 'kalorien' | 'eiweiss' | 'beides'
export interface Snack {
  id: string
  name: string
  items: [string, number][]
  kind: SnackKind
  hint?: string
}

export const SNACKS: Snack[] = [
  { id: 's01', name: 'Skyr mit Honig und Cornflakes', items: [['skyr', 250], ['honig', 15], ['cornflakes', 30]], kind: 'beides' },
  { id: 's02', name: 'Proteinshake mit Vollmilch', items: [['whey', 30], ['vollmilch', 300]], kind: 'eiweiss', hint: 'Nur Pulver und Milch, schütteln, fertig.' },
  { id: 's04', name: '2 Scheiben Toast mit Käse', items: [['toast', 50], ['butter', 5], ['kaese-scheiben', 40]], kind: 'beides' },
  { id: 's05', name: 'Toast mit Butter und Honig', items: [['toast', 50], ['butter', 10], ['honig', 20]], kind: 'kalorien' },
  { id: 's07', name: 'Sahnequark mit Honig', items: [['quark40', 150], ['honig', 15]], kind: 'beides' },
  { id: 's09', name: 'Käse-Schinken-Wrap', items: [['wraps', 62], ['kaese-scheiben', 40], ['kochschinken', 40]], kind: 'beides' },
  { id: 's10', name: 'Hummus mit Toast', items: [['hummus', 60], ['toast', 50]], kind: 'kalorien' },
  { id: 's11', name: 'Thunfisch-Brot mit Mayo', items: [['vollkornbrot', 50], ['thunfisch', 65], ['mayonnaise', 10]], kind: 'eiweiss' },
  { id: 's12', name: 'Apfel mit Käse', items: [['apfel', 150], ['kaese-scheiben', 50]], kind: 'beides' },
  { id: 's14', name: 'Salami-Brot mit Butter', items: [['vollkornbrot', 50], ['butter', 5], ['salami', 30]], kind: 'kalorien' },
  { id: 's15', name: 'Skyr mit Haferflocken und Beeren', items: [['skyr', 200], ['haferflocken', 30], ['beeren', 80], ['honig', 10]], kind: 'beides' },
  // Weitere Kalorien-Snacks
  { id: 's17', name: 'Croissant mit Butter und Honig', items: [['croissant', 60], ['butter', 5], ['honig', 15]], kind: 'kalorien' },
  { id: 's19', name: 'Milchreis-Becher mit Honig', items: [['milchreis-fertig', 200], ['honig', 10], ['zimt', 1]], kind: 'kalorien' },
  { id: 's20', name: 'Vanillepudding mit Banane und Cornflakes', items: [['pudding', 125], ['banane', 100], ['cornflakes', 20]], kind: 'kalorien' },
  { id: 's21', name: 'Laugenbrezel mit Butter', items: [['brezel', 85], ['butter', 15]], kind: 'kalorien' },
  { id: 's22', name: 'Wrap mit Frischkäse und Salami', items: [['wraps', 62], ['frischkaese', 30], ['salami', 30]], kind: 'kalorien' },
  { id: 's23', name: 'Toast mit Frischkäse und Honig', items: [['toast', 50], ['frischkaese', 30], ['honig', 15]], kind: 'kalorien' },
  { id: 's24', name: 'Hummus-Wrap', items: [['wraps', 62], ['hummus', 60]], kind: 'kalorien' },
  { id: 's25', name: 'Laugenbrezel und Orangensaft', items: [['brezel', 85], ['orangensaft', 250]], kind: 'kalorien' },
  { id: 's26', name: 'Sahnequark mit Cornflakes und Honig', items: [['quark40', 150], ['cornflakes', 30], ['honig', 15]], kind: 'beides' },
  { id: 's27', name: 'Mozzarella-Toast mit Olivenöl', items: [['toast', 50], ['mozzarella', 60], ['olivenoel', 5]], kind: 'beides' },
  // Kreative Kalorien-Snacks
  { id: 's28', name: 'Schoko-Bananen-Toast', items: [['toast', 50], ['butter', 5], ['banane', 100], ['schokolade', 20]], kind: 'kalorien', hint: 'Schokolade auf dem heißen Toast schmelzen lassen, Banane drauf.' },
  { id: 's29', name: 'Feta-Honig-Toast', items: [['toast', 50], ['olivenoel', 5], ['feta', 50], ['honig', 15]], kind: 'kalorien', hint: 'Feta auf den Toast bröseln, Honig und Pfeffer darüber, kurz in die Pfanne. Süß und salzig.' },
  { id: 's30', name: 'Käse-Quesadilla aus der Pfanne', items: [['wraps', 62], ['reibekaese', 40]], kind: 'kalorien', hint: 'Käse auf eine Wrap-Hälfte, zuklappen, 2 Minuten pro Seite braten.' },
  { id: 's31', name: 'Schoko-Cornflakes-Crossies', items: [['cornflakes', 30], ['schokolade', 30]], kind: 'kalorien', hint: 'Schokolade in der Mikrowelle schmelzen, Cornflakes unterrühren, Häufchen auf Backpapier. Auf Vorrat machen.' },
  { id: 's32', name: 'Wrap-Pizza ohne Tomate', items: [['wraps', 62], ['creme-fraiche', 20], ['salami', 25], ['reibekaese', 25]], kind: 'kalorien', hint: 'Crème fraîche, Salami und Käse auf den Wrap, mit Deckel in der Pfanne 4 Minuten.' },
]
