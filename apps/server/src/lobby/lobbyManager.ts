import { v4 as uuid } from "uuid";

export interface Player {
  id: string;
  name: string;
  socketId?: string;
}

export interface Lobby {
  id: string;
  players: Map<string, Player>;
  hostId: string;
  status: "waiting" | "playing";
}

export class LobbyManager {
  private lobbies = new Map<string, Lobby>();

  createLobby(hostName: string, socketId: string) {
    const lobbyId = uuid();
    const playerId = uuid();

    const host: Player = {
      id: playerId,
      name: hostName,
      socketId
    };

    const lobby: Lobby = {
      id: lobbyId,
      players: new Map([[playerId, host]]),
      hostId: playerId,
      status: "waiting"
    };

    this.lobbies.set(lobbyId, lobby);

    return { lobbyId, playerId };
  }

  joinLobby(lobbyId: string, playerName: string, socketId: string) {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return null;

    const playerId = uuid();

    lobby.players.set(playerId, {
      id: playerId,
      name: playerName,
      socketId
    });

    return { playerId };
  }

  reconnectPlayer(lobbyId: string, playerId: string, socketId: string) {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return false;

    const player = lobby.players.get(playerId);
    if (!player) return false;

    player.socketId = socketId;
    return true;
  }

  getLobby(lobbyId: string) {
    return this.lobbies.get(lobbyId);
  }

  removeSocket(socketId: string) {
    for (const lobby of this.lobbies.values()) {
      for (const player of lobby.players.values()) {
        if (player.socketId === socketId) {
          player.socketId = undefined;
        }
      }
    }
  }
}