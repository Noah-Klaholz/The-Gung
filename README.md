# The Gung

This repository is our take on the beloved card game The Gang and is implemented as a local webserver that you can connect to from other devices.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.


## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Developer

### Communication Protocol

The frontend/web workspace communicates via socket.io client with the backend/server workspace. Here you find an overview over all commands and their parameters that are used in this communcation:

#### Lobby

**Note:** Direction means wether the frontend sends this to the server (c→s), bidirectionally (c→s/s→c) or vice versa (s→c).

| Command      | Parameters                                | Response                                 | Direction | Explanation                                                                                                           |
| ------------ | ----------------------------------------- | ---------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------- |
| CREATE_LOBBY | `{ playerName: string }`                  | `LOBBY_CREATED`, `LOBBY_UPDATE`          | c→s       | Creates a new lobby with the given player name, joins the player, emits lobby update to all in lobby.                 |
| JOIN_LOBBY   | `{ lobbyId: string, playerName: string }` | `LOBBY_JOINED`, `LOBBY_UPDATE` / `ERROR` | c→s       | Adds a player to an existing lobby. Emits updated lobby info. If lobby doesn’t exist, emits `ERROR`.                  |
| START_GAME   | `{ lobbyId: string }`                     | `GAME_STARTED`                           | c→s / s→c | Marks the lobby status as "playing" and emits `GAME_STARTED` to all players in the lobby.                             |
| disconnect   | (none)                                    | (none)                                   | c→s       | Triggered automatically on client disconnect. Removes socket from all associated lobbies.                             |
| LOBBY_UPDATE | (none)                                    | `{ players: [{id, name}], status }`      | s→c       | Sent whenever lobby state changes (player join, reconnect, etc.). Contains current players and status.                |
| ERROR        | `{ message: string }`                     | (none)                                   | s→c       | Sent whenever a command fails (e.g., lobby not found, reconnection fails). Provides a message describing the failure. |

#### Game
