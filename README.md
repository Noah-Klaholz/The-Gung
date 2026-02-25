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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Developer

### Communication Protocol

The frontend/web workspace communicates via socket.io client with the backend/server workspace. Here you find an overview over all commands and their parameters that are used in this communcation:

#### Lobby

| Command          | Parameters                                | Response                                 | Explanation                                                                                                                  |
| ---------------- | ----------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| CREATE_LOBBY     | `{ playerName: string }`                  | `LOBBY_CREATED`, `LOBBY_UPDATE`          | Creates a new lobby with the given player name, joins the player to it, and emits an updated lobby state.                    |
| JOIN_LOBBY       | `{ lobbyId: string, playerName: string }` | `LOBBY_JOINED`, `LOBBY_UPDATE` / `ERROR` | Adds a player to an existing lobby. Emits updated lobby info. If the lobby does not exist, emits an error.                   |
| RECONNECT_PLAYER | `{ lobbyId: string, playerId: string }`   | `LOBBY_UPDATE` / `ERROR`                 | Reconnects a player to a lobby using their previous player ID. Emits updated lobby state. Emits error if reconnection fails. |
| START_GAME       | `{ lobbyId: string }`                     | `GAME_STARTED`                           | Marks the lobby status as "playing" and emits a `GAME_STARTED` event to all players in the lobby.                            |
| disconnect       | (none)                                    | (none)                                   | Triggered when a client disconnects. Removes the socket from all associated lobbies via `lobbyManager.removeSocket()`.       |

#### Game
