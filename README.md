# The Gung

## Status badges

[![Deploy Readiness](https://github.com/noah-klaholz/the-gung/actions/workflows/deploy-readiness.yml/badge.svg?branch=main)](https://github.com/noah-klaholz/the-gung/actions/workflows/deploy-readiness.yml)
[![Deploy On Green CI](https://github.com/noah-klaholz/the-gung/actions/workflows/deploy-on-green.yml/badge.svg?branch=main)](https://github.com/noah-klaholz/the-gung/actions/workflows/deploy-on-green.yml)
[![Post-Merge Smoke](https://github.com/noah-klaholz/the-gung/actions/workflows/post-merge-smoke.yml/badge.svg?branch=main)](https://github.com/noah-klaholz/the-gung/actions/workflows/post-merge-smoke.yml)

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

Target architecture:

- Backend (`apps/server`) on Render Web Service (free plan)
- Frontend (`apps/web`) on Vercel (Hobby)

This repo now includes deployment config files:

- `render.yaml` (backend service definition)
- `vercel.json` (frontend build/install commands from monorepo)

### Workflow (GitHub + Vercel + Render)

#### 1) What this repo now does

This repo includes three GitHub Actions workflows:

- `.github/workflows/deploy-readiness.yml`
   - Runs on every push to `main`
   - Executes: `npm ci`, `npm run lint` (advisory), `npm run build --workspace=server`, `npm run build --workspace=web`
   - If a build fails, this workflow fails

- `.github/workflows/deploy-on-green.yml`
   - Runs after `Deploy Readiness`
   - Triggers Render and Vercel deploy hooks only when `Deploy Readiness` succeeded on `main`

- `.github/workflows/post-merge-smoke.yml`
   - Runs on every push to `main`
   - Optionally checks production frontend URL and backend `/healthz`
   - Skips cleanly when smoke-check variables are not configured yet

#### 2) GitHub setup (step by step)

1. Open repo **Settings → Secrets and variables → Actions → Secrets**
2. Add deploy hooks:
   - `RENDER_DEPLOY_HOOK_URL`
   - `VERCEL_DEPLOY_HOOK_URL`
3. Open **Settings → Secrets and variables → Actions → Variables**
4. Add optional smoke URLs:
   - `PROD_WEB_URL` (e.g. `https://the-gung.vercel.app`)
   - `PROD_SERVER_URL` (e.g. `https://the-gung-server.onrender.com`)

#### 3) Render setup (step by step)

1. Open your Render service
2. Disable auto deploy on Git push (`main`) so GitHub Actions is the gate
3. Create a **Deploy Hook** in Render and copy the URL
4. Save it as GitHub secret `RENDER_DEPLOY_HOOK_URL`

#### 4) Vercel setup (step by step)

1. Open your Vercel project
2. Disable automatic production deploys from Git push
3. Create a **Deploy Hook** (Production) and copy the URL
4. Save it as GitHub secret `VERCEL_DEPLOY_HOOK_URL`

#### 5) Resulting flow

1. Push to `main`
2. `Deploy Readiness` runs builds
3. If builds pass, `Deploy On Green CI` triggers Render/Vercel deploys
4. If builds fail, deploy hooks are not called and production stays unchanged

#### Public repo safety

- Never commit real `.env` files.
- Keep secrets only in Render/Vercel dashboard environment settings.
- `render.yaml` and `vercel.json` in this repo are secret-free and safe to publish.

#### 1) Prepare lockfile + verify builds

From repo root:

```bash
npm install
npm run build --workspace=server
npm run build --workspace=web
```

This updates and syncs `package-lock.json` with the root `package.json` and workspace manifests.

#### 2) Deploy backend to Render

1. Push this repo to GitHub.
2. In Render: **New +** → **Blueprint** and select this repo (uses `render.yaml`).
3. In the created `the-gung-server` service, set environment variable:
   - `CORS_ORIGIN=https://<your-vercel-production-domain>`
4. Deploy.
5. Copy backend URL, e.g. `https://the-gung-server.onrender.com`.

Notes:

- Render provides `PORT` automatically.
- Health check uses `GET /healthz`.

#### 3) Deploy frontend to Vercel

1. In Vercel: **Add New Project** → import this repo.
2. Keep project root at repository root (the included `vercel.json` runs web workspace build).
3. Add environment variable:
   - `NEXT_PUBLIC_SOCKET_URL=https://<your-render-backend-domain>`
4. Deploy.
5. Copy frontend production URL, e.g. `https://the-gung.vercel.app`.

#### 4) Final CORS wiring

1. Go back to Render service env vars.
2. Ensure `CORS_ORIGIN` equals your final Vercel production URL.
3. Trigger redeploy/restart of backend.

#### 5) Optional local production check

From repo root:

```bash
npm run build
npm run start:server
npm run start:web
```

#### Environment variables summary

- Server (`apps/server`):
  - `CORS_ORIGIN=https://<your-vercel-production-domain>`
  - `PORT` (auto on Render)
  - optional local-only `SERVER_PORT=9000`

- Web (`apps/web`):
  - `NEXT_PUBLIC_SOCKET_URL=https://<your-render-backend-domain>`

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
