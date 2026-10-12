# Spotify einrichten (optional)

Ohne Einrichtung funktionieren gespeicherte Playlist-Links: in Spotify *Teilen → Link kopieren* und unter *Spotify → Deine Trainings-Playlists* einfügen. Für die folgenden Funktionen brauchst du eine eigene Spotify-App:

- eigene Playlists aus dem Konto anzeigen
- Playlist-Builder (Vorschläge nach Training, Stimmung, Genres, Künstlern und Dauer)
- private Playlist nach Bestätigung anlegen
- Wiedergabe starten (nur mit Spotify Premium und geöffnetem Spotify-Player)

## Schritte

1. Auf **https://developer.spotify.com/dashboard** mit deinem Spotify-Konto anmelden und *Create app* wählen.
2. Name und Beschreibung frei wählen, z. B. „Muscle Studio“.
3. Unter **Redirect URIs** genau die Adressen eintragen, unter denen du die App öffnest:
   - lokal: `http://127.0.0.1:5173/` (Entwicklung) und `http://127.0.0.1:4173/` (Vorschau)
   - veröffentlicht: `https://<dein-github-name>.github.io/muskelaufbau-tracker/`

   Die App zeigt die passende Adresse auf der Spotify-Seite an. Sie muss exakt übereinstimmen, inklusive Schrägstrich am Ende. `localhost` ist bei Spotify nicht erlaubt, deshalb `127.0.0.1`.
4. Bei den APIs **Web API** auswählen und speichern.
5. Die **Client ID** kopieren und in der App unter *Spotify → Einrichtung* einfügen. Ein Client Secret wird **nicht** gebraucht und darf nicht in die App: Sie nutzt den Authorization Code Flow mit PKCE.
6. *Mit Spotify verbinden* tippen und den Zugriff erlauben.

## Gut zu wissen (Stand Oktober 2026)

- Apps im **Development Mode** brauchen ein Spotify-**Premium**-Konto beim App-Besitzer und sind auf wenige eingetragene Nutzer begrenzt. Für dich allein reicht das.
- Seit Februar 2026 gelten für solche Apps neue Endpunkte: Playlists anlegen über `POST /me/playlists`, Titel hinzufügen über `POST /playlists/{id}/items`. Die Suche liefert höchstens 10 Treffer pro Anfrage. Die App ist darauf ausgelegt.
- Empfehlungen und Audio-Merkmale (Tempo, Energie) bietet Spotify neuen Apps nicht mehr an. Der Playlist-Builder sucht deshalb nach deinen Künstlern und Genres. Die Stimmung bestimmt, welche Genres zusätzlich durchsucht werden. Alle Vorschläge kannst du vor dem Anlegen prüfen, sortieren, entfernen und ergänzen.
- Client-ID und Zugangstoken liegen nur im lokalen Speicher des jeweiligen Geräts und sind **nicht** Teil des JSON-Exports. Auf dem iPhone musst du dich deshalb separat verbinden.
- Benötigte Berechtigungen: `playlist-read-private`, `playlist-read-collaborative`, `playlist-modify-private`, `user-read-playback-state`, `user-modify-playback-state`.

Code: `src/spotify/auth.ts` (PKCE), `src/spotify/api.ts` (Web API), `src/spotify/builder.ts` (Vorschläge).
