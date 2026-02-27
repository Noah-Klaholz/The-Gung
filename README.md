# The Gung

A local multiplayer implementation of **The Gang** (co-op poker with hidden information), consisting of:

- `apps/server`: Socket.IO server + game logic
- `apps/web`: Next.js frontend

The host starts the game locally and other devices on the same network can join.

## For players: host & play locally

### Requirements

- Node.js 20+
- npm 10+
- Devices on the same LAN/Wi-Fi

### 1) Install

```bash
npm install
```

### 2) Start

```bash
npm run dev
```

This starts both services at the same time:

- Web app on port `3000`
- Socket server on port `9000`

### 3) Connect

- Host opens `http://localhost:3000`
- Other players open `http://<HOST-IP>:3000` (e.g. `http://192.168.178.42:3000`)

> Note: The client connects automatically to `http://<current-hostname>:9000`, so port `9000` must be reachable in your local network.

### 4) Gameplay flow (short)

1. Enter names
2. Create a lobby or join via join code
3. Everyone clicks **Ready**
4. Host starts the game
5. In each phase, distribute chips (take from center, return own chip, take chip from another player)
6. Goal: 3 successful heists before 3 failed attempts

### Troubleshooting

- `EADDRINUSE` on port `9000`: another process is using the port, or start with `SERVER_PORT=<port>`.
- Other players cannot reach host: check host IP, allow `3000`/`9000` in firewall.
- Blank screen after reconnect: refresh browser once (rejoin uses persistent `deviceId`).

## For developers

### Project structure

```text
apps/
  server/   # Socket.IO events, lobby and game logic
  web/      # Next.js UI + socket.io-client
```

### Dev commands

- Whole project: `npm run dev`
- Server only: `npm run dev:server`
- Web only: `npm run dev:web`

### Deploy (free-tier friendly)

Recommended setup:

- `apps/web` on Vercel (Hobby)
- `apps/server` on a Socket-capable host (e.g. Render/Fly)

Why not all on Vercel: this project uses long-lived Socket.IO connections and in-memory lobby/game state. That is better served by a continuously running Node process.

#### Environment variables

- Server (`apps/server`):
   - `CORS_ORIGIN=https://<your-vercel-domain>`
   - optional `SERVER_PORT=9000` (local override)
   - `PORT` is provided by many hosts automatically

- Web (`apps/web`):
   - `NEXT_PUBLIC_SOCKET_URL=https://<your-backend-domain>`

#### URL bootstrapping order (when you don't know URLs yet)

1. Deploy backend first with temporary CORS value (or include your expected Vercel domain pattern).
2. Copy backend URL and set `NEXT_PUBLIC_SOCKET_URL` in Vercel.
3. Deploy frontend on Vercel.
4. Copy the final Vercel URL and update backend `CORS_ORIGIN`.
5. Redeploy backend (or restart service).

You can repeat steps 4-5 whenever your frontend domain changes (preview domains, custom domain, etc.).

### Important files

- `apps/server/src/socket/socketHandler.ts` – central event registration
- `apps/server/src/lobby/lobbyManager.ts` – lobby/ready/reconnect management
- `apps/server/src/game/gameLogic.ts` – heist phases, chip actions, showdown
- `apps/server/src/game/gameManager.ts` – active games per lobby
- `apps/web/app/page.tsx` – lobby flow in frontend
- `apps/web/app/components/Game.tsx` – in-game UI + chip actions

## Communication Protocol (Socket.IO)

Communication runs between `apps/web` (client) and `apps/server` (server).

**Directions**

- `c→s`: client to server
- `s→c`: server to client

### Handshake / Reconnect

Client sets on connect:

```ts
socket.auth = { deviceId: string };
```

If `deviceId` is known in a lobby, the server auto-joins that lobby and sends:

- `LOBBY_JOINED`
- `LOBBY_UPDATE`
- optional `GAME_UPDATE` (if lobby is already `playing`)

### Lobby Events

| Event           | Direction         | Payload                                                                                                               | Response / follow-up events                 | Purpose                                      |
| --------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------- |
| `CREATE_LOBBY`  | c→s               | `{ playerName: string, playerId: string }`                                                                            | `LOBBY_CREATED`, `LOBBY_UPDATE`             | Create a new lobby and join as host          |
| `JOIN_LOBBY`    | c→s               | `{ joinCode: string, playerName: string, playerId: string }`                                                          | `LOBBY_JOINED`, `LOBBY_UPDATE` or `ERROR`   | Join an existing lobby                       |
| `LEAVE_LOBBY`   | c→s               | `{ joinCode: string, playerId: string }`                                                                              | `LOBBY_LEFT`, `LOBBY_UPDATE` or `ERROR`     | Leave a lobby                                |
| `TOGGLE_READY`  | c→s               | `{ joinCode: string, playerId: string }`                                                                              | `LOBBY_UPDATE` or `ERROR`                   | Toggle ready status                          |
| `START_GAME`    | c→s               | `{ joinCode: string }`                                                                                                | `GAME_STARTED`, `GAME_UPDATE`               | Start game in lobby                          |
| `disconnect`    | c→s (automatic)   | –                                                                                                                     | –                                           | Socket disconnect marks player as offline    |
| `LOBBY_CREATED` | s→c               | `{ lobbyId: string, joinCode: string, playerId: string }`                                                             | –                                           | Create confirmation                          |
| `LOBBY_JOINED`  | s→c               | `{ lobbyId: string, joinCode: string, playerId: string }`                                                             | –                                           | Join/reconnect confirmation                  |
| `LOBBY_LEFT`    | s→c               | `{ lobbyId: string, joinCode: string }`                                                                               | –                                           | Leave confirmation                           |
| `LOBBY_UPDATE`  | s→c               | `{ players: Array<{ id: string; name: string; isHost: boolean; isReady: boolean }>, status: "waiting" \| "playing" }` | –                                           | Sync lobby state for all players             |
| `ERROR`         | s→c               | `{ message: string }`                                                                                                 | –                                           | Error feedback                               |

### Game Events

| Event                | Direction | Payload                                                            | Response / follow-up events                                                      | Purpose                                                     |
| -------------------- | --------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `REQUEST_GAME_STATE` | c→s       | `{ joinCode: string }`                                             | `GAME_UPDATE`                                                                   | Request current game state                                  |
| `CHIP_ACTION`        | c→s       | `{ joinCode: string, playerId: string, action: ChipAction }`       | `GAME_UPDATE`, optional `HEIST_RESULT`, optional `GAME_ENDED` or `ERROR`       | Chip interaction in current phase                           |
| `GAME_STARTED`       | s→c       | _(no payload)_                                                     | –                                                                               | Switch to in-game view                                      |
| `GAME_UPDATE`        | s→c       | `{ publicState: PublicState, privateState: PrivateState \| null }` | –                                                                               | Sync public + player-specific state                         |
| `HEIST_RESULT`       | s→c       | `HeistResult`                                                      | –                                                                               | Result of a completed heist                                 |
| `GAME_ENDED`         | s→c       | `{ won: boolean, successes: number, failures: number } \| null`    | –                                                                               | Campaign finished                                           |

`ChipAction`:

```ts
type ChipAction =
  | { type: "take_center"; star: number }
  | { type: "take_player"; fromPlayerId: string }
  | { type: "return_own" };
```

### Chat Events

| Event          | Direction | Payload                                                                                              | Response / follow-up events | Purpose                     |
| -------------- | --------- | ---------------------------------------------------------------------------------------------------- | --------------------------- | --------------------------- |
| `CHAT_MESSAGE` | c→s       | `{ joinCode?: string, lobbyId?: string, message: string, senderName?: string, playerName?: string }` | `CHAT_MESSAGE` (broadcast)  | Send chat message to lobby  |
| `CHAT_MESSAGE` | s→c       | `{ id: string, text: string, sender: string }`                                                       | –                           | Receive chat message        |

## Gameplay Expansion: Challenges & Specialists

### Core idea

Starting with the **2nd heist**, exactly **one extra card** is active and applies only to the next heist:

- Successful heist → **Challenge card** (makes it harder)
- Failed heist → **Specialist card** (makes it easier)

After that, the card goes back under the deck.

### Design goal

Cards intentionally modify one core parameter:

- Information
- Card distribution
- Communication
- Ranking rules
- Round structure
- Win condition

## Roadmap

### UX / Visuals

[X] **Skins for cards & table**
   - Multiple deck looks (classic, noir, neon)
   - Switchable table themes without gameplay changes
[] **Improve animations**
   - Card dealing, chip transfer, showdown reveal with better timing
   - Option for reduced animations (accessibility)
[] **UI/UX polish**
   - Better mobile view for lobby + in-game
   - Clearer phase status indicators
[] **Sound**
   - Music
   - Sound effects

### Gameplay: Challenges (harder)

1. **Fast Entry** – Pre-flop chip phase is skipped, start directly at flop
2. **Noise Sensors** – 1-star chips (rounds 1–3) cannot be passed on after being taken
3. **Motion Detectors** – Flop with J/Q/K: player with 1-star chip from round 1 draws a new hand
4. **Retina Scan** – Guess rank value of highest red chip before showdown, otherwise auto-loss
5. **Hasty Escape** – Orange round is skipped, after round 2 go directly to turn+river
6. **Vent Shaft** – Highest chips from rounds 1–3 become fixed once taken
7. **Laser Barriers** – Flop without J/Q/K: highest chip from round 1 draws a new hand
8. **Blackout** – Chips from previous round are removed at the start of each round
9. **Fingerprint Scan** – Guess hand type of highest red chip, otherwise auto-loss
10. **Surveillance Cameras** – 3 hole cards instead of 2, best hand from 3+5

### Gameplay: Specialists (helpful)

1. **Informant** – One hole card is deliberately revealed
2. **Driver** – One player states their hand rank (e.g. “Pair”)
3. **Backer** – Everyone states number of royal cards (J/Q/K)
4. **Mastermind** – Group chooses a rank, one player states count of that rank
5. **Hacker** – Draw one card, discard one card
6. **Coordinator** – Everyone passes one hole card to the left
7. **Jack** – Special card as `J` without suit (cannot contribute to flush)
8. **Number Genius** – Everyone states sum of card values (2–10, J/Q/K=10, A=11)
9. **Con Artist** – Shuffle all hole cards and redeal
10. **Bruiser** – Tiebreak advantage against equally ranked hands

### Suggested technical implementation in phases

1. **Introduce Rule Engine**
   - `modifier` interface per card (`onHeistStart`, `onRoundStart`, `beforeShowdown`, `afterChipAction`)
2. **Extend state**
   - Active modifier, source (`challenge`/`specialist`), remaining duration (=1 heist)
3. **Extend server protocol**
   - `MODIFIER_REVEALED`, modifier field in `GAME_UPDATE`
4. **Integrate UI**
   - Visible card + short text in HUD
5. **Local balancing + telemetry**
   - Success rate per modifier, common failure causes, tuning
