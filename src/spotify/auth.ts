import { readLocalRaw, removeLocal, writeLocal } from '../storage/localPrefs'

/*
 * Spotify-Anmeldung mit Authorization Code Flow + PKCE
 * (https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow).
 * Es gibt kein Client Secret im Frontend. Client-ID und Tokens liegen nur im localStorage
 * dieses Geräts und sind nie Teil des JSON-Exports.
 */

const CLIENT_ID_KEY = 'ms.spotify.clientId'
const TOKEN_KEY = 'ms.spotify.token'
const VERIFIER_KEY = 'ms.spotify.verifier'
const STATE_KEY = 'ms.spotify.state'

export const SPOTIFY_SCOPES = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-private',
  'user-read-playback-state',
  'user-modify-playback-state',
]

interface StoredToken {
  accessToken: string
  refreshToken?: string
  expiresAt: number
  scope: string
}

export function getClientId(): string {
  return readLocalRaw(CLIENT_ID_KEY) ?? ''
}

export function setClientId(id: string): void {
  if (id.trim()) writeLocal(CLIENT_ID_KEY, id.trim())
  else removeLocal(CLIENT_ID_KEY)
}

/** Muss exakt so im Spotify-Dashboard als Redirect-URI eingetragen sein. */
export function redirectUri(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`
}

export function redirectProblem(): string | undefined {
  const { protocol, hostname } = window.location
  if (hostname === 'localhost') return 'Spotify erlaubt „localhost“ nicht als Redirect. Bitte die App über http://127.0.0.1:5173 öffnen.'
  if (protocol !== 'https:' && hostname !== '127.0.0.1' && hostname !== '[::1]') return 'Spotify verlangt HTTPS (außer bei 127.0.0.1). Für das iPhone die veröffentlichte HTTPS-Adresse verwenden.'
  return undefined
}

function readToken(): StoredToken | undefined {
  const raw = readLocalRaw(TOKEN_KEY)
  if (!raw) return undefined
  try {
    return JSON.parse(raw) as StoredToken
  } catch {
    return undefined
  }
}

function saveToken(t: { access_token: string; refresh_token?: string; expires_in: number; scope?: string }, previous?: StoredToken) {
  const token: StoredToken = {
    accessToken: t.access_token,
    // Die Antwort enthält nicht immer ein neues Refresh-Token, dann gilt das bisherige weiter
    refreshToken: t.refresh_token ?? previous?.refreshToken,
    expiresAt: Date.now() + (t.expires_in - 60) * 1000,
    scope: t.scope ?? previous?.scope ?? '',
  }
  writeLocal(TOKEN_KEY, token)
}

export function isConnected(): boolean {
  return !!readToken()
}

export function logout(): void {
  removeLocal(TOKEN_KEY)
}

function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

export async function login(): Promise<void> {
  const clientId = getClientId()
  if (!clientId) throw new Error('Keine Client-ID hinterlegt.')
  const verifier = randomString(64)
  const state = randomString(16)
  writeLocal(VERIFIER_KEY, verifier)
  writeLocal(STATE_KEY, state)
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri(),
    code_challenge_method: 'S256',
    code_challenge: await challengeFor(verifier),
    state,
    scope: SPOTIFY_SCOPES.join(' '),
  })
  window.location.assign(`https://accounts.spotify.com/authorize?${params}`)
}

let callbackOnce: Promise<{ handled: boolean; error?: string }> | undefined

/** Nach der Rückleitung von Spotify: Code gegen Token tauschen. Läuft pro Seitenaufruf nur einmal. */
export function handleCallback(): Promise<{ handled: boolean; error?: string }> {
  callbackOnce ??= processCallback()
  return callbackOnce
}

async function processCallback(): Promise<{ handled: boolean; error?: string }> {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const error = params.get('error')
  const state = params.get('state')
  if (!code && !error) return { handled: false }
  const clean = () => window.history.replaceState(null, '', `${import.meta.env.BASE_URL}#/spotify`)
  if (error) {
    clean()
    return { handled: true, error: error === 'access_denied' ? 'Anmeldung bei Spotify abgebrochen.' : `Spotify meldet: ${error}` }
  }
  const expected = readLocalRaw(STATE_KEY)
  const verifier = readLocalRaw(VERIFIER_KEY)
  removeLocal(STATE_KEY)
  removeLocal(VERIFIER_KEY)
  if (!state || state !== expected || !verifier) {
    clean()
    return { handled: true, error: 'Die Spotify-Antwort passt nicht zur Anmeldung (state). Bitte erneut verbinden.' }
  }
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code!,
      redirect_uri: redirectUri(),
      client_id: getClientId(),
      code_verifier: verifier,
    }),
  })
  clean()
  if (!res.ok) return { handled: true, error: `Token-Anfrage fehlgeschlagen (${res.status}).` }
  saveToken(await res.json())
  return { handled: true }
}

export async function getAccessToken(): Promise<string | undefined> {
  const token = readToken()
  if (!token) return undefined
  if (Date.now() < token.expiresAt) return token.accessToken
  if (!token.refreshToken) return undefined
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: token.refreshToken, client_id: getClientId() }),
  })
  if (!res.ok) {
    logout()
    return undefined
  }
  saveToken(await res.json(), token)
  return readToken()?.accessToken
}
