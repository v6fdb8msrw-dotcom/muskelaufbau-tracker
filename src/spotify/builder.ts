import type { SpotifyTrack } from './api'

export type Mood = 'locker' | 'fokussiert' | 'energie' | 'maximal'

export interface BuilderInput {
  sessionLabel: string
  mood: Mood
  genres: string[]
  artists: string[]
  minutes: number
}

export const GENRES: { id: string; label: string; query: string }[] = [
  { id: 'hiphop', label: 'Hip-Hop', query: 'hip hop' },
  { id: 'deutschrap', label: 'Deutschrap', query: 'german hip hop' },
  { id: 'trap', label: 'Trap', query: 'trap' },
  { id: 'rnb', label: 'R&B', query: 'r&b' },
  { id: 'cloud', label: 'Cloud Rap', query: 'cloud rap' },
]

export const MOODS: { id: Mood; label: string; hint: string }[] = [
  { id: 'locker', label: 'Locker', hint: 'zusätzlich R&B-Titel' },
  { id: 'fokussiert', label: 'Fokussiert', hint: 'nur deine Künstler und Genres' },
  { id: 'energie', label: 'Energie', hint: 'zusätzlich Trap-Titel' },
  { id: 'maximal', label: 'Maximal', hint: 'mehr Trap, weniger R&B' },
]

/** Schreibweisen, unter denen Spotify Künstler führt. */
const ARTIST_ALIASES: Record<string, string> = { 'ty dolla sign': 'Ty Dolla $ign' }

/**
 * Suchanfragen für die Vorschläge. Spotify liefert seit 2024/2026 keine Audio-Merkmale
 * oder Empfehlungen mehr für neue Apps. Die Stimmung steuert deshalb nur, welche Genres
 * zusätzlich durchsucht werden. Das ist bewusst einfach gehalten und transparent.
 */
export function buildQueries(input: BuilderInput): string[] {
  const queries = input.artists.map((a) => `artist:"${(ARTIST_ALIASES[a.trim().toLowerCase()] ?? a).replace(/"/g, '')}"`)
  const genres = new Set(input.genres)
  if (input.mood === 'locker') genres.add('rnb')
  if (input.mood === 'energie' || input.mood === 'maximal') genres.add('trap')
  if (input.mood === 'maximal') genres.delete('rnb')
  for (const g of GENRES) if (genres.has(g.id)) queries.push(`genre:"${g.query}"`)
  return queries
}

/** Titel aus mehreren Suchen abwechselnd mischen, Doppelte entfernen und auf die Wunschdauer kürzen. */
export function assemble(lists: SpotifyTrack[][], minutes: number, exclude: Set<string> = new Set()): SpotifyTrack[] {
  const target = minutes * 60_000
  const seen = new Set(exclude)
  const out: SpotifyTrack[] = []
  let total = 0
  const max = Math.max(0, ...lists.map((l) => l.length))
  for (let i = 0; i < max && total < target; i++) {
    for (const list of lists) {
      const t = list[i]
      if (!t || seen.has(t.id)) continue
      seen.add(t.id)
      out.push(t)
      total += t.duration_ms
      if (total >= target) break
    }
  }
  return out
}

export function totalMinutes(tracks: SpotifyTrack[]): number {
  return Math.round(tracks.reduce((s, t) => s + t.duration_ms, 0) / 60_000)
}

export function playlistName(input: BuilderInput, date: string): string {
  return `Muscle Studio · ${input.sessionLabel} · ${date}`
}
