# Technische Notiz: spätere Synchronisierung Mac ↔ iPhone

Stand Version 1: **keine** Synchronisierung. Jedes Gerät speichert seine Daten in der eigenen IndexedDB (`muscle-studio`). Der Austausch läuft manuell über JSON-Export und -Import. Diese Notiz beschreibt, was sich ändern müsste, um Mac und iPhone später synchron zu betreiben. Nichts davon ist umgesetzt.

## Was schon vorbereitet ist

| Baustein | Datei | Nutzen für Sync |
|---|---|---|
| Datenzugriff nur über ein Interface | `src/storage/repository.ts` (`DataRepository`) | Ein zweites Backend lässt sich ergänzen, ohne Seiten oder Berechnungen zu ändern |
| Lokale Implementierung | `src/storage/indexeddb.ts` | Bleibt als Offline-Speicher erhalten |
| Eindeutige IDs (UUID) für alle Einträge | `src/lib/id.ts` | Keine ID-Kollisionen zwischen Geräten |
| `createdAt` / `updatedAt` an jedem Datensatz | `src/types.ts` | Grundlage für „neuester Stand gewinnt“ |
| Geräte-ID | `meta.deviceId` in der IndexedDB | Herkunft von Änderungen erkennbar |
| Zusammenführen mit Duplikaterkennung | `importBackup(..., 'merge')` in `src/storage/backup.ts` | Gleiche Regeln wie ein späterer Sync |
| Validierung eingehender Daten (zod) | `src/storage/backup.ts` | Kann für Server-Antworten wiederverwendet werden |
| Zustand in einem Store | `src/state/store.tsx` | Einziger Ort, an dem geschrieben wird, also ein guter Einstiegspunkt für Sync-Logik |

## Was ergänzt werden müsste

1. **Server oder Dienst**, zum Beispiel ein kleiner Node-Server auf dem Mac (Express oder Fastify mit SQLite) oder ein gehosteter Dienst. Er speichert pro Sammlung die Datensätze und liefert Änderungen seit einem Zeitstempel. Endpunkte etwa:
   - `GET /changes?since=<ISO>` → geänderte und gelöschte Datensätze aller Sammlungen
   - `POST /changes` → lokale Änderungen hochladen
2. **Erreichbarkeit vom iPhone**: Der Server muss außerhalb des WLANs erreichbar sein (etwa über ein privates VPN oder einen eigenen Tunnel) und **HTTPS** sprechen, weil die PWA unter HTTPS läuft. Gemischte Inhalte (HTTP-Aufrufe aus einer HTTPS-Seite) blockiert Safari.
3. **Anmeldung**: mindestens ein geheimes Token pro Gerät, besser ein richtiger Login. Das Token darf nicht im Quellcode stehen. Es gehört wie die Spotify-Daten nur in den lokalen Speicher und nicht in den Export.
4. **Löschungen**: Heute wird beim Löschen der Datensatz entfernt. Für einen Sync braucht es **Tombstones** (`deletedAt` statt echtem Löschen) oder ein Änderungsprotokoll, sonst tauchen gelöschte Einträge vom anderen Gerät wieder auf. Betroffen: `remove()` im Store und `DataRepository.remove`.
5. **`SyncedRepository`**: eine neue Implementierung von `DataRepository`, die lokal in IndexedDB schreibt (offline zuerst) und Änderungen in einer Warteschlange (`outbox`-Store) sammelt. Ein Hintergrundlauf (beim Start, bei `online`, alle paar Minuten) schickt die Warteschlange und holt fremde Änderungen ab.
6. **Konfliktregel**: pro Datensatz „neuester `updatedAt` gewinnt“. Für Einstellungen sollte man auf Feldebene zusammenführen, damit zum Beispiel ein Budget-Wechsel auf dem iPhone nicht die Trainingstage vom Mac überschreibt. Uhrzeitabweichungen zwischen Geräten lassen sich mit Serverzeit oder einem Versionszähler (Lamport-Uhr) vermeiden.
7. **Oberfläche**: Sync-Status (zuletzt synchronisiert, Anzahl ausstehender Änderungen, Fehler) in der Übersicht und unter *Einstellungen → Daten*, dazu ein Schalter zum Ein- und Ausschalten. Der aktuelle Hinweis „Keine automatische Synchronisierung“ wird dann ersetzt.
8. **Tests**: Sync-Szenarien mit zwei `fake-indexeddb`-Instanzen (gleichzeitige Änderung, Löschung, offline/online).

## Nicht nötig

- Keine Änderungen an `src/domain/` (Berechnungen arbeiten auf dem `DataSet` im Speicher).
- Keine Änderungen an den Seiten außer der Statusanzeige.
- Das Backup-Format (`format: 1`) bleibt als manueller Fallback erhalten.
