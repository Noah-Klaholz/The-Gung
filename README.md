# The Gung

Lokale Multiplayer-Umsetzung von **The Gang** (Poker-Koop mit verdeckter Information), bestehend aus:

- `apps/server`: Socket.IO-Server + Spiellogik
- `apps/web`: Next.js-Frontend

Der Host startet das Spiel lokal und andere Geräte im selben Netzwerk können beitreten.

## Für Spieler: lokal hosten & spielen

### Voraussetzungen

- Node.js 20+
- npm 10+
- Geräte im selben LAN/WLAN

### 1) Installation

```bash
npm install
```

### 2) Starten

```bash
npm run dev
```

Das startet gleichzeitig:

- Web-App auf Port `3000`
- Socket-Server auf Port `9000`

### 3) Verbinden

- Host öffnet `http://localhost:3000`
- Mitspieler öffnen `http://<HOST-IP>:3000` (z.B. `http://192.168.178.42:3000`)

> Hinweis: Der Client verbindet sich automatisch zu `http://<aktueller-hostname>:9000`, daher muss Port `9000` im lokalen Netzwerk erreichbar sein.

### 4) Spielablauf (kurz)

1. Namen eingeben
2. Lobby erstellen oder per Join-Code beitreten
3. Alle auf **Ready**
4. Host startet das Spiel
5. In jeder Phase Chips verteilen (Center nehmen, Chip zurückgeben, Chip von Spieler nehmen)
6. Ziel: 3 erfolgreiche Überfälle vor 3 Fehlversuchen

### Troubleshooting

- `EADDRINUSE` auf Port `9000`: anderer Prozess blockiert Port oder mit `SERVER_PORT=<port>` starten.
- Mitspieler sehen Host nicht: Host-IP prüfen, Firewall für `3000`/`9000` freigeben.
- Leerer Screen nach Reconnect: Browser einmal neu laden (Rejoin läuft über persistente `deviceId`).

## Für Entwickler

### Projektstruktur

```text
apps/
  server/   # Socket.IO Events, Lobby- und Spiellogik
  web/      # Next.js UI + socket.io-client
```

### Dev-Kommandos

- Gesamtes Projekt: `npm run dev`
- Nur Server: `npm run dev:server`
- Nur Web: `npm run dev:web`

### Wichtige Dateien

- `apps/server/src/socket/socketHandler.ts` – zentrale Event-Registrierung
- `apps/server/src/lobby/lobbyManager.ts` – Lobby/Ready/Reconnect Verwaltung
- `apps/server/src/game/gameLogic.ts` – Heist-Phasen, Chip-Aktionen, Showdown
- `apps/server/src/game/gameManager.ts` – aktive Games pro Lobby
- `apps/web/app/page.tsx` – Lobby-Flow im Frontend
- `apps/web/app/components/Game.tsx` – Ingame-UI + CHIP-Aktionen

## Communication Protocol (Socket.IO)

Die Kommunikation läuft zwischen `apps/web` (Client) und `apps/server` (Server).

**Richtungen**

- `c→s`: client to server
- `s→c`: server to client

### Handshake / Reconnect

Client setzt beim Connect:

```ts
socket.auth = { deviceId: string };
```

Wenn `deviceId` in einer Lobby bekannt ist, joined der Server automatisch die Lobby und sendet:

- `LOBBY_JOINED`
- `LOBBY_UPDATE`
- optional `GAME_UPDATE` (falls Lobby schon `playing` ist)

### Lobby-Events

| Event           | Richtung          | Payload                                                                                                               | Antwort / Folgeevents                       | Zweck                                          |
| --------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------- |
| `CREATE_LOBBY`  | c→s               | `{ playerName: string, playerId: string }`                                                                            | `LOBBY_CREATED`, `LOBBY_UPDATE`             | Neue Lobby erstellen und Host beitreten        |
| `JOIN_LOBBY`    | c→s               | `{ joinCode: string, playerName: string, playerId: string }`                                                          | `LOBBY_JOINED`, `LOBBY_UPDATE` oder `ERROR` | Einer bestehenden Lobby beitreten              |
| `LEAVE_LOBBY`   | c→s               | `{ joinCode: string, playerId: string }`                                                                              | `LOBBY_LEFT`, `LOBBY_UPDATE` oder `ERROR`   | Lobby verlassen                                |
| `TOGGLE_READY`  | c→s               | `{ joinCode: string, playerId: string }`                                                                              | `LOBBY_UPDATE` oder `ERROR`                 | Ready-Status toggeln                           |
| `START_GAME`    | c→s               | `{ joinCode: string }`                                                                                                | `GAME_STARTED`, `GAME_UPDATE`               | Spiel in Lobby starten                         |
| `disconnect`    | c→s (automatisch) | –                                                                                                                     | –                                           | Socket-Disconnect markiert Spieler als offline |
| `LOBBY_CREATED` | s→c               | `{ lobbyId: string, joinCode: string, playerId: string }`                                                             | –                                           | Bestätigung Create                             |
| `LOBBY_JOINED`  | s→c               | `{ lobbyId: string, joinCode: string, playerId: string }`                                                             | –                                           | Bestätigung Join/Reconnect                     |
| `LOBBY_LEFT`    | s→c               | `{ lobbyId: string, joinCode: string }`                                                                               | –                                           | Bestätigung Leave                              |
| `LOBBY_UPDATE`  | s→c               | `{ players: Array<{ id: string; name: string; isHost: boolean; isReady: boolean }>, status: "waiting" \| "playing" }` | –                                           | Synchronisiert Lobbyzustand für alle           |
| `ERROR`         | s→c               | `{ message: string }`                                                                                                 | –                                           | Fehlerfeedback                                 |

### Game-Events

| Event                | Richtung | Payload                                                            | Antwort / Folgeevents                                                      | Zweck                                                     |
| -------------------- | -------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------- |
| `REQUEST_GAME_STATE` | c→s      | `{ joinCode: string }`                                             | `GAME_UPDATE`                                                              | Aktuellen Spielzustand anfordern                          |
| `CHIP_ACTION`        | c→s      | `{ joinCode: string, playerId: string, action: ChipAction }`       | `GAME_UPDATE`, optional `HEIST_RESULT`, optional `GAME_ENDED` oder `ERROR` | Chip-Interaktion in aktueller Phase                       |
| `GAME_STARTED`       | s→c      | _(kein Payload)_                                                   | –                                                                          | Wechsel in Ingame-Ansicht                                 |
| `GAME_UPDATE`        | s→c      | `{ publicState: PublicState, privateState: PrivateState \| null }` | –                                                                          | Synchronisiert öffentlichen + spielerspezifischen Zustand |
| `HEIST_RESULT`       | s→c      | `HeistResult`                                                      | –                                                                          | Ergebnis eines abgeschlossenen Überfalls                  |
| `GAME_ENDED`         | s→c      | `{ won: boolean, successes: number, failures: number } \| null`    | –                                                                          | Kampagne beendet                                          |

`ChipAction`:

```ts
type ChipAction =
  | { type: "take_center"; star: number }
  | { type: "take_player"; fromPlayerId: string }
  | { type: "return_own" };
```

### Chat-Events

| Event          | Richtung | Payload                                                                                              | Antwort / Folgeevents      | Zweck                     |
| -------------- | -------- | ---------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------- |
| `CHAT_MESSAGE` | c→s      | `{ joinCode?: string, lobbyId?: string, message: string, senderName?: string, playerName?: string }` | `CHAT_MESSAGE` (broadcast) | Chat-Nachricht an Lobby   |
| `CHAT_MESSAGE` | s→c      | `{ id: string, text: string, sender: string }`                                                       | –                          | Empfangene Chat-Nachricht |

## Gameplay-Erweiterung: Challenges & Spezialisten

### Grundidee

Ab dem **2. Überfall** ist immer genau **eine Zusatzkarte** aktiv und gilt nur für den nächsten Überfall:

- Erfolgreicher Überfall → **Challenge-Karte** (erschwert)
- Gescheiterter Überfall → **Spezialisten-Karte** (erleichtert)

Danach wandert die Karte wieder unter den Stapel.

### Design-Ziel

Die Karten verändern gezielt einen Kernparameter:

- Information
- Kartenverteilung
- Kommunikation
- Ranking-Regeln
- Rundenstruktur
- Siegbedingung

## Roadmap

### UX / Visuals

Status (Feb 2026):

- Lobby-Submenü für lokale Skins (Karten/Tisch) mit Persistenz im Browser
- Cinematic Showdown-Reveal mit sequenziertem Timing
- Ergebnis-Impact für Heist/Alarm (Badge, Icon-Animation, kurzer Screen-Flash)

1. **Skins für Karten & Tisch**
   - Mehrere Deck-Looks (klassisch, noir, neon)
   - Austauschbare Table-Themes ohne Gameplay-Änderung
2. **Animationen verbessern**
   - Karten-Deal, Chip-Transfer, Showdown-Reveal mit besserem Timing
   - Option für reduzierte Animationen (Accessibility)
3. **UI/UX Feinschliff**
   - Bessere Mobile-Ansicht für Lobby + Ingame
   - Klarere Status-Indikatoren je Phase
4. **Sound**

### Gameplay: Challenges (erschweren)

1. **Schnelleinstieg** – Pre-Flop-Chipphase entfällt, direkt Flop
2. **Geräuschsensoren** – 1-Stern-Chips (Runden 1–3) nach Aufnahme nicht weitergebbar
3. **Bewegungsmelder** – Flop mit J/Q/K: Spieler mit 1-Stern-Chip aus Runde 1 zieht neue Hand
4. **Netzhautscan** – Vor Showdown Rangwert des höchsten roten Chips raten, sonst Auto-Loss
5. **Überhastete Flucht** – Orange-Runde entfällt, nach Runde 2 direkt Turn+River
6. **Lüftungsschacht** – Höchste Chips aus Runden 1–3 werden nach Aufnahme fixiert
7. **Lichtschranken** – Flop ohne J/Q/K: höchster Chip aus Runde 1 zieht neue Hand
8. **Blackout** – Chips der vorherigen Runde werden zu Rundenbeginn entfernt
9. **Fingerabdruckscan** – Pokerhand-Typ des höchsten roten Chips raten, sonst Auto-Loss
10. **Überwachungskameras** – 3 Hole Cards statt 2, beste Hand aus 3+5

### Gameplay: Spezialisten (helfen)

1. **Informant** – Eine Handkarte wird gezielt gezeigt
2. **Fahrerin** – Ein Spieler nennt seinen Handrang (z.B. „Paar“)
3. **Geldgeber** – Alle nennen Anzahl royaler Karten (J/Q/K)
4. **Mastermind** – Gruppe wählt Rang, ein Spieler nennt Anzahl davon
5. **Hackerin** – Eine Karte ziehen, eine abwerfen
6. **Koordinator** – Alle geben eine Handkarte nach links
7. **Jack** – Spezialkarte als `J` ohne Farbe (nicht flush-fähig)
8. **Zahlengenie** – Alle nennen Summe ihrer Kartenwerte (2–10, J/Q/K=10, A=11)
9. **Trickbetrügerin** – Alle Hole Cards mischen und neu verteilen
10. **Muskelprotz** – Tiebreak-Vorteil gegen gleichrangige Hände

### Vorschlag für technische Umsetzung in Phasen

1. **Rule Engine einführen**
   - `modifier`-Interface pro Karte (`onHeistStart`, `onRoundStart`, `beforeShowdown`, `afterChipAction`)
2. **State erweitern**
   - Active modifier, source (`challenge`/`specialist`), remaining duration (=1 heist)
3. **Server-Protokoll ergänzen**
   - `MODIFIER_REVEALED`, Modifier-Feld in `GAME_UPDATE`
4. **UI integrieren**
   - Sichtbare Karte + Kurztext im HUD
5. **Balancing + Telemetrie lokal**
   - Erfolgsquote je Modifier, häufige Failure-Ursachen, Tuning
