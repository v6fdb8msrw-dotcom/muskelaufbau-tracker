# Muscle Studio

Persönliche Web-App für 16 Wochen Muskelaufbau: Trainingsplan und Kalender, Übungsanleitungen, Tagesprotokoll, Wochenkorrektur, Kalorien- und Nährstofftracking, 100 Rezepte, Wochenplan, Einkaufsliste mit Budget, Trinktracker, Supplements, Gewicht, Kraft und Links-rechts-Balance der Arme. Optional mit Spotify.

React · TypeScript · Vite · IndexedDB · installierbare PWA (Mac und iPhone). Alle persönlichen Daten bleiben lokal auf dem jeweiligen Gerät.

---

## 1. Lokal starten (Mac)

Voraussetzung: Node.js 24 und npm (sind installiert).

```bash
cd ~/muskelaufbau-tracker
npm install
npm run dev
```

Dann im Browser **http://127.0.0.1:5173** öffnen. Bitte `127.0.0.1` statt `localhost` verwenden, denn Spotify akzeptiert `localhost` nicht als Rückleitungsadresse.

Weitere Befehle:

| Befehl | Zweck |
|---|---|
| `npm run build` | Typprüfung und Produktions-Build nach `dist/` |
| `npm run preview` | Build lokal ansehen unter http://127.0.0.1:4173, inklusive Service Worker und Offline-Modus |
| `npm test` | 41 automatische Tests (Rezepte, Ausschlüsse, Nährwerte, Einkauf, Budget, Training, Gewicht, Speicher, Backup) |
| `npm run lint` | Code-Prüfung mit oxlint |
| `npm run icons` | App-Icons aus `public/logo.svg` neu erzeugen |

### Auf dem Mac installieren

- **Safari** (macOS 14 oder neuer): App öffnen → Menü *Ablage* → *Zum Dock hinzufügen*.
- **Chrome**: Installieren-Symbol rechts in der Adressleiste.

Für den Alltag am besten die Vorschau (`npm run build && npm run preview`) oder später die veröffentlichte Adresse installieren. Dann funktioniert die App auch offline.

## 2. Persönliche Startwerte

Deine Startwerte (Alter, Größe, Startgewicht, Kalorien- und Makroziele, Budget, Spaßgetränke, Musikprofil) liegen in `src/data/personal.local.json`. Diese Datei steht in `.gitignore` und landet weder auf GitHub noch in der veröffentlichten App. So bleibt der öffentlich sichtbare Quellcode frei von persönlichen Daten.

- Auf dem Mac (lokaler Start oder Build) sind die Werte automatisch vorausgefüllt.
- In der veröffentlichten Version (z. B. auf dem iPhone) stehen zunächst neutrale Platzhalter. Die App weist darauf hin. Am einfachsten importierst du dort ein Backup vom Mac, dann werden die Einstellungen übernommen.
- Vorlage für eine neue Datei: `src/data/personal.example.json`.

Alles lässt sich jederzeit unter *Einstellungen* ändern.

## 3. iPhone-Installation

Auf dem iPhone lässt sich eine PWA nur über eine **HTTPS-Adresse** richtig installieren (mit Offline-Modus). Dafür ist die Veröffentlichung auf GitHub Pages vorbereitet. **Es wurde noch nichts hochgeladen oder veröffentlicht.**

### Veröffentlichen mit GitHub Pages (wenn du das möchtest)

1. Auf GitHub ein Repository `muskelaufbau-tracker` anlegen.
2. Lokal verbinden und hochladen, zum Beispiel mit GitHub Desktop (*Add Existing Repository* → diesen Ordner → *Publish*).
3. Auf GitHub: *Settings → Pages → Build and deployment → Source: GitHub Actions*.
4. Der Workflow `.github/workflows/deploy.yml` testet, baut und veröffentlicht bei jedem Push auf `main`.
5. Danach ist die App erreichbar unter
   **`https://<dein-github-name>.github.io/muskelaufbau-tracker/`**

Hinweis: Bei kostenlosen GitHub-Konten funktioniert Pages nur für **öffentliche** Repositories. Der Code enthält keine persönlichen Daten (siehe Abschnitt 2), deine Einträge liegen ohnehin nur auf deinen Geräten.

### Auf dem iPhone hinzufügen

1. Die Pages-Adresse in **Safari** öffnen.
2. **Teilen** → **Zum Home-Bildschirm** → *Hinzufügen*.
3. Die App startet danach im Vollbild wie eine normale App und funktioniert auch offline.

### Nur kurz im WLAN ausprobieren (ohne Veröffentlichung)

```bash
npm run build
npx vite preview --host
```

Dann auf dem iPhone `http://<IP-deines-Macs>:4173` öffnen (die IP steht in der Terminal-Ausgabe). Das reicht zum Ansehen. Ohne HTTPS gibt es aber keinen Offline-Modus, und die Daten liegen in Safari statt in einer installierten App.

## 4. Daten zwischen Mac und iPhone übertragen

Mac und iPhone haben **getrennte** Datenbestände. Es gibt **keine** automatische Synchronisierung.

1. Auf dem Quellgerät: *Einstellungen → Daten & Backup → Backup exportieren* (JSON-Datei).
2. Datei per AirDrop, iCloud Drive oder Mail auf das andere Gerät bringen.
3. Dort: *Backup importieren* → **Zusammenführen** (ergänzt, überspringt Doppelte) oder **Alles ersetzen**.

Der Export enthält keine Spotify-Zugangsdaten. Empfehlung: etwa einmal pro Woche sichern. Das Datum des letzten Backups steht in der Übersicht.

## 5. Spotify (optional)

Ohne Einrichtung kannst du Links zu deinen Playlists speichern und mit einem Tipp öffnen. Für Playlist-Liste und Playlist-Builder brauchst du eine eigene Spotify-App (kostenlos, einmalig). Anleitung: [docs/SPOTIFY.md](docs/SPOTIFY.md). Die übrige App funktioniert auch ohne Spotify.

## 6. Wichtige Hinweise zu den Daten

- **Nährwerte** sind gerundete Durchschnittswerte aus Nährwerttabellen (angelehnt an USDA FoodData Central und übliche deutsche Etiketten), berechnet aus den Zutatenmengen. Es sind Schätzwerte, keine Laborwerte. Fehlende Werte werden nie als 0 gezählt, sondern als „≥“ (Untergrenze) bzw. „keine Daten“ angezeigt.
- **Referenzwerte**: DGE/ÖGE für Männer von 19 bis unter 25 Jahren, abgeglichen am 12.10.2026 mit den DGE-Einzelseiten (3. Auflage 2025). Zum Beispiel Jod 150 µg, Vitamin E 8 mg, Magnesium 350 mg, Phosphor 550 mg.
- **Preise** sind grobe Schätzungen pro Packung, keine aktuellen Supermarktpreise. Eigene Preise trägst du unter *Einstellungen → Preise & Packungen* ein.
- **Gekaufte Smoothies, Proteinpulver** und andere Produkte legst du mit den Werten vom Etikett an. Die App erfindet keine Produktwerte. Afri-Cola und Energy-Drink haben gekennzeichnete Schätzwerte, die du mit dem Etikett abgleichen solltest.
- Die App stellt keine Diagnosen und empfiehlt keine Nahrungsergänzungsmittel aufgrund geschätzter Werte. Ziele (z. B. Kalorien) ändern sich nie automatisch, nur nach deiner Bestätigung.

## 7. Projektstruktur

```
src/
  data/        Lebensmittel, 100 Rezepte, Übungen, Trainingsplan, DGE-Referenzwerte, Standardeinstellungen
  domain/      Reine Logik: Nährwerte, Ausschlüsse, Training, Gewicht, Einkauf, Wochenplan, Wochenkorrektur
  storage/     DataRepository (Interface), IndexedDBRepository, Backup/Import, localStorage-Helfer
  state/       React-Store, Aktionen, Router, Toasts
  components/  UI-Bausteine, Diagramme, Dialoge, App-Rahmen
  pages/       Die 14 Bereiche plus Trainings-Logger
  spotify/     PKCE-Anmeldung, Web-API-Aufrufe, Playlist-Builder
  styles/      Designsystem (Tokens, Layout, Komponenten, Seiten)
docs/          SYNC.md (spätere Synchronisierung), SPOTIFY.md
```

Technische Notiz zur späteren Mac-iPhone-Synchronisierung: [docs/SYNC.md](docs/SYNC.md).
