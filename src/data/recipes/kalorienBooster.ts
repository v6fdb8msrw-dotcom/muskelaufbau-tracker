import { recipe } from './helpers'

/*
 * Kalorien-Rezepte: viele Kalorien, normales Eiweiß, macht weniger satt als die Eiweiß-Rezepte.
 * Vor allem fürs Abendessen, wenn das Eiweiß über den Tag schon geschafft ist.
 * Kohlenhydrate und Fett (Brot, Reis, Nudeln, Sahne, Käse, Butter, Öl, Honig) sättigen weniger als Eiweiß.
 * Ideen u. a. nach klassischen Massephase-Gerichten (Nasi Goreng, Frikassee, Käsespätzle), eigene Mengen.
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
  // ---------- Pasta ----------
  recipe('r183', 'Fusilli mit Schinken-Käse-Sahnesoße', B, 15, [['nudeln', 130], ['butter', 10], ['kochschinken', 60], ['kochsahne', 100], ['reibekaese', 40], ['pfeffer', 0.3]], [
    'Nudeln in Salzwasser kochen.',
    'Schinken in Streifen in der Butter kurz anbraten, Sahne dazugießen und aufkochen.',
    'Käse einrühren, bis die Soße cremig ist, Nudeln untermischen und pfeffern.',
  ]),
  recipe('r184', 'Nudeln Alfredo mit Hähnchen', B, 15, [['nudeln', 125], ['butter', 15], ['kochsahne', 100], ['parmesan', 30], ['haehnchenstreifen', 60], ['pfeffer', 0.3]], [
    'Nudeln kochen, eine Tasse Nudelwasser aufheben.',
    'Butter schmelzen, Sahne dazu und kurz einköcheln, dann den Parmesan einrühren.',
    'Nudeln, Hähnchenstreifen und einen Schuss Nudelwasser untermischen, bis alles glänzt.',
  ]),
  recipe('r185', 'Spaghetti mit Speck-Sahne-Soße', B, 15, [['nudeln', 125], ['speckwuerfel', 60], ['kochsahne', 100], ['parmesan', 15], ['pfeffer', 0.5], ['erbsen', 60, 'opt']], [
    'Spaghetti kochen, optional die Erbsen die letzten 3 Minuten mitkochen.',
    'Speck ohne Öl knusprig braten, Sahne dazugeben und 2 Minuten köcheln lassen.',
    'Spaghetti untermischen, mit Parmesan und viel Pfeffer servieren.',
  ]),
  recipe('r186', 'Tortellini in Parmesan-Butter', B, 10, [['tortellini-fleisch', 300], ['butter', 20], ['parmesan', 20], ['kraeuter', 1], ['pfeffer', 0.3]], [
    'Tortellini nach Packungsangabe kochen.',
    'Butter in der Pfanne schmelzen und leicht goldbraun werden lassen.',
    'Tortellini darin schwenken, mit Parmesan, Kräutern und Pfeffer servieren.',
  ]),
  recipe('r187', 'Ravioli in Käsesoße', B, 10, [['ravioli-fleisch', 300], ['kochsahne', 80], ['reibekaese', 30], ['pfeffer', 0.3]], [
    'Ravioli nach Packungsangabe kochen.',
    'Sahne in einer Pfanne aufkochen und den Käse darin schmelzen.',
    'Ravioli in der Soße schwenken und pfeffern.',
  ]),
  recipe('r188', 'Bergsteiger-Spätzle mit Speck', B, 15, [['speckwuerfel', 50], ['butter', 10], ['spaetzle', 300], ['reibekaese', 50], ['pfeffer', 0.3], ['zwiebel', 40, 'opt']], [
    'Speck in der Butter knusprig braten, optional mit Zwiebelringen.',
    'Spätzle dazugeben und 5 Minuten mitbraten, bis sie leicht knusprig sind.',
    'Käse unterheben, schmelzen lassen und pfeffern.',
  ]),
  recipe('r189', 'Maultaschen in Sahne-Senf-Soße', B, 12, [['maultaschen', 300], ['butter', 5], ['kochsahne', 100], ['senf', 15], ['kraeuter', 1]], [
    'Maultaschen in Streifen schneiden und in der Butter anbraten.',
    'Sahne und Senf verrühren, dazugießen und 2 Minuten einköcheln lassen.',
    'Mit Kräutern bestreuen.',
  ]),
  recipe('r190', 'Lachs-Sahne-Nudeln', B, 15, [['nudeln', 110], ['butter', 10], ['raeucherlachs', 75], ['kochsahne', 100], ['zitrone', 5], ['kraeuter', 1]], [
    'Nudeln kochen.',
    'Butter schmelzen, Sahne dazu und kurz aufkochen, mit Zitronensaft und Kräutern würzen.',
    'Räucherlachs in Streifen und die Nudeln unterheben, nur noch kurz erwärmen.',
  ]),
  recipe('r191', 'Mac and Cheese mit Speck', B, 20, [['nudeln', 120], ['speckwuerfel', 40], ['butter', 10], ['dinkelmehl', 10], ['vollmilch', 150], ['reibekaese', 60]], [
    'Nudeln kochen. Speck in einem Topf knusprig braten und herausnehmen.',
    'Butter im selben Topf schmelzen, Mehl einrühren und nach und nach die Milch dazugeben, 2 Minuten köcheln lassen.',
    'Käse darin schmelzen, Nudeln und Speck untermischen.',
  ]),
  recipe('r192', 'Helle Hack-Sahne-Nudeln', B, 15, [['nudeln', 110], ['rinderhack', 100], ['kochsahne', 100], ['paprikapulver', 1], ['parmesan', 10], ['zwiebel', 30, 'opt']], [
    'Nudeln kochen.',
    'Hack krümelig braten, optional mit Zwiebel, mit Paprikapulver und Salz würzen.',
    'Sahne dazugeben, 3 Minuten köcheln lassen, Nudeln untermischen und mit Parmesan bestreuen.',
  ]),

  // ---------- Reis ----------
  recipe('r193', 'Nasi Goreng mit Spiegelei', B, 15, [['express-reis', 250], ['rapsoel', 15], ['haehnchenstreifen', 80], ['sojasauce', 20], ['sweet-chili', 20], ['ei', 55], ['fruehlingszwiebel', 15, 'opt'], ['karotte', 50, 'opt']], [
    'Reis im heißen Öl kräftig anbraten, optional mit Karottenstiften.',
    'Hähnchen, Sojasauce und Sweet-Chili dazugeben und 3 Minuten weiterbraten.',
    'Spiegelei braten und obenauf legen, optional mit Frühlingszwiebeln.',
  ]),
  recipe('r194', 'Hühnerfrikassee mit Reis', B, 25, [['reis', 90], ['haehnchenbrust', 120], ['butter', 15], ['dinkelmehl', 15], ['vollmilch', 150], ['kochsahne', 50], ['gemuesebruehe', 3], ['zitrone', 5], ['erbsen', 60, 'opt']], [
    'Reis kochen. Hähnchen würfeln und in 150 ml Wasser mit dem Brühpulver 10 Minuten garziehen lassen, den Sud aufheben.',
    'Butter schmelzen, Mehl einrühren, nach und nach Sud, Milch und Sahne dazugeben und sämig köcheln, optional mit Erbsen.',
    'Hähnchen in die Soße geben, mit Zitronensaft abschmecken und mit dem Reis servieren.',
  ], { keeps: true }),
  recipe('r195', 'Speck-Eierreis', B, 12, [['express-reis', 250], ['speckwuerfel', 60], ['rapsoel', 10], ['ei', 110], ['sojasauce', 15]], [
    'Speck im Öl knusprig braten.',
    'Reis dazugeben und 3 Minuten mitbraten.',
    'Eier in der Pfanne verrühren, stocken lassen, alles mischen und mit Sojasauce würzen.',
  ]),
  recipe('r196', 'Teriyaki-Hähnchen mit Reis', B, 15, [['reis', 110], ['haehnchenbrust', 130], ['rapsoel', 15], ['sojasauce', 25], ['honig', 25], ['fruehlingszwiebel', 15, 'opt']], [
    'Reis kochen.',
    'Hähnchen in Stücken im Öl goldbraun braten.',
    'Sojasauce und Honig dazugeben und unter Rühren einkochen lassen, bis das Fleisch glänzt. Auf dem Reis servieren.',
  ]),
  recipe('r197', 'Rahm-Curry mit Hähnchen und Reis', B, 15, [['express-reis', 250], ['haehnchenbrust', 120], ['rapsoel', 10], ['currypulver', 4], ['kochsahne', 120], ['honig', 10]], [
    'Hähnchen würfeln und im Öl anbraten.',
    'Currypulver kurz mitrösten, Sahne und Honig dazugeben und 4 Minuten köcheln lassen.',
    'Mit dem erhitzten Reis servieren.',
  ], { keeps: true }),
  recipe('r198', 'Chili-Käse-Reis ohne Tomate', B, 15, [['express-reis', 250], ['rinderhack', 100], ['kidneybohnen', 80], ['paprikapulver', 1], ['kreuzkuemmel', 1], ['reibekaese', 30], ['creme-fraiche', 30]], [
    'Hack krümelig braten und mit Paprikapulver, Kreuzkümmel und Salz würzen.',
    'Bohnen und Reis dazugeben und 3 Minuten mitbraten.',
    'Käse darüber schmelzen lassen und mit einem Klecks Crème fraîche servieren.',
  ]),

  // ---------- Brot, Toast, Wrap, Flammkuchen ----------
  recipe('r199', 'Croque Monsieur aus der Pfanne', B, 10, [['toast', 100], ['butter', 15], ['creme-fraiche', 30], ['kochschinken', 60], ['reibekaese', 50]], [
    'Zwei Toastscheiben mit Crème fraîche bestreichen, mit Schinken und Käse belegen und mit den anderen Scheiben zuklappen.',
    'Außen dünn mit Butter bestreichen.',
    'In der Pfanne bei mittlerer Hitze mit Deckel 3 Minuten pro Seite goldbraun braten, bis der Käse schmilzt.',
  ]),
  recipe('r200', 'Smash-Burger-Wrap', B, 15, [['wraps', 124], ['rinderhack', 100], ['kaese-scheiben', 40], ['mayonnaise', 15], ['senf', 10], ['eisbergsalat', 30], ['gurke', 40, 'opt']], [
    'Hack in zwei Portionen sehr dünn auf die Wraps drücken und salzen.',
    'Mit der Fleischseite nach unten in die heiße Pfanne legen, 3 Minuten braten, wenden und Käse darauf schmelzen lassen.',
    'Mayo und Senf verrühren, mit Salat und optional Gurke auf die Wraps geben und zuklappen.',
  ], { intro: 'Der Trend-Burger aus dem Wrap: knusprig, saftig und rund 850 kcal.' }),
  recipe('r201', 'Döner-Wrap mit Knoblauch-Crème', B, 10, [['wraps', 124], ['haehnchenstreifen', 100], ['paprikapulver', 1], ['creme-fraiche', 50], ['knoblauchpulver', 0.5], ['eisbergsalat', 40], ['feta', 30]], [
    'Hähnchen mit Paprikapulver in der Pfanne kurz anrösten.',
    'Crème fraîche mit Knoblauchpulver und Salz verrühren.',
    'Wraps mit Soße bestreichen, Fleisch, Salat und Feta darauf und einrollen.',
  ]),
  recipe('r202', 'Flammkuchen mit Speck', B, 20, [['flammkuchenteig', 200], ['creme-fraiche', 80], ['speckwuerfel', 60], ['pfeffer', 0.3], ['zwiebel', 40, 'opt']], [
    'Backofen auf 230 °C vorheizen.',
    'Teig ausrollen, mit Crème fraîche bestreichen, Speck und optional dünne Zwiebelringe darauf verteilen.',
    '10–12 Minuten backen, bis der Rand knusprig ist, und pfeffern.',
  ]),
  recipe('r203', 'Flammkuchen mit Räucherlachs', B, 20, [['flammkuchenteig', 200], ['creme-fraiche', 60], ['raeucherlachs', 75], ['zitrone', 5], ['kraeuter', 1]], [
    'Backofen auf 230 °C vorheizen.',
    'Teig mit Crème fraîche bestreichen und 10 Minuten backen.',
    'Räucherlachs auf dem heißen Flammkuchen verteilen, mit Zitronensaft und Kräutern würzen.',
  ]),
  recipe('r204', 'Überbackene Käse-Schinken-Brezeln', B, 10, [['brezel', 170], ['butter', 10], ['kochschinken', 40], ['reibekaese', 50]], [
    'Backofen auf 220 °C (Grill) vorheizen.',
    'Brezeln waagerecht aufschneiden und dünn mit Butter bestreichen.',
    'Schinken und Käse darauf und 5–6 Minuten überbacken.',
  ]),
  recipe('r205', 'Monte-Cristo-Sandwich', B, 10, [['ei', 55], ['vollmilch', 50], ['toast', 100], ['kaese-scheiben', 40], ['kochschinken', 40], ['butter', 15], ['honig', 10]], [
    'Ei mit Milch verquirlen.',
    'Zwei Sandwiches mit Käse und Schinken belegen, kurz in die Eimasse tauchen.',
    'In der Butter von beiden Seiten goldbraun braten und mit etwas Honig beträufeln. Süß und herzhaft zugleich.',
  ]),
  recipe('r206', 'Pide-Wrap mit Hack und Feta', B, 15, [['wraps', 124], ['gemischtes-hack', 100], ['paprikapulver', 1], ['kreuzkuemmel', 1], ['feta', 40], ['olivenoel', 10], ['joghurt', 50]], [
    'Hack krümelig braten und mit Paprikapulver, Kreuzkümmel und Salz würzen.',
    'Auf die Wraps verteilen, Feta darüberbröseln, die Ränder einklappen.',
    'Mit Öl in der Pfanne knusprig braten und mit Joghurt servieren.',
  ]),

  // ---------- Eier ----------
  recipe('r207', 'Bauernomelett mit Speck und Brot', B, 12, [['speckwuerfel', 50], ['butter', 10], ['ei', 165], ['reibekaese', 30], ['mischbrot', 100], ['fruehlingszwiebel', 15, 'opt']], [
    'Speck in der Butter knusprig braten.',
    'Eier verquirlen, darübergießen und bei mittlerer Hitze stocken lassen, Käse darüberstreuen.',
    'Zusammenklappen und mit zwei Scheiben Brot essen.',
  ], { meals: ['fruehstueck', 'mittag', 'abend'] }),
  recipe('r208', 'Senfeier mit Reis', B, 15, [['reis', 80], ['ei', 165], ['butter', 15], ['dinkelmehl', 10], ['vollmilch', 150], ['senf', 20]], [
    'Reis kochen. Eier 8 Minuten kochen, abschrecken und pellen.',
    'Butter schmelzen, Mehl einrühren, Milch nach und nach dazugeben und den Senf unterrühren.',
    'Eier halbieren, in die Soße legen und mit dem Reis servieren. Ein Klassiker wie bei Oma.',
  ]),

  // ---------- Fleisch und Fisch ----------
  recipe('r209', 'Cornflakes-Schnitzel mit Reis', B, 20, [['schweineschnitzel', 120], ['ei', 55], ['dinkelmehl', 20], ['cornflakes', 30], ['rapsoel', 20], ['express-reis', 150]], [
    'Cornflakes in einem Beutel grob zerdrücken. Schnitzel flach klopfen und salzen.',
    'Erst in Mehl, dann im verquirlten Ei und zuletzt in den Cornflakes wenden.',
    'Im Öl bei mittlerer Hitze 3–4 Minuten pro Seite knusprig braten und mit dem Reis essen.',
  ], { intro: 'Cornflakes statt Paniermehl: extra knusprig.' }),
  recipe('r210', 'Hackbällchen in Rahmsoße mit Spätzle', B, 25, [['gemischtes-hack', 120], ['senf', 10], ['butter', 5], ['kochsahne', 100], ['gemuesebruehe', 3], ['spaetzle', 200]], [
    'Hack mit Senf und Salz verkneten und kleine Bällchen formen.',
    'In der Butter rundum braten, Sahne, 50 ml Wasser und Brühpulver dazugeben und 8 Minuten köcheln lassen.',
    'Spätzle in einer zweiten Pfanne erhitzen und mit den Bällchen und der Soße servieren.',
  ], { keeps: true }),
  recipe('r211', 'Geschnetzeltes Zürcher Art mit Spätzle', B, 15, [['schweinefilet', 120], ['butter', 10], ['kochsahne', 120], ['gemuesebruehe', 2], ['spaetzle', 200], ['zwiebel', 30, 'opt']], [
    'Fleisch in feine Streifen schneiden und in der Butter scharf anbraten, optional mit Zwiebel.',
    'Sahne und Brühpulver dazugeben und 3 Minuten sämig köcheln lassen.',
    'Spätzle erhitzen und mit dem Geschnetzelten servieren.',
  ]),
  recipe('r212', 'Gyros mit Reis und Knoblauch-Crème', B, 15, [['schweineschnitzel', 120], ['rapsoel', 15], ['paprikapulver', 2], ['kreuzkuemmel', 1], ['express-reis', 200], ['creme-fraiche', 50], ['knoblauchpulver', 0.5], ['gurke', 50, 'opt']], [
    'Fleisch in dünne Streifen schneiden, würzen und im heißen Öl knusprig braten.',
    'Reis erhitzen. Crème fraîche mit Knoblauchpulver und Salz verrühren.',
    'Alles anrichten, optional mit Gurke.',
  ]),
  recipe('r213', 'Lachs-Sahne-Spätzle', B, 15, [['lachsfilet', 100], ['butter', 5], ['spaetzle', 250], ['kochsahne', 80], ['zitrone', 5], ['kraeuter', 1]], [
    'Lachs in Würfeln in der Butter 3 Minuten braten.',
    'Spätzle dazugeben und kurz mitbraten.',
    'Sahne, Zitronensaft und Kräuter dazugeben und 2 Minuten einköcheln lassen.',
  ]),
  recipe('r214', 'Honig-Senf-Hähnchen mit Butterreis', B, 15, [['reis', 100], ['butter', 15], ['haehnchenbrust', 120], ['rapsoel', 10], ['honig', 20], ['senf', 15]], [
    'Reis kochen und die Butter unterrühren.',
    'Hähnchen in Streifen im Öl braten.',
    'Honig und Senf verrühren, zum Hähnchen geben und kurz glasieren. Mit dem Butterreis servieren.',
  ]),

  // ---------- Vegetarisch und Sonstiges ----------
  recipe('r215', 'Hummus-Couscous-Bowl mit Feta und Ei', B, 12, [['couscous', 80], ['olivenoel', 10], ['hummus', 80], ['feta', 50], ['ei', 55], ['gurke', 60, 'opt']], [
    'Couscous mit der gleichen Menge kochendem Wasser übergießen, 5 Minuten quellen lassen und das Öl unterrühren. Ei 8 Minuten kochen.',
    'Couscous in eine Schale geben, Hummus daneben, Feta darüberbröseln.',
    'Ei halbieren und dazulegen, optional mit Gurke.',
  ]),
  recipe('r216', 'Kichererbsen-Sahne-Curry mit Reis', B, 15, [['express-reis', 250], ['kichererbsen', 160], ['rapsoel', 10], ['currypulver', 4], ['kochsahne', 100], ['honig', 5]], [
    'Kichererbsen abspülen und im Öl 2 Minuten anbraten.',
    'Currypulver kurz mitrösten, Sahne und Honig dazugeben und 5 Minuten köcheln lassen.',
    'Mit dem erhitzten Reis servieren.',
  ], { keeps: true }),
  recipe('r217', 'Bohnen-Käse-Quesadillas', B, 10, [['wraps', 124], ['kidneybohnen', 100], ['kreuzkuemmel', 0.5], ['reibekaese', 60], ['creme-fraiche', 30]], [
    'Bohnen abspülen und mit Kreuzkümmel und Salz grob zerdrücken.',
    'Auf eine Wrap-Hälfte streichen, Käse darauf, zuklappen.',
    'In der trockenen Pfanne 2–3 Minuten pro Seite knusprig braten, mit Crème fraîche essen.',
  ]),
  recipe('r218', 'Tortellini-Auflauf mit Käse', B, 25, [['tortellini-kaese', 250], ['kochsahne', 100], ['reibekaese', 40], ['pfeffer', 0.3]], [
    'Backofen auf 200 °C vorheizen.',
    'Tortellini roh mit der Sahne, 50 ml Wasser und Pfeffer in eine kleine Auflaufform geben.',
    'Käse darüberstreuen und 20 Minuten backen, bis er goldbraun ist.',
  ], { keeps: true }),
  recipe('r219', 'TK-Pizza mit extra Käse', B, 15, [['pizza-salami', 350], ['mozzarella', 40], ['salatmix', 40]], [
    'Backofen nach Packungsangabe vorheizen.',
    'Mozzarella zerzupfen und auf der Pizza verteilen.',
    'Nach Packungsangabe backen und mit dem Salat darauf servieren.',
  ], { tips: ['Die Pizza steht drin, weil du Fertigpizza magst. Ab und zu völlig okay für die Kalorien.'] }),
  recipe('r220', 'Couscous-Hack-Pfanne mit Feta', B, 15, [['couscous', 80], ['gemischtes-hack', 100], ['olivenoel', 10], ['kreuzkuemmel', 1], ['paprikapulver', 1], ['feta', 30], ['joghurt', 50]], [
    'Couscous mit der gleichen Menge kochendem Wasser übergießen und 5 Minuten quellen lassen.',
    'Hack im Öl krümelig braten und mit Kreuzkümmel, Paprikapulver und Salz würzen.',
    'Couscous untermischen, Feta darüberbröseln und mit Joghurt servieren.',
  ]),
]
