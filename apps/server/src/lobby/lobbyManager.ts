import { v4 as uuid } from "uuid";

export interface Player {
  id: string;
  name: string;
  socketId?: string;
}

export interface Lobby {
  id: string;
  joinCode: string;
  players: Map<string, Player>;
  hostId: string;
  status: "waiting" | "playing";
}

const generateJoinCode = (length = 6) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
};

export class LobbyManager {
  private lobbiesById = new Map<string, Lobby>();
  private lobbiesByCode = new Map<string, Lobby>();

  createLobby(hostName: string, socketId: string) {
    const lobbyId = uuid();
    const playerId = uuid();

    // Ensure unique join code
    let joinCode: string;
    do {
      joinCode = generateJoinCode();
    } while (this.lobbiesByCode.has(joinCode));

    const host: Player = {
      id: playerId,
      name: hostName,
      socketId
    };

    const lobby: Lobby = {
      id: lobbyId,
      joinCode,
      players: new Map([[playerId, host]]),
      hostId: playerId,
      status: "waiting"
    };

    this.lobbiesById.set(lobbyId, lobby);
    this.lobbiesByCode.set(joinCode, lobby);

    return { lobbyId, joinCode, playerId };
  }

  joinLobby(joinCode: string, playerName: string, socketId: string) {
    const lobby = this.lobbiesByCode.get(joinCode);
    if (!lobby) return null;

    const playerId = uuid();

    lobby.players.set(playerId, {
      id: playerId,
      name: playerName,
      socketId
    });

    return { lobbyId: lobby.id, playerId };
  }

  reconnectPlayer(lobbyId: string, playerId: string, socketId: string) {
    const lobby = this.lobbiesById.get(lobbyId);
    if (!lobby) return false;

    const player = lobby.players.get(playerId);
    if (!player) return false;

    player.socketId = socketId;
    return true;
  }

  getLobby(lobbyId: string) {
    return this.lobbiesById.get(lobbyId);
  }

  removeSocket(socketId: string) {
    for (const lobby of this.lobbiesById.values()) {
      for (const player of lobby.players.values()) {
        if (player.socketId === socketId) {
          player.socketId = undefined;
        }
      }
    }
  }
}