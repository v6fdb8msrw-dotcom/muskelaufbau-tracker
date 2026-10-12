import { getAccessToken, logout } from './auth'

/*
 * Spotify Web API (Stand Februar 2026 für Apps im Development Mode):
 * - Playlists anlegen: POST /me/playlists
 * - Titel hinzufügen: POST /playlists/{id}/items
 * - Suche: höchstens 10 Treffer pro Anfrage (Blättern mit offset)
 * Siehe docs/SPOTIFY.md.
 */

const API = 'https://api.spotify.com/v1'

export class SpotifyError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken()
  if (!token) throw new SpotifyError('Nicht mit Spotify verbunden.', 401)
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  if (res.status === 204) return undefined as T
  if (!res.ok) {
    let msg = `Spotify-Fehler ${res.status}`
    try {
      const body = await res.json()
      if (body?.error?.message) msg = body.error.message
      if (body?.error?.reason === 'QUOTA_EXCEEDED' || res.status === 429) msg = 'Zu viele Anfragen an Spotify. Bitte kurz warten und erneut versuchen.'
    } catch {
      /* kein JSON */
    }
    if (res.status === 401) logout()
    if (res.status === 403) msg += ' (Im Development Mode muss dein Spotify-Konto im Dashboard als Nutzer eingetragen sein, und der App-Besitzer braucht Premium.)'
    throw new SpotifyError(msg, res.status)
  }
  return (await res.json()) as T
}

export interface SpotifyUser {
  id: string
  display_name: string | null
}

export interface SpotifyPlaylist {
  id: string
  name: string
  description: string | null
  external_urls: { spotify: string }
  images: { url: string }[] | null
  owner: { id: string; display_name?: string }
  uri: string
}

export interface SpotifyTrack {
  id: string
  name: string
  uri: string
  duration_ms: number
  explicit: boolean
  artists: { id: string; name: string }[]
  album: { name: string; images: { url: string; width: number }[] }
  external_urls: { spotify: string }
}

export function getMe() {
  return call<SpotifyUser>('/me')
}

export async function getMyPlaylists(): Promise<SpotifyPlaylist[]> {
  const res = await call<{ items: SpotifyPlaylist[] }>('/me/playlists?limit=50')
  return res.items.filter(Boolean)
}

export async function searchTracks(q: string, offset = 0): Promise<SpotifyTrack[]> {
  const params = new URLSearchParams({ q, type: 'track', limit: '10', offset: String(offset) })
  const res = await call<{ tracks: { items: SpotifyTrack[] } }>(`/search?${params}`)
  return res.tracks.items.filter(Boolean)
}

export function createPlaylist(name: string, description: string) {
  return call<SpotifyPlaylist>('/me/playlists', {
    method: 'POST',
    body: JSON.stringify({ name, description, public: false }),
  })
}

export async function addItems(playlistId: string, uris: string[]) {
  for (let i = 0; i < uris.length; i += 100) {
    await call(`/playlists/${playlistId}/items`, { method: 'POST', body: JSON.stringify({ uris: uris.slice(i, i + 100) }) })
  }
}

/** Startet die Wiedergabe auf dem aktiven Gerät (Spotify Premium und ein geöffneter Spotify-Player nötig). */
export function play(contextUri: string) {
  return call('/me/player/play', { method: 'PUT', body: JSON.stringify({ context_uri: contextUri }) })
}
