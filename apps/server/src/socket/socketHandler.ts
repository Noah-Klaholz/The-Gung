import { Server, Socket } from "socket.io";
import { LobbyManager } from "../lobby/lobbyManager.ts";
import { GameManager } from "../game/gameManager.ts";

const lobbyManager = new LobbyManager();
const gameManager = new GameManager();

export function setupSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(" Connected:", socket.id);

    // Auto-reconnect if deviceId is provided
    const deviceId = socket.handshake.auth.deviceId; // deviceID is used as playerID to allow clean reconnect
    if (deviceId) {
      const lobby = lobbyManager.findLobbyByPlayerId(deviceId); 
      if (lobby) {
        console.log(`Auto-reconnecting player ${deviceId} to lobby ${lobby.joinCode}`);
        lobbyManager.reconnectPlayerByCode(lobby.joinCode, deviceId, socket.id);
        socket.join(lobby.joinCode);
        socket.emit("LOBBY_JOINED", { lobbyId: lobby.id, joinCode: lobby.joinCode, playerId: deviceId });
        emitLobbyUpdate(io, lobby.joinCode);
      }
    }

    socket.on("CREATE_LOBBY", ({ playerName, playerId }) => {
      const result = lobbyManager.createLobby(playerName, socket.id, playerId);

      socket.join(result.joinCode);

      socket.emit("LOBBY_CREATED", result);
      emitLobbyUpdate(io, result.joinCode);
    });

    socket.on("JOIN_LOBBY", ({ joinCode, playerName, playerId }) => {
      const result = lobbyManager.joinLobby(joinCode, playerName, socket.id, playerId);

      if (!result) {
        socket.emit("ERROR", { message: "Lobby not found" });
        return;
      }

      socket.join(result.joinCode);

      socket.emit("LOBBY_JOINED", result);
      emitLobbyUpdate(io, result.joinCode);
    });

    socket.on("LEAVE_LOBBY", ({ joinCode, playerId }) => {
      const result = lobbyManager.leaveLobby(joinCode, playerId);

      if (!result) {
        socket.emit("ERROR", { message: "Lobby not found" });
        return;
      }

      socket.leave(result.joinCode);

      socket.emit("LOBBY_LEFT", result);
      emitLobbyUpdate(io, result.joinCode);
    });

    socket.on("START_GAME", ({ joinCode }) => {
      const lobby = lobbyManager.getLobbyByCode(joinCode);
      if (!lobby) return;

      lobby.status = "playing";

      gameManager.startGame(lobby);

      console.log("Starting game")

      io.to(joinCode).emit("GAME_STARTED");
    });

    socket.on("TOGGLE_READY", ({ joinCode, playerId }) => {
      const success = lobbyManager.setPlayerReady(
        joinCode,
        playerId,
      );

      if (!success) {
        socket.emit("ERROR", { message: "Could not make ready" });
        return;
      }

      emitLobbyUpdate(io, joinCode);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected", socket.id);
      lobbyManager.handleDisconnect(socket.id);
    });
  });
}

function emitLobbyUpdate(io: Server, joinCode: string) {
  const lobby = lobbyManager.getLobbyByCode(joinCode);
  if (!lobby) return;

  io.to(joinCode).emit("LOBBY_UPDATE", {
    players: Array.from(lobby.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.id === lobby.hostId,
      isReady: p.ready,
    })),
    status: lobby.status,
  });
}

function emitGameUpdate(io: Server, joinCode: string) {
  const lobby = lobbyManager.getLobbyByCode(joinCode);
  if (!lobby) return;

  const game = gameManager.getGame(joinCode);
  if (!game) return

  io.to(joinCode).emit("GAME_UPDATE", { /*game*/ }); // TODO actual gamestate here
}