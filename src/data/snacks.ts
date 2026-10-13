/*
 * Schnelle Snacks (höchstens 5 Minuten, kein Kochen). Nährwerte werden aus den Zutaten berechnet.
 * art: 'kalorien' = viel Energie, macht wenig satt · 'eiweiss' = viel Eiweiß · 'beides'
 */

export type SnackKind = 'kalorien' | 'eiweiss' | 'beides'
export type DayPart = 'morgens' | 'tagsueber' | 'abends'

export interface Snack {
  id: string
  name: string
  items: [string, number][]
  kind: SnackKind
  /** Zu welcher Tageszeit der Snack besonders passt */
  when: DayPart[]
  hint?: string
}

export const SNACKS: Snack[] = [
  { id: 's01', name: 'Skyr mit Honig und Cornflakes', items: [['skyr', 250], ['honig', 15], ['cornflakes', 30]], kind: 'beides', when: ['morgens', 'tagsueber', 'abends'] },
  { id: 's02', name: 'Proteinshake mit Vollmilch', items: [['whey', 30], ['vollmilch', 300]], kind: 'eiweiss', when: ['morgens', 'tagsueber'], hint: 'Nur Pulver und Milch, schütteln, fertig.' },
  { id: 's03', name: 'Glas Vollmilch', items: [['vollmilch', 300]], kind: 'kalorien', when: ['morgens', 'tagsueber', 'abends'], hint: 'Trinkt sich nebenbei, macht kaum satt.' },
  { id: 's04', name: '2 Scheiben Toast mit Käse', items: [['toast', 50], ['butter', 5], ['kaese-scheiben', 40]], kind: 'beides', when: ['tagsueber', 'abends'] },
  { id: 's05', name: 'Toast mit Butter und Honig', items: [['toast', 50], ['butter', 10], ['honig', 20]], kind: 'kalorien', when: ['morgens', 'abends'] },
  { id: 's06', name: 'Banane und ein Glas Vollmilch', items: [['banane', 120], ['vollmilch', 250]], kind: 'kalorien', when: ['morgens', 'tagsueber'] },
  { id: 's07', name: 'Sahnequark mit Honig', items: [['quark40', 150], ['honig', 15]], kind: 'beides', when: ['tagsueber', 'abends'] },
  { id: 's08', name: 'Cornflakes mit Vollmilch', items: [['cornflakes', 50], ['vollmilch', 200]], kind: 'kalorien', when: ['morgens', 'abends'] },
  { id: 's09', name: 'Käse-Schinken-Wrap', items: [['wraps', 62], ['kaese-scheiben', 40], ['kochschinken', 40]], kind: 'beides', when: ['tagsueber'] },
  { id: 's10', name: 'Hummus mit Toast', items: [['hummus', 60], ['toast', 50]], kind: 'kalorien', when: ['tagsueber', 'abends'] },
  { id: 's11', name: 'Thunfisch-Brot mit Mayo', items: [['vollkornbrot', 50], ['thunfisch', 65], ['mayonnaise', 10]], kind: 'eiweiss', when: ['tagsueber', 'abends'] },
  { id: 's12', name: 'Apfel mit Käse', items: [['apfel', 150], ['kaese-scheiben', 50]], kind: 'beides', when: ['tagsueber', 'abends'] },
  { id: 's13', name: 'Haferflocken mit Vollmilch und Banane', items: [['haferflocken', 50], ['vollmilch', 200], ['banane', 100]], kind: 'kalorien', when: ['morgens'], hint: 'Kalt, ohne Kochen, wie Müsli.' },
  { id: 's14', name: 'Salami-Brot mit Butter', items: [['vollkornbrot', 50], ['butter', 5], ['salami', 30]], kind: 'kalorien', when: ['tagsueber', 'abends'] },
  { id: 's15', name: 'Skyr mit Haferflocken und Beeren', items: [['skyr', 200], ['haferflocken', 30], ['beeren', 80], ['honig', 10]], kind: 'beides', when: ['morgens', 'tagsueber'] },
]
