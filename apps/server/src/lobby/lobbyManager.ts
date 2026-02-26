import { v4 as uuid } from "uuid";

export interface Player {
  id: string;
  name: string;
  socketId?: string;
  ready: boolean;
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

  createLobby(hostName: string, socketId: string, playerId: string) {
    const lobbyId = uuid();

    // Ensure unique join code
    let joinCode: string;
    do {
      joinCode = generateJoinCode();
    } while (this.lobbiesByCode.has(joinCode));

    const host: Player = {
      id: playerId,
      name: hostName,
      socketId,
      ready: false,
    };

    const lobby: Lobby = {
      id: lobbyId,
      joinCode,
      players: new Map([[playerId, host]]),
      hostId: playerId,
      status: "waiting",
    };

    this.lobbiesById.set(lobbyId, lobby);
    this.lobbiesByCode.set(joinCode, lobby);

    return { lobbyId, joinCode, playerId };
  }

  joinLobby(joinCode: string, playerName: string, socketId: string, playerId: string) {
    const lobby = this.lobbiesByCode.get(joinCode);
    if (!lobby) return null;

    lobby.players.set(playerId, {
      id: playerId,
      name: playerName,
      socketId,
      ready: false,
    });

    return { lobbyId: lobby.id, joinCode, playerId };
  }

  leaveLobby(joinCode: string, playerId: string) {
    const lobby = this.lobbiesByCode.get(joinCode);
    if (!lobby) return null;

    const player = lobby.players.get(playerId);
    if (!player) return null;

    lobby.players.delete(playerId);

    // If host leaves → assign new host
    if (lobby.hostId === playerId) {
      const nextPlayer = lobby.players.values().next().value;
      if (nextPlayer) {
        lobby.hostId = nextPlayer.id;
      }
    }

    // If no players left → delete lobby
    if (lobby.players.size === 0) {
      this.lobbiesById.delete(lobby.id);
      this.lobbiesByCode.delete(joinCode);
    }

    return { lobbyId: lobby.id, joinCode };
  }

  handleDisconnect(socketId: string) {
    for (const lobby of this.lobbiesById.values()) {
      for (const player of lobby.players.values()) {
        if (player.socketId === socketId) {
          player.socketId = undefined;
          player.ready = false; // optional safety
        }
      }
    }
  }

  // Don't think this works yet
  reconnectPlayerByCode(joinCode: string, playerId: string, socketId: string) {
    const lobby = this.lobbiesByCode.get(joinCode);
    if (!lobby) return false;

    const player = lobby.players.get(playerId);
    if (!player) return false;

    player.socketId = socketId;
    return true;
  }

  setPlayerReady(joinCode: string, playerId: string) {
    const lobby = this.lobbiesByCode.get(joinCode);
    if (!lobby) return false;

    const player = lobby.players.get(playerId);
    if (!player) return false;

    player.ready = !player.ready;
    return true;
  }

  getLobby(lobbyId: string) {
    return this.lobbiesById.get(lobbyId);
  }

  getLobbyByCode(joinCode: string) {
    return this.lobbiesByCode.get(joinCode);
  }

  findLobbyByPlayerId(playerId: string) {
    for (const lobby of this.lobbiesById.values()) {
      if (lobby.players.has(playerId)) {
        return lobby;
      }
    }
    return null;
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
