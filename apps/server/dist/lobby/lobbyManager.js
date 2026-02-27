import { v4 as uuid } from "uuid";
const generateJoinCode = (length = 6) => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};
export class LobbyManager {
    constructor() {
        this.lobbiesById = new Map();
        this.lobbiesByCode = new Map();
    }
    createLobby(hostName, socketId, playerId) {
        const lobbyId = uuid();
        // Ensure unique join code
        let joinCode;
        do {
            joinCode = generateJoinCode();
        } while (this.lobbiesByCode.has(joinCode));
        const host = {
            id: playerId,
            name: hostName,
            socketId,
            ready: false,
        };
        const lobby = {
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
    joinLobby(joinCode, playerName, socketId, playerId) {
        const lobby = this.lobbiesByCode.get(joinCode);
        if (!lobby)
            return null;
        const existingPlayer = lobby.players.get(playerId);
        if (existingPlayer) {
            existingPlayer.socketId = socketId;
            if (playerName?.trim()) {
                existingPlayer.name = playerName.trim();
            }
            return { lobbyId: lobby.id, joinCode, playerId };
        }
        lobby.players.set(playerId, {
            id: playerId,
            name: playerName,
            socketId,
            ready: false,
        });
        return { lobbyId: lobby.id, joinCode, playerId };
    }
    leaveLobby(joinCode, playerId) {
        const lobby = this.lobbiesByCode.get(joinCode);
        if (!lobby)
            return null;
        const player = lobby.players.get(playerId);
        if (!player)
            return null;
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
    handleDisconnect(socketId) {
        const disconnectedPlayers = [];
        for (const lobby of this.lobbiesById.values()) {
            for (const player of lobby.players.values()) {
                if (player.socketId === socketId) {
                    disconnectedPlayers.push({
                        joinCode: lobby.joinCode,
                        playerId: player.id,
                        playerName: player.name,
                    });
                    player.socketId = undefined;
                    player.ready = false; // optional safety
                }
            }
        }
        return disconnectedPlayers;
    }
    reconnectPlayerByCode(joinCode, playerId, socketId) {
        const lobby = this.lobbiesByCode.get(joinCode);
        if (!lobby)
            return false;
        const player = lobby.players.get(playerId);
        if (!player)
            return false;
        player.socketId = socketId;
        return true;
    }
    setPlayerReady(joinCode, playerId) {
        const lobby = this.lobbiesByCode.get(joinCode);
        if (!lobby)
            return false;
        const player = lobby.players.get(playerId);
        if (!player)
            return false;
        player.ready = !player.ready;
        return true;
    }
    getLobby(lobbyId) {
        return this.lobbiesById.get(lobbyId);
    }
    getLobbyByCode(joinCode) {
        return this.lobbiesByCode.get(joinCode);
    }
    findLobbyByPlayerId(playerId) {
        for (const lobby of this.lobbiesById.values()) {
            if (lobby.players.has(playerId)) {
                return lobby;
            }
        }
        return null;
    }
    removeSocket(socketId) {
        for (const lobby of this.lobbiesById.values()) {
            for (const player of lobby.players.values()) {
                if (player.socketId === socketId) {
                    player.socketId = undefined;
                }
            }
        }
    }
}
