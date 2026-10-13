/*
 * Animierte Strichfiguren für die Mini-Tutorials.
 * Jede Übung hat benannte Gelenkpunkte in 2–4 Positionen (Frames). Die Figur bewegt sich
 * in einer Schleife zwischen den Positionen. Zeichenfläche 200 × 140, Boden bei y = 126.
 * Ansicht „seite“: Blick von der Seite, Figur schaut nach rechts.
 */

export type Pt = [number, number]
export type Frame = Record<string, Pt>

export interface Prop {
  kind: 'boden' | 'bank' | 'matte' | 'ruderer' | 'pad'
}

export interface Pictogram {
  view: 'seite' | 'vorne' | 'oben'
  /** Linien des Körpers (nahe Seite) */
  segments: [string, string][]
  /** Abgewandte Arme/Beine, blasser */
  far?: [string, string][]
  /** Dünne Hilfslinien (z. B. Zugseil am Rudergerät) */
  thin?: [string, string][]
  head: string
  /** Punkte mit Kurzhantel */
  db?: string[]
  props?: Prop['kind'][]
  frames: Frame[]
  /** Untertitel je Frame */
  captions?: string[]
  /** Sekunden je Frame */
  pace?: number
}

const SIDE: [string, string][] = [
  ['sh', 'hip'],
  ['sh', 'el'],
  ['el', 'ha'],
  ['hip', 'kn'],
  ['kn', 'ft'],
]
const SIDE_FAR: [string, string][] = [
  ['sh', 'el2'],
  ['el2', 'ha2'],
  ['hip', 'kn2'],
  ['kn2', 'ft2'],
]
const FRONT: [string, string][] = [
  ['nk', 'pv'],
  ['shL', 'shR'],
  ['shL', 'elL'],
  ['elL', 'haL'],
  ['shR', 'elR'],
  ['elR', 'haR'],
  ['hipL', 'hipR'],
  ['hipL', 'knL'],
  ['knL', 'ftL'],
  ['hipR', 'knR'],
  ['knR', 'ftR'],
]

const standSide: Frame = { head: [100, 22], sh: [100, 38], hip: [100, 78], kn: [101, 102], ft: [100, 126], kn2: [96, 102], ft2: [94, 126] }
const standFront: Frame = {
  head: [100, 30],
  nk: [100, 42],
  shL: [88, 46],
  shR: [112, 46],
  pv: [100, 84],
  hipL: [93, 84],
  hipR: [107, 84],
  knL: [92, 105],
  ftL: [91, 126],
  knR: [108, 105],
  ftR: [109, 126],
}
const lyingTop: Frame = {
  head: [100, 26],
  nk: [100, 38],
  shL: [86, 42],
  shR: [114, 42],
  pv: [100, 82],
  hipL: [93, 82],
  hipR: [107, 82],
  knL: [92, 104],
  ftL: [91, 126],
  knR: [108, 104],
  ftR: [109, 126],
}

export const PICTOGRAMS: Record<string, Pictogram> = {
  bizepscurl: {
    view: 'seite',
    segments: SIDE,
    far: SIDE_FAR,
    head: 'head',
    db: ['ha'],
    props: ['boden'],
    frames: [
      { ...standSide, el: [101, 59], ha: [103, 80], el2: [98, 59], ha2: [97, 80] },
      { ...standSide, el: [101, 59], ha: [116, 44], el2: [98, 59], ha2: [97, 80] },
    ],
    captions: ['Arm gestreckt', 'Zur Schulter beugen'],
  },
  schulterdruecken: {
    view: 'vorne',
    segments: FRONT,
    head: 'head',
    db: ['haL', 'haR'],
    props: ['boden'],
    frames: [
      { ...standFront, elL: [74, 58], haL: [74, 38], elR: [126, 58], haR: [126, 38] },
      { ...standFront, elL: [82, 28], haL: [88, 10], elR: [118, 28], haR: [112, 10] },
    ],
    captions: ['Schulterhöhe', 'Nach oben drücken'],
  },
  seitheben: {
    view: 'vorne',
    segments: FRONT,
    head: 'head',
    db: ['haL', 'haR'],
    props: ['boden'],
    frames: [
      { ...standFront, elL: [84, 66], haL: [82, 86], elR: [116, 66], haR: [118, 86] },
      { ...standFront, elL: [68, 50], haL: [48, 52], elR: [132, 50], haR: [152, 52] },
    ],
    captions: ['Arme neben dem Körper', 'Bis Schulterhöhe'],
  },
  liegestuetze: {
    view: 'seite',
    segments: [
      ['ft', 'kn'],
      ['kn', 'hip'],
      ['hip', 'sh'],
      ['sh', 'el'],
      ['el', 'ha'],
    ],
    head: 'head',
    props: ['boden'],
    frames: [
      { ft: [40, 124], kn: [68, 113], hip: [95, 103], sh: [140, 85], el: [140, 105], ha: [141, 125], head: [153, 78] },
      { ft: [40, 124], kn: [68, 119], hip: [95, 115], sh: [140, 108], el: [127, 117], ha: [141, 125], head: [154, 102] },
    ],
    captions: ['Oben, Körper gerade', 'Brust zum Boden'],
  },
  plank: {
    view: 'seite',
    segments: [
      ['ft', 'kn'],
      ['kn', 'hip'],
      ['hip', 'sh'],
      ['sh', 'el'],
      ['el', 'ha'],
    ],
    head: 'head',
    props: ['matte'],
    frames: [
      { ft: [40, 124], kn: [68, 116], hip: [96, 108], sh: [140, 100], el: [140, 123], ha: [160, 123], head: [153, 94] },
      { ft: [40, 124], kn: [68, 115.5], hip: [96, 107], sh: [140, 99.5], el: [140, 123], ha: [160, 123], head: [153, 93.5] },
    ],
    captions: ['Halten', 'Halten'],
    pace: 1.6,
  },
  rudern: {
    view: 'seite',
    segments: SIDE,
    far: SIDE_FAR,
    head: 'head',
    db: ['ha'],
    props: ['bank'],
    frames: [
      { head: [142, 66], sh: [128, 72], hip: [80, 76], kn: [74, 102], ft: [70, 126], kn2: [78, 91], ft2: [54, 91], el2: [130, 82], ha2: [131, 91], el: [129, 94], ha: [129, 114] },
      { head: [142, 66], sh: [128, 72], hip: [80, 76], kn: [74, 102], ft: [70, 126], kn2: [78, 91], ft2: [54, 91], el2: [130, 82], ha2: [131, 91], el: [108, 62], ha: [110, 84] },
    ],
    captions: ['Arm hängt', 'Ellbogen zur Hüfte'],
  },
  'kh-rudern-vorgebeugt': {
    view: 'seite',
    segments: SIDE,
    far: SIDE_FAR,
    head: 'head',
    db: ['ha', 'ha2'],
    props: ['boden'],
    frames: [
      { head: [139, 52], sh: [128, 60], hip: [92, 80], kn: [106, 104], ft: [102, 126], kn2: [101, 104], ft2: [97, 126], el: [128, 82], ha: [128, 104], el2: [125, 82], ha2: [125, 104] },
      { head: [139, 52], sh: [128, 60], hip: [92, 80], kn: [106, 104], ft: [102, 126], kn2: [101, 104], ft2: [97, 126], el: [108, 66], ha: [108, 88], el2: [125, 82], ha2: [125, 104] },
    ],
    captions: ['Vorgebeugt, Arme hängen', 'Links zur Hüfte ziehen'],
  },
  crunch: {
    view: 'seite',
    segments: SIDE,
    head: 'head',
    props: ['matte'],
    frames: [
      { hip: [82, 120], kn: [102, 98], ft: [120, 124], sh: [42, 121], head: [28, 118], el: [56, 111], ha: [64, 116] },
      { hip: [82, 120], kn: [102, 98], ft: [120, 124], sh: [52, 104], head: [42, 93], el: [66, 100], ha: [72, 106] },
    ],
    captions: ['Rückenlage', 'Einrollen'],
  },
  rudergeraet: {
    view: 'seite',
    segments: SIDE,
    thin: [['ha', 'fly']],
    head: 'head',
    props: ['ruderer'],
    frames: [
      { hip: [84, 112], kn: [106, 90], ft: [128, 112], sh: [100, 76], head: [108, 64], el: [120, 84], ha: [138, 90], fly: [164, 98] },
      { hip: [58, 112], kn: [93, 108], ft: [128, 112], sh: [50, 76], head: [44, 64], el: [52, 98], ha: [72, 92], fly: [164, 98] },
    ],
    captions: ['Auslage', 'Beine, Rücken, Arme'],
    pace: 1.4,
  },
  'farmers-walk': {
    view: 'seite',
    segments: SIDE,
    far: SIDE_FAR,
    head: 'head',
    db: ['ha', 'ha2'],
    props: ['pad'],
    frames: [
      { head: [100, 22], sh: [100, 38], hip: [100, 78], kn: [108, 101], ft: [112, 124], kn2: [93, 102], ft2: [86, 124], el: [100, 60], ha: [101, 82], el2: [98, 60], ha2: [98, 82] },
      { head: [100, 22], sh: [100, 38], hip: [100, 78], kn: [93, 102], ft: [86, 124], kn2: [108, 101], ft2: [112, 124], el: [100, 60], ha: [101, 82], el2: [98, 60], ha2: [98, 82] },
    ],
    captions: ['Aufrecht gehen', 'Hanteln fest greifen'],
    pace: 0.8,
  },
  'boden-flys': {
    view: 'oben',
    segments: FRONT,
    head: 'head',
    db: ['haL', 'haR'],
    props: ['matte'],
    frames: [
      { ...lyingTop, elL: [66, 50], haL: [46, 46], elR: [134, 50], haR: [154, 46] },
      { ...lyingTop, elL: [84, 54], haL: [96, 50], elR: [116, 54], haR: [104, 50] },
    ],
    captions: ['Arme weit geöffnet', 'Über der Brust zusammen'],
  },
  'russian-twist': {
    view: 'vorne',
    segments: FRONT,
    head: 'head',
    db: ['hd'],
    props: ['matte'],
    frames: [
      { pv: [100, 104], hipL: [92, 104], hipR: [108, 104], knL: [86, 86], knR: [114, 86], ftL: [82, 110], ftR: [118, 110], nk: [92, 66], shL: [82, 70], shR: [102, 64], head: [88, 52], elL: [76, 86], elR: [92, 84], haL: [74, 97], haR: [78, 96], hd: [76, 97] },
      { pv: [100, 104], hipL: [92, 104], hipR: [108, 104], knL: [86, 86], knR: [114, 86], ftL: [82, 110], ftR: [118, 110], nk: [108, 66], shL: [98, 64], shR: [118, 70], head: [112, 52], elL: [108, 84], elR: [124, 86], haL: [122, 96], haR: [126, 97], hd: [124, 97] },
    ],
    captions: ['Nach links drehen', 'Nach rechts drehen'],
  },
  'kh-swing': {
    view: 'seite',
    segments: SIDE,
    far: [
      ['hip', 'kn2'],
      ['kn2', 'ft2'],
    ],
    head: 'head',
    db: ['ha'],
    props: ['boden'],
    frames: [
      { head: [133, 50], sh: [122, 58], hip: [88, 80], kn: [106, 104], ft: [102, 126], kn2: [100, 104], ft2: [96, 126], el: [114, 78], ha: [104, 98] },
      { head: [102, 24], sh: [101, 38], hip: [100, 78], kn: [101, 102], ft: [102, 126], kn2: [97, 102], ft2: [96, 126], el: [119, 42], ha: [138, 44] },
    ],
    captions: ['Hüfte nach hinten', 'Hüfte strecken, Hantel schwingt'],
    pace: 0.9,
  },
  'kh-halo': {
    view: 'vorne',
    segments: FRONT,
    head: 'head',
    db: ['hd'],
    props: ['boden'],
    frames: [
      { ...standFront, elL: [80, 64], elR: [120, 64], haL: [96, 58], haR: [104, 58], hd: [100, 58] },
      { ...standFront, elL: [70, 46], elR: [98, 52], haL: [80, 30], haR: [86, 30], hd: [83, 30] },
      { ...standFront, elL: [80, 28], elR: [120, 28], haL: [96, 14], haR: [104, 14], hd: [100, 14] },
      { ...standFront, elL: [102, 52], elR: [130, 46], haL: [114, 30], haR: [120, 30], hd: [117, 30] },
    ],
    captions: ['Vor der Brust', 'Am Ohr vorbei', 'Hinter dem Kopf', 'Andere Seite zurück'],
    pace: 0.9,
  },
}
