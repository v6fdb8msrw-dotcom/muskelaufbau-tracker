import { ArrowDown, ArrowUp, ExternalLink, Link2, LogOut, Music, Play, Plus, Search, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ConfirmButton } from '../components/ConfirmButton'
import { useToday } from '../components/hooks'
import { Card, CardHead, Field, Modal, Notice, PageHead, Seg } from '../components/ui'
import { SESSION_MAP, SESSIONS } from '../data/plan'
import { formatDateShort } from '../lib/date'
import { uid } from '../lib/id'
import { addItems, createPlaylist, getMe, getMyPlaylists, play, searchTracks, type SpotifyPlaylist, type SpotifyTrack, type SpotifyUser } from '../spotify/api'
import { getClientId, isConnected, login, logout, redirectProblem, redirectUri, setClientId } from '../spotify/auth'
import { assemble, buildQueries, GENRES, MOODS, playlistName, totalMinutes, type Mood } from '../spotify/builder'
import { useStore } from '../state/store'
import { useToast } from '../state/toast'
import type { SessionId } from '../types'

export default function Spotify() {
  const [clientId, setId] = useState(getClientId())
  const [connected, setConnected] = useState(isConnected())
  const [user, setUser] = useState<SpotifyUser>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!connected) return
    getMe()
      .then(setUser)
      .catch((e: Error) => {
        setError(e.message)
        setConnected(isConnected())
      })
  }, [connected])

  return (
    <div className="page">
      <PageHead
        eyebrow="Optional"
        title="Spotify & Training Music"
        lead="Playlists fürs Training öffnen und neue zusammenstellen. Spotify ist eine Zusatzfunktion: Alles andere in der App funktioniert auch ohne."
      />
      {error && (
        <div style={{ marginBottom: 18 }}>
          <Notice kind="warn">{error}</Notice>
        </div>
      )}
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="stack-lg">
          <SavedPlaylists />
          {!clientId ? (
            <SetupCard onSaved={(id) => setId(id)} />
          ) : (
            <Card index={1}>
              <CardHead eyebrow="Verbindung" title={connected ? `Verbunden${user?.display_name ? ` als ${user.display_name}` : ''}` : 'Nicht verbunden'} action={<Music size={18} color="var(--ink-3)" />} />
              {connected ? (
                <div className="row-wrap">
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => {
                      logout()
                      setConnected(false)
                      setUser(undefined)
                    }}
                  >
                    <LogOut size={15} /> Trennen
                  </button>
                  <span className="muted tiny">Tokens liegen nur im Browser-Speicher dieses Geräts und sind nicht im Backup enthalten.</span>
                </div>
              ) : (
                <div className="stack">
                  {redirectProblem() && <Notice kind="warn">{redirectProblem()}</Notice>}
                  <button type="button" className="btn btn-primary" disabled={!!redirectProblem()} onClick={() => login().catch((e: Error) => setError(e.message))}>
                    <Music size={16} /> Mit Spotify verbinden
                  </button>
                  <div className="muted tiny">
                    Redirect-URI für dein Spotify-Dashboard: <span className="code">{redirectUri()}</span>
                  </div>
                </div>
              )}
              <details className="disclosure" style={{ marginTop: 12 }}>
                <summary>
                  <span className="small">Client-ID ändern</span>
                </summary>
                <div className="row-wrap" style={{ paddingBottom: 10 }}>
                  <span className="code">{clientId}</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => {
                      setClientId('')
                      logout()
                      setId('')
                      setConnected(false)
                    }}
                  >
                    Entfernen
                  </button>
                </div>
              </details>
            </Card>
          )}
          {connected && <MyPlaylists />}
        </div>
        <div className="stack-lg">
          <MusicProfile />
          {connected ? (
            <Builder />
          ) : (
            <Card index={3}>
              <CardHead eyebrow="Playlist-Builder" title="Nach Verbindung verfügbar" />
              <div className="muted small">
                Mit verbundenem Konto stellt die App aus deinem Musikprofil, der Trainingsart, Stimmung, Genres und Wunschdauer eine Playlist zusammen. Du prüfst und bearbeitest die Vorschläge, und erst nach deiner Bestätigung wird eine private Playlist angelegt.
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function SetupCard({ onSaved }: { onSaved: (id: string) => void }) {
  const [value, setValue] = useState('')
  const problem = redirectProblem()
  return (
    <Card index={1} marble>
      <CardHead eyebrow="Einrichtung (einmalig)" title="Spotify verbinden" />
      <ol className="steps">
        <li>
          <span>
            Auf{' '}
            <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer">
              developer.spotify.com/dashboard
            </a>{' '}
            mit deinem Spotify-Konto anmelden und „Create app“ wählen.
          </span>
        </li>
        <li>
          <span>
            Bei <strong>Redirect URIs</strong> genau diese Adresse eintragen: <span className="code">{redirectUri()}</span>
            {' '}Später kommt die veröffentlichte Adresse für das iPhone dazu (siehe Anleitung).
          </span>
        </li>
        <li>
          <span>
            Bei den APIs <strong>Web API</strong> auswählen und speichern. Ein Client Secret brauchst du nicht, die App nutzt PKCE.
          </span>
        </li>
        <li>
          <span>Die <strong>Client ID</strong> kopieren und hier einfügen.</span>
        </li>
      </ol>
      <div className="row" style={{ marginTop: 16, alignItems: 'flex-end' }}>
        <div className="grow">
          <Field label="Client ID">
            <input className="input" value={value} onChange={(e) => setValue(e.target.value)} placeholder="32 Zeichen" />
          </Field>
        </div>
        <button
          type="button"
          className="btn btn-dark"
          disabled={value.trim().length < 20}
          onClick={() => {
            setClientId(value)
            onSaved(value.trim())
          }}
        >
          Speichern
        </button>
      </div>
      {problem && (
        <div style={{ marginTop: 12 }}>
          <Notice kind="warn">{problem}</Notice>
        </div>
      )}
      <div className="muted tiny" style={{ marginTop: 12 }}>
        Hinweis (Stand 2026): Apps im Development Mode brauchen ein Spotify-Premium-Konto beim App-Besitzer und sind auf 5 eingetragene Nutzer begrenzt. Die Client-ID bleibt nur auf diesem Gerät.
      </div>
    </Card>
  )
}

function SavedPlaylists() {
  const store = useStore()
  const { settings } = store
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [session, setSession] = useState<SessionId | ''>('')
  const valid = /^(https:\/\/open\.spotify\.com\/|spotify:)/.test(url.trim())

  async function add() {
    if (!valid || !name.trim()) return
    await store.updateSettings((s) => ({
      ...s,
      spotify: { ...s.spotify, savedPlaylists: [...s.spotify.savedPlaylists, { id: uid(), name: name.trim(), url: url.trim(), sessionId: session || undefined }] },
    }))
    setName('')
    setUrl('')
    setSession('')
    toast('Playlist gespeichert')
  }

  return (
    <Card index={0}>
      <CardHead eyebrow="Ohne Anmeldung" title="Deine Trainings-Playlists" action={<Link2 size={18} color="var(--ink-3)" />} />
      {settings.spotify.savedPlaylists.length === 0 ? (
        <div className="muted small" style={{ marginBottom: 12 }}>
          Füge Links zu deinen Playlists hinzu (in Spotify: Teilen → Link kopieren). Sie öffnen sich mit einem Tipp, auch auf dem iPhone in der Spotify-App.
        </div>
      ) : (
        <div className="list" style={{ marginBottom: 12 }}>
          {settings.spotify.savedPlaylists.map((p) => (
            <div className="list-item" key={p.id}>
              <span className="icon-tile dark">
                <Music size={16} />
              </span>
              <div className="grow">
                <div className="title">{p.name}</div>
                <div className="meta">{p.sessionId ? SESSION_MAP[p.sessionId].title : 'für jedes Training'}</div>
              </div>
              <a className="btn btn-sm btn-primary" href={p.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} /> Öffnen
              </a>
              <ConfirmButton
                onConfirm={() => store.updateSettings((s) => ({ ...s, spotify: { ...s.spotify, savedPlaylists: s.spotify.savedPlaylists.filter((x) => x.id !== p.id) } }))}
              />
            </div>
          ))}
        </div>
      )}
      <div className="form-grid">
        <Field label="Name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Push Day" />
        </Field>
        <Field label="Spotify-Link">
          <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://open.spotify.com/playlist/…" />
        </Field>
        <Field label="Für Einheit (optional)">
          <select className="select" value={session} onChange={(e) => setSession(e.target.value as SessionId | '')}>
            <option value="">jedes Training</option>
            {SESSIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <button type="button" className="btn btn-sm" style={{ marginTop: 12 }} disabled={!valid || !name.trim()} onClick={add}>
        <Plus size={15} /> Hinzufügen
      </button>
      {url && !valid && <div className="tiny warn-text">Bitte einen Link von open.spotify.com oder eine spotify:-Adresse einfügen.</div>}
    </Card>
  )
}

function MyPlaylists() {
  const store = useStore()
  const { toast } = useToast()
  const [list, setList] = useState<SpotifyPlaylist[]>()
  const [error, setError] = useState<string>()
  useEffect(() => {
    getMyPlaylists().then(setList).catch((e: Error) => setError(e.message))
  }, [])
  return (
    <Card index={2}>
      <CardHead eyebrow="Aus deinem Konto" title="Deine Playlists" />
      {error && <div className="small warn-text">{error}</div>}
      {!list && !error && <div className="muted small">Lade …</div>}
      {list && (
        <div className="list" style={{ maxHeight: 360, overflowY: 'auto' }}>
          {list.map((p) => (
            <div className="list-item" key={p.id}>
              {p.images?.[0] ? <img src={p.images[0].url} alt="" width={36} height={36} style={{ borderRadius: 8, objectFit: 'cover' }} /> : <span className="icon-tile"><Music size={16} /></span>}
              <div className="grow">
                <div className="title">{p.name}</div>
                <div className="meta">{p.owner.display_name ?? p.owner.id}</div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={async () => {
                  await store.updateSettings((s) => ({ ...s, spotify: { ...s.spotify, savedPlaylists: [...s.spotify.savedPlaylists, { id: uid(), name: p.name, url: p.external_urls.spotify }] } }))
                  toast('Zu den Trainings-Playlists hinzugefügt')
                }}
              >
                Merken
              </button>
              <a className="btn btn-sm" href={p.external_urls.spotify} target="_blank" rel="noopener noreferrer">
                Öffnen
              </a>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function MusicProfile() {
  const store = useStore()
  const { settings } = store
  const [artist, setArtist] = useState('')
  return (
    <Card index={2}>
      <CardHead eyebrow="Musikprofil" title={`${settings.spotify.artists.length} Künstler`} />
      <div className="row-wrap">
        {settings.spotify.artists.map((a) => (
          <span key={a} className="chip" style={{ paddingRight: 6 }}>
            {a}
            <button
              type="button"
              className="btn btn-ghost btn-icon sm"
              style={{ width: 22, minHeight: 22 }}
              aria-label={`${a} entfernen`}
              onClick={() => store.updateSettings((s) => ({ ...s, spotify: { ...s.spotify, artists: s.spotify.artists.filter((x) => x !== a) } }))}
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <input className="input" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Künstler hinzufügen" />
        <button
          type="button"
          className="btn"
          disabled={!artist.trim()}
          onClick={() => {
            store.updateSettings((s) => ({ ...s, spotify: { ...s.spotify, artists: [...new Set([...s.spotify.artists, artist.trim()])] } }))
            setArtist('')
          }}
        >
          <Plus size={15} />
        </button>
      </div>
    </Card>
  )
}

const BUILDER_SESSIONS: { id: string; label: string }[] = [...SESSIONS.map((s) => ({ id: s.id, label: s.short })), { id: 'core', label: 'Bauch & Core' }]

function Builder() {
  const store = useStore()
  const { settings } = store
  const { toast } = useToast()
  const today = useToday()
  const [session, setSession] = useState(BUILDER_SESSIONS[0].id)
  const [mood, setMood] = useState<Mood>('energie')
  const [genres, setGenres] = useState<string[]>(['hiphop', 'deutschrap'])
  const [artists, setArtists] = useState<string[]>(settings.spotify.artists)
  const [minutes, setMinutes] = useState<'30' | '45' | '60' | '75'>('60')
  const [tracks, setTracks] = useState<SpotifyTrack[]>([])
  const [pages, setPages] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SpotifyTrack[]>([])
  const [confirm, setConfirm] = useState(false)
  const [name, setName] = useState('')
  const [created, setCreated] = useState<SpotifyPlaylist>()
  const sessionLabel = BUILDER_SESSIONS.find((s) => s.id === session)!.label
  const input = { sessionLabel, mood, genres, artists, minutes: Number(minutes) }

  async function load(more = false) {
    setBusy(true)
    setError(undefined)
    try {
      const queries = buildQueries(input)
      const offset = more ? (pages + 1) * 10 : 0
      const lists: SpotifyTrack[][] = []
      for (const query of queries) lists.push(await searchTracks(query, offset))
      if (more) {
        const extra = assemble(lists, 30, new Set(tracks.map((t) => t.id)))
        setTracks([...tracks, ...extra])
        setPages(pages + 1)
      } else {
        setTracks(assemble(lists, Number(minutes)))
        setPages(0)
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function create() {
    setBusy(true)
    setError(undefined)
    try {
      const pl = await createPlaylist(name, `Erstellt mit Muscle Studio · ${sessionLabel} · ${MOODS.find((m) => m.id === mood)?.label}`)
      await addItems(pl.id, tracks.map((t) => t.uri))
      setCreated(pl)
      await store.updateSettings((s) => ({
        ...s,
        spotify: {
          ...s.spotify,
          savedPlaylists: [...s.spotify.savedPlaylists, { id: uid(), name: pl.name, url: pl.external_urls.spotify, sessionId: session === 'core' ? undefined : (session as SessionId) }],
        },
      }))
      toast('Private Playlist erstellt')
      setConfirm(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const move = (i: number, dir: -1 | 1) => {
    const next = [...tracks]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    setTracks(next)
  }

  return (
    <Card index={3}>
      <CardHead eyebrow="Playlist-Builder" title="Musik fürs Training" />
      <div className="stack">
        <div className="stack-sm">
          <span className="field-label">Training</span>
          <Seg value={session} onChange={setSession} options={BUILDER_SESSIONS.map((s) => ({ value: s.id, label: s.label }))} />
        </div>
        <div className="stack-sm">
          <span className="field-label">Stimmung</span>
          <Seg value={mood} onChange={setMood} options={MOODS.map((m) => ({ value: m.id, label: m.label }))} />
          <span className="muted tiny">{MOODS.find((m) => m.id === mood)?.hint}</span>
        </div>
        <div className="stack-sm">
          <span className="field-label">Genres</span>
          <div className="row-wrap">
            {GENRES.map((g) => (
              <button key={g.id} type="button" className="chip" aria-pressed={genres.includes(g.id)} onClick={() => setGenres(genres.includes(g.id) ? genres.filter((x) => x !== g.id) : [...genres, g.id])}>
                {g.label}
              </button>
            ))}
          </div>
        </div>
        <div className="stack-sm">
          <span className="field-label">Künstler</span>
          <div className="row-wrap">
            {settings.spotify.artists.map((a) => (
              <button key={a} type="button" className="chip" aria-pressed={artists.includes(a)} onClick={() => setArtists(artists.includes(a) ? artists.filter((x) => x !== a) : [...artists, a])}>
                {a}
              </button>
            ))}
          </div>
        </div>
        <div className="row-wrap">
          <span className="field-label">Dauer</span>
          <Seg value={minutes} onChange={setMinutes} options={['30', '45', '60', '75'].map((m) => ({ value: m as '30', label: `${m} min` }))} />
          <button type="button" className="btn btn-primary" disabled={busy || (!artists.length && !genres.length)} onClick={() => load(false)}>
            {busy ? 'Lade …' : 'Vorschläge laden'}
          </button>
        </div>
        {error && <Notice kind="warn">{error}</Notice>}

        {tracks.length > 0 && (
          <>
            <div className="row-between">
              <strong>
                {tracks.length} Titel · {totalMinutes(tracks)} min
              </strong>
              <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => load(true)}>
                Mehr Vorschläge
              </button>
            </div>
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              {tracks.map((t, i) => (
                <div className="track" key={t.id}>
                  {t.album.images.at(-1) ? <img src={t.album.images.at(-1)!.url} alt="" /> : <span className="cover" />}
                  <div style={{ minWidth: 0 }}>
                    <div className="track-title">{t.name}</div>
                    <div className="track-artist">
                      {t.artists.map((a) => a.name).join(', ')} · {Math.floor(t.duration_ms / 60000)}:{String(Math.round((t.duration_ms % 60000) / 1000)).padStart(2, '0')}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 0 }}>
                    <button type="button" className="btn btn-ghost btn-icon sm" onClick={() => move(i, -1)} aria-label="Nach oben">
                      <ArrowUp size={14} />
                    </button>
                    <button type="button" className="btn btn-ghost btn-icon sm" onClick={() => move(i, 1)} aria-label="Nach unten">
                      <ArrowDown size={14} />
                    </button>
                  </div>
                  <button type="button" className="btn btn-ghost btn-icon sm" onClick={() => setTracks(tracks.filter((x) => x.id !== t.id))} aria-label="Entfernen">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="row">
              <div className="input-group grow">
                <input
                  className="input"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Titel suchen und hinzufügen"
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && q.trim()) setResults(await searchTracks(q.trim()).catch(() => []))
                  }}
                />
                <span className="input-suffix">
                  <Search size={15} />
                </span>
              </div>
              <button type="button" className="btn" disabled={!q.trim()} onClick={async () => setResults(await searchTracks(q.trim()).catch(() => []))}>
                Suchen
              </button>
            </div>
            {results.length > 0 && (
              <div className="list">
                {results.map((t) => (
                  <div key={t.id} className="list-item">
                    <div className="grow">
                      <div className="title" style={{ fontSize: 13.5 }}>
                        {t.name}
                      </div>
                      <div className="meta">{t.artists.map((a) => a.name).join(', ')}</div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={tracks.some((x) => x.id === t.id)}
                      onClick={() => setTracks([...tracks, t])}
                    >
                      Hinzufügen
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              className="btn btn-dark"
              onClick={() => {
                setName(playlistName(input, formatDateShort(today)))
                setConfirm(true)
              }}
            >
              Private Playlist erstellen …
            </button>
          </>
        )}

        {created && (
          <div className="notice neon">
            <Music size={17} />
            <div className="grow stack-sm">
              <strong>{created.name}</strong>
              <div className="row-wrap">
                <a className="btn btn-sm btn-primary" href={created.external_urls.spotify} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={14} /> In Spotify öffnen
                </a>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => play(created.uri).catch((e: Error) => setError(`${e.message} (Abspielen braucht Premium und einen geöffneten Spotify-Player.)`))}
                >
                  <Play size={14} /> Abspielen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="muted tiny" style={{ marginTop: 12 }}>
        Spotify bietet neuen Apps keine Empfehlungen oder Audio-Merkmale mehr an. Die Vorschläge kommen deshalb aus der Suche nach deinen Künstlern und Genres. Pro Anfrage gibt es höchstens 10 Treffer.
      </div>

      {confirm && (
        <Modal
          title="Playlist erstellen?"
          onClose={() => setConfirm(false)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirm(false)}>
                Abbrechen
              </button>
              <button type="button" className="btn btn-primary" disabled={busy || !name.trim()} onClick={create}>
                {busy ? 'Erstelle …' : 'Ja, privat erstellen'}
              </button>
            </>
          }
        >
          <div className="stack">
            <Field label="Name">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="small">
              {tracks.length} Titel, {totalMinutes(tracks)} Minuten. Die Playlist wird in deinem Spotify-Konto als <strong>privat</strong> angelegt.
            </div>
          </div>
        </Modal>
      )}
    </Card>
  )
}
