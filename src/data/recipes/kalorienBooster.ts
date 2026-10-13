import { recipe } from './helpers'

/*
 * Kalorien-Booster: viele Kalorien, normales Eiweiß, macht wenig satt.
 * Für Tage, an denen das Eiweiß schon geschafft ist, aber Kalorien fehlen.
 * Kohlenhydrate und Fett (Brot, Reis, Nudeln, Milch, Butter, Öl, Honig) sättigen weniger als Eiweiß.
 */

const B = 'kalorien-booster' as const

export const KALORIEN_BOOSTER = [
  recipe(
    'r171',
    'Arme Ritter mit Honig',
    B,
    15,
    [
      ['ei', 110],
      ['vollmilch', 100],
      ['zimt', 1],
      ['toast', 100],
      ['butter', 15],
      ['honig', 25],
    ],
    [
      'Eier mit Milch und Zimt in einem tiefen Teller verquirlen.',
      'Toastscheiben kurz von beiden Seiten darin einweichen.',
      'In der Butter bei mittlerer Hitze von beiden Seiten goldbraun braten und mit Honig beträufeln.',
    ],
    { meals: ['fruehstueck', 'snack', 'abend'] },
  ),
  recipe(
    'r172',
    'Milchreis mit Zimt und Zucker',
    B,
    25,
    [
      ['reis', 70],
      ['vollmilch', 400],
      ['butter', 5],
      ['zucker', 15],
      ['zimt', 1],
    ],
    [
      'Reis mit der Milch, Butter und einer Prise Salz aufkochen.',
      'Bei kleinster Hitze 20 Minuten quellen lassen und öfter umrühren, damit nichts ansetzt.',
      'Zucker und Zimt mischen und darüberstreuen. Warm oder kalt essen.',
    ],
    { meals: ['fruehstueck', 'snack', 'spaet'], keeps: true, tips: ['Mit Milchreis (Rundkorn) wird er cremiger, die Nährwerte sind fast gleich.'] },
  ),
  recipe(
    'r173',
    'Pfannkuchen mit Banane und Honig',
    B,
    15,
    [
      ['dinkelmehl', 80],
      ['ei', 110],
      ['vollmilch', 150],
      ['butter', 10],
      ['banane', 120],
      ['honig', 20],
    ],
    [
      'Mehl, Eier, Milch und eine Prise Salz glatt rühren und 5 Minuten quellen lassen.',
      'In der Butter zwei bis drei dünne Pfannkuchen backen.',
      'Mit Bananenscheiben belegen, Honig darüber und aufrollen.',
    ],
    { meals: ['fruehstueck', 'mittag', 'abend'] },
  ),
  recipe(
    'r174',
    'Kaiserschmarrn mit Apfel',
    B,
    20,
    [
      ['dinkelmehl', 80],
      ['ei', 110],
      ['vollmilch', 150],
      ['butter', 15],
      ['zucker', 15],
      ['apfel', 100],
    ],
    [
      'Mehl, Eier, Milch und eine Prise Salz zu einem dicken Teig verrühren.',
      'Apfel klein würfeln und in der Butter kurz anbraten, den Teig darübergießen und stocken lassen.',
      'Mit zwei Pfannenwendern in Stücke reißen, Zucker darüberstreuen und unter Rühren kurz karamellisieren lassen.',
    ],
    { meals: ['mittag', 'abend', 'snack'] },
  ),
  recipe(
    'r175',
    'Nudeln mit Olivenöl und Parmesan',
    B,
    12,
    [
      ['nudeln', 125],
      ['olivenoel', 20],
      ['parmesan', 30],
      ['pfeffer', 0.5],
      ['kraeuter', 1],
      ['knoblauch', 4, 'opt'],
    ],
    [
      'Nudeln kochen und eine Tasse Nudelwasser aufheben.',
      'Öl in der Pfanne erwärmen, optional den Knoblauch in Scheiben darin hell anschwitzen.',
      'Nudeln mit etwas Nudelwasser, Parmesan, Kräutern und Pfeffer im Öl schwenken.',
    ],
    { intro: 'Wenig Volumen, viel Energie: das Öl bringt allein 180 kcal.' },
  ),
  recipe(
    'r176',
    'Gebratener Eierreis',
    B,
    12,
    [
      ['express-reis', 250],
      ['rapsoel', 15],
      ['ei', 110],
      ['sojasauce', 15],
      ['erbsen', 60, 'opt'],
      ['fruehlingszwiebel', 15, 'opt'],
    ],
    [
      'Reis im heißen Öl 3 Minuten kräftig anbraten, optional mit Erbsen.',
      'Reis an den Rand schieben, Eier in die Mitte geben, verrühren und stocken lassen.',
      'Alles vermischen, mit Sojasauce würzen und optional Frühlingszwiebeln darüber.',
    ],
  ),
  recipe(
    'r177',
    'Überbackener Schinken-Käse-Toast',
    B,
    10,
    [
      ['toast', 100],
      ['butter', 10],
      ['creme-fraiche', 30],
      ['kochschinken', 60],
      ['reibekaese', 50],
    ],
    [
      'Backofen auf 220 °C (Grill) vorheizen.',
      'Toast dünn mit Butter und Crème fraîche bestreichen, Schinken und Käse darauf.',
      '5–7 Minuten überbacken, bis der Käse goldbraun ist.',
    ],
    { meals: ['fruehstueck', 'mittag', 'abend', 'snack'] },
  ),
  recipe(
    'r178',
    'Klassisches Mac and Cheese',
    B,
    20,
    [
      ['nudeln', 110],
      ['butter', 10],
      ['dinkelmehl', 10],
      ['vollmilch', 200],
      ['reibekaese', 60],
      ['pfeffer', 0.3],
    ],
    [
      'Nudeln kochen.',
      'Butter im Topf schmelzen, Mehl einrühren, nach und nach die Milch dazugeben und unter Rühren 2 Minuten köcheln lassen.',
      'Käse darin schmelzen, die Nudeln untermischen und pfeffern.',
    ],
  ),
  recipe(
    'r179',
    'Porridge mit Banane, Honig und Butter',
    B,
    8,
    [
      ['haferflocken', 70],
      ['vollmilch', 300],
      ['butter', 10],
      ['banane', 120],
      ['honig', 15],
    ],
    [
      'Haferflocken mit der Milch aufkochen und 3–4 Minuten unter Rühren köcheln lassen.',
      'Butter unterrühren, das macht es cremig.',
      'Mit Bananenscheiben und Honig essen.',
    ],
    { meals: ['fruehstueck', 'snack'] },
  ),
  recipe(
    'r180',
    'Pizzatoast ohne Tomate',
    B,
    10,
    [
      ['toast', 100],
      ['creme-fraiche', 40],
      ['kraeuter', 1],
      ['salami', 40],
      ['reibekaese', 50],
    ],
    [
      'Backofen auf 220 °C (Grill) vorheizen.',
      'Toast mit Crème fraîche bestreichen und mit Kräutern bestreuen.',
      'Salami und Käse darauf und 5–7 Minuten überbacken.',
    ],
    { meals: ['mittag', 'abend', 'snack'] },
  ),
  recipe(
    'r181',
    'Hummus-Feta-Wrap mit Hähnchen',
    B,
    5,
    [
      ['wraps', 124],
      ['hummus', 60],
      ['feta', 50],
      ['haehnchenstreifen', 80],
      ['salatmix', 30],
    ],
    [
      'Wraps dick mit Hummus bestreichen.',
      'Feta darüberbröseln, Hähnchen und Salat darauf.',
      'Fest einrollen. Geht auch kalt zum Mitnehmen.',
    ],
    { meals: ['mittag', 'abend', 'snack'] },
  ),
  recipe(
    'r182',
    'Bananen-Honig-Toast mit Sahnequark',
    B,
    5,
    [
      ['toast', 75],
      ['butter', 10],
      ['quark40', 80],
      ['banane', 120],
      ['honig', 15],
    ],
    [
      'Toast toasten und dünn mit Butter bestreichen.',
      'Sahnequark daraufstreichen, Banane in Scheiben darauflegen.',
      'Mit Honig beträufeln. Schnell gemacht und gut 550 kcal.',
    ],
    { meals: ['fruehstueck', 'snack', 'spaet'] },
  ),
]
