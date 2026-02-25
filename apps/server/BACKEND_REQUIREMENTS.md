# Backend API Requirements for Frontend Features

The frontend application requires the backend to broadcast specific information via socket events to accurately display the UI. Please implement these features to ensure the frontend displays Host functionality.

## `LOBBY_UPDATE` Request

The frontend expects the `LOBBY_UPDATE` event payload to contain a list of `players` and ideally a `maxPlayers` property if the lobby size is meant to be dynamic.

To fully support the frontend features, the payload should look like this:
- `maxPlayers` (number, optional): The maximum number of players allowed in the current lobby. If not sent, the frontend will default to 6.
- `players` (array): A list of player objects containing:
  - `id` (string): The **socket ID** of the player. *Note: The frontend uses `socket.id` to identify which player in the list corresponds to the current user. E.g. `p.id === socket.id`.*
  - `name` (string): The display name of the player.
  - `isReady` (boolean): Whether the player has marked themselves as ready. 
  - `isHost` (boolean): Whether the player is the creator/host of the lobby.

## Missing Event Listeners
In order for the gameplay flow to work properly, the backend must listen to these events from clients:

1. **`TOGGLE_READY`**
   - The frontend will emit a `TOGGLE_READY` (or similar) event when the user clicks the "Ready" button. 
   - The backend needs to listen for this, flip the specific player's `isReady` flag in memory, and broadcast a new `LOBBY_UPDATE`.

2. **`START_GAME`**
   - The frontend shows a "Spiel Starten" button *exclusively* to the player with `isHost: true`.
   - This button is only enabled when all players have `isReady === true`.
   - When clicked, it should emit a `START_GAME` event to the backend. The backend should handle this and transition the lobby to the actual game state.
