import type { Settings } from '../types'

/**
 * Persönliche Startwerte (Profil, Ziele, Budget, Getränke, Musikprofil) liegen in
 * personal.local.json. Diese Datei ist per .gitignore vom Repository ausgeschlossen, damit
 * keine persönlichen Daten im öffentlich sichtbaren Quellcode oder in der veröffentlichten
 * App landen. Fehlt sie (z. B. beim Build auf GitHub), startet die App mit neutralen Werten
 * und bittet darum, das Profil auszufüllen oder ein Backup zu importieren.
 * Vorlage: personal.example.json
 */
export interface PersonalDefaults {
  profile?: Partial<Settings['profile']>
  targets?: Partial<Settings['targets']>
  budget?: Partial<Settings['budget']>
  funDrinks?: Settings['funDrinks']
  artists?: string[]
}

const files = import.meta.glob<PersonalDefaults>('./personal.local.json', { eager: true, import: 'default' })

export const PERSONAL: PersonalDefaults | undefined = Object.values(files)[0]
