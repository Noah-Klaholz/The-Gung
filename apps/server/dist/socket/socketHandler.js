import { LobbyManager } from "../lobby/lobbyManager.js";
import { GameManager } from "../game/gameManager.js";
import { randomUUID } from "crypto";
const lobbyManager = new LobbyManager();
const gameManager = new GameManager();
export function setupSocketHandlers(io) {
    io.on("connection", (socket) => {
        console.log(" Connected:", socket.id);
        // Auto-reconnect if deviceId is provided
        const deviceId = socket.handshake.auth.deviceId;
        if (deviceId) {
            const lobby = lobbyManager.findLobbyByPlayerId(deviceId);
            if (lobby) {
                const player = lobby.players.get(deviceId);
                console.log(`Auto-reconnecting player ${deviceId} to lobby ${lobby.joinCode}`);
                lobbyManager.reconnectPlayerByCode(lobby.joinCode, deviceId, socket.id);
                socket.join(lobby.joinCode);
                socket.emit("LOBBY_JOINED", {
                    lobbyId: lobby.id,
                    joinCode: lobby.joinCode,
                    playerId: deviceId,
                    status: lobby.status,
                });
                emitLobbyUpdate(io, lobby.joinCode);
                if (player) {
                    emitSystemChat(io, lobby.joinCode, `${player.name} reconnected`);
                }
                if (lobby.status === "playing") {
                    socket.emit("GAME_STARTED");
                    emitGameUpdate(io, lobby.joinCode);
                }
            }
        }
        socket.on("CREATE_LOBBY", ({ playerName, playerId }) => {
            const normalizedPlayerName = typeof playerName === "string" ? playerName.trim() : "";
            const existingLobby = lobbyManager.findLobbyByPlayerId(playerId);
            if (existingLobby) {
                lobbyManager.leaveLobby(existingLobby.joinCode, playerId);
                socket.leave(existingLobby.joinCode);
                emitLobbyUpdate(io, existingLobby.joinCode);
            }
            const result = lobbyManager.createLobby(normalizedPlayerName || "Player", socket.id, playerId);
            socket.join(result.joinCode);
            const createdLobby = lobbyManager.getLobbyByCode(result.joinCode);
            socket.emit("LOBBY_CREATED", {
                ...result,
                status: createdLobby?.status ?? "waiting",
            });
            emitLobbyUpdate(io, result.joinCode);
            emitSystemChat(io, result.joinCode, `${normalizedPlayerName || "A player"} created the lobby`);
        });
        socket.on("JOIN_LOBBY", ({ joinCode, playerName, playerId }) => {
            const normalizedPlayerName = typeof playerName === "string" ? playerName.trim() : "";
            const result = lobbyManager.joinLobby(joinCode, normalizedPlayerName, socket.id, playerId);
            if (!result) {
                socket.emit("ERROR", { message: "Lobby not found" });
                return;
            }
            socket.join(result.joinCode);
            const joinedLobby = lobbyManager.getLobbyByCode(result.joinCode);
            socket.emit("LOBBY_JOINED", {
                ...result,
                status: joinedLobby?.status ?? "waiting",
            });
            emitLobbyUpdate(io, result.joinCode);
            emitSystemChat(io, result.joinCode, `${normalizedPlayerName || "A player"} joined the lobby`);
            if (joinedLobby?.status === "playing") {
                socket.emit("GAME_STARTED");
                emitGameUpdate(io, result.joinCode);
            }
        });
        socket.on("LEAVE_LOBBY", ({ joinCode, playerId }) => {
            const lobbyBeforeLeave = lobbyManager.getLobbyByCode(joinCode);
            const leavingPlayer = lobbyBeforeLeave?.players.get(playerId);
            const result = lobbyManager.leaveLobby(joinCode, playerId);
            if (!result) {
                socket.emit("ERROR", { message: "Lobby not found" });
                return;
            }
            if (leavingPlayer) {
                emitSystemChat(io, result.joinCode, `${leavingPlayer.name} left the lobby`);
            }
            socket.leave(result.joinCode);
            socket.emit("LOBBY_LEFT", result);
            emitLobbyUpdate(io, result.joinCode);
        });
        socket.on("START_GAME", ({ joinCode }) => {
            const lobby = lobbyManager.getLobbyByCode(joinCode);
            if (!lobby)
                return;
            lobby.status = "playing";
            gameManager.startGame(lobby);
            console.log("Starting game for lobby", joinCode);
            io.to(joinCode).emit("GAME_STARTED");
            emitSystemChat(io, joinCode, "Game started");
            emitGameUpdate(io, joinCode);
            // Send initial game state after a short delay (helps with sync issues) 
            setTimeout(() => emitGameUpdate(io, joinCode), 200);
        });
        socket.on("CHIP_ACTION", ({ joinCode, playerId, action }) => {
            const lobby = lobbyManager.getLobbyByCode(joinCode);
            if (!lobby) {
                socket.emit("ERROR", { message: "Lobby not found" });
                return;
            }
            const result = gameManager.applyChipAction(joinCode, playerId, action);
            if (!result.ok) {
                socket.emit("ERROR", { message: result.error ?? "Could not apply chip action" });
                return;
            }
            if (result.heistResolved) {
                io.to(joinCode).emit("HEIST_RESULT", result.heistResolved);
            }
            if (result.gameEnded) {
                const winnerState = gameManager.getGameResult(joinCode);
                io.to(joinCode).emit("GAME_ENDED", winnerState);
                lobby.status = "waiting";
                emitLobbyUpdate(io, joinCode);
            }
            emitGameUpdate(io, joinCode);
        });
        socket.on("TOGGLE_READY", ({ joinCode, playerId }) => {
            const success = lobbyManager.setPlayerReady(joinCode, playerId);
            if (!success) {
                socket.emit("ERROR", { message: "Could not make ready" });
                return;
            }
            emitLobbyUpdate(io, joinCode);
        });
        socket.on("disconnect", () => {
            console.log("Disconnected", socket.id);
            const disconnectedPlayers = lobbyManager.handleDisconnect(socket.id);
            disconnectedPlayers.forEach(({ joinCode, playerName }) => {
                emitSystemChat(io, joinCode, `${playerName} disconnected`);
                emitLobbyUpdate(io, joinCode);
            });
        });
        socket.on("CHAT_MESSAGE", ({ joinCode, lobbyId, message, senderName, playerName, playerId }) => {
            const targetJoinCode = joinCode ?? lobbyId;
            const trimmedMessage = typeof message === "string" ? message.trim() : "";
            if (!targetJoinCode || !trimmedMessage) {
                return;
            }
            const lobby = lobbyManager.getLobbyByCode(targetJoinCode);
            const lobbyPlayer = playerId && lobby ? lobby.players.get(playerId) : undefined;
            const sender = (typeof senderName === "string" ? senderName.trim() : "") ||
                (typeof playerName === "string" ? playerName.trim() : "") ||
                lobbyPlayer?.name ||
                "Unknown";
            emitChatUpdate(io, targetJoinCode, trimmedMessage, sender);
        });
        socket.on("REQUEST_GAME_STATE", ({ joinCode }) => {
            emitGameUpdate(io, joinCode);
        });
    });
}
function emitLobbyUpdate(io, joinCode) {
    const lobby = lobbyManager.getLobbyByCode(joinCode);
    if (!lobby)
        return;
    io.to(joinCode).emit("LOBBY_UPDATE", {
        players: Array.from(lobby.players.values()).map((p) => ({
            id: p.id,
            name: p.name,
            isHost: p.id === lobby.hostId,
            isReady: p.ready,
            isConnected: Boolean(p.socketId),
        })),
        status: lobby.status,
    });
}
function emitGameUpdate(io, joinCode) {
    const lobby = lobbyManager.getLobbyByCode(joinCode);
    if (!lobby)
        return;
    const activeGame = gameManager.getGame(joinCode);
    if (!activeGame)
        return;
    const publicState = gameManager.getPublicState(joinCode);
    if (!publicState)
        return;
    for (const player of lobby.players.values()) {
        if (!player.socketId)
            continue;
        const privateState = gameManager.getPrivateState(joinCode, player.id);
        io.to(player.socketId).emit("GAME_UPDATE", {
            publicState,
            privateState,
        });
    }
}
function emitChatUpdate(io, joinCode, message, senderName) {
    io.to(joinCode).emit("CHAT_MESSAGE", {
        id: randomUUID(),
        text: message,
        sender: senderName,
    });
}
function emitSystemChat(io, joinCode, message) {
    emitChatUpdate(io, joinCode, message, "[System]");
}
