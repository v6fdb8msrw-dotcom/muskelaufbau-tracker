import { recipe } from './helpers'

const C = 'convenience' as const

export const CONVENIENCE = [
  recipe(
    'r096',
    'TK-Pizza Salami mit Beilagensalat',
    C,
    15,
    [
      ['pizza-salami', 350],
      ['eisbergsalat', 60],
      ['joghurt', 30],
      ['essig', 5],
      ['kraeuter', 0.5],
      ['jodsalz', 0.5],
    ],
    [
      'Backofen nach Packungsangabe vorheizen und die Pizza backen (meist 12–15 Minuten).',
      'Inzwischen den Salat zerpflücken.',
      'Joghurt mit Essig, Kräutern und Salz zu einem schnellen Dressing verrühren und über den Salat geben.',
    ],
    { tips: ['Die Pizza enthält Tomatensoße. Sie steht trotzdem hier, weil du Fertigpizza ausdrücklich gerne isst.'] },
  ),
  recipe(
    'r097',
    'TK-Flammkuchen mit Hähnchen-Topping',
    C,
    15,
    [
      ['flammkuchen-tk', 300],
      ['haehnchenstreifen', 80],
      ['pfeffer', 0.3],
      ['fruehlingszwiebel', 15, 'opt'],
    ],
    [
      'Backofen nach Packungsangabe vorheizen.',
      'Hähnchenstreifen klein zupfen und auf dem gefrorenen Flammkuchen verteilen.',
      'Nach Packungsangabe backen (meist 10–12 Minuten), mit Pfeffer und optional Frühlingszwiebeln bestreuen.',
    ],
  ),
  recipe(
    'r098',
    'Fertig-Caesar-Salat mit Ei und Vollkornbrot',
    C,
    10,
    [
      ['caesar-salat-fertig', 250],
      ['ei', 55],
      ['vollkornbrot', 50],
    ],
    [
      'Ei 9 Minuten hart kochen, abschrecken und vierteln. Das geht auch am Vorabend.',
      'Dressing über den Salat geben und vermischen.',
      'Ei darauflegen und eine Scheibe Vollkornbrot dazu essen. So wird der Salat zu einer sättigenden Mahlzeit.',
    ],
    { meals: ['mittag', 'abend'] },
  ),
  recipe(
    'r099',
    'Express-Reis-Bowl mit Hähnchen und Sweet Chili',
    C,
    5,
    [
      ['express-reis', 250],
      ['haehnchenstreifen', 150],
      ['sweet-chili', 20],
      ['mais', 50, 'opt'],
      ['gurke', 60, 'opt'],
    ],
    [
      'Reisbeutel leicht einreißen und nach Packungsangabe in der Mikrowelle erhitzen (meist 2 Minuten).',
      'Hähnchenstreifen kurz in der Pfanne oder Mikrowelle erwärmen.',
      'Reis in eine Schale geben, Hähnchen und optional Mais und Gurke darauflegen und mit Sweet-Chili-Soße beträufeln.',
    ],
    { meals: ['mittag', 'abend'] },
  ),
  recipe(
    'r100',
    'Fischstäbchen-Wrap',
    C,
    12,
    [
      ['wraps', 124],
      ['fischstaebchen', 150],
      ['joghurt', 40],
      ['eisbergsalat', 40],
      ['zitrone', 5],
      ['rapsoel', 5],
      ['jodsalz', 0.3],
      ['gurke', 40, 'opt'],
    ],
    [
      'Fischstäbchen im Öl pro Seite 3–4 Minuten knusprig braten.',
      'Joghurt mit Zitronensaft und Salz verrühren.',
      'Wraps erwärmen, mit Joghurt bestreichen, Salat, Fischstäbchen und optional Gurke darauflegen und aufrollen.',
    ],
  ),
]
