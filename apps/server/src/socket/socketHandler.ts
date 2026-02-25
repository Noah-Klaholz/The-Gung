import { Server, Socket } from "socket.io";
import { LobbyManager } from "../lobby/lobbyManager.ts";

const lobbyManager = new LobbyManager();

export function setupSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log("🔌 Connected:", socket.id);

    socket.on("CREATE_LOBBY", ({ playerName }) => {
      const result = lobbyManager.createLobby(playerName, socket.id);

      socket.join(result.lobbyId);

      socket.emit("LOBBY_CREATED", result);
      emitLobbyUpdate(io, result.lobbyId);
    });

    socket.on("JOIN_LOBBY", ({ lobbyId, playerName }) => {
      const result = lobbyManager.joinLobby(
        lobbyId,
        playerName,
        socket.id
      );

      if (!result) {
        socket.emit("ERROR", { message: "Lobby not found" });
        return;
      }

      socket.join(lobbyId);

      socket.emit("LOBBY_JOINED", result);
      emitLobbyUpdate(io, lobbyId);
    });

    socket.on("RECONNECT_PLAYER", ({ lobbyId, playerId }) => {
      const success = lobbyManager.reconnectPlayer(
        lobbyId,
        playerId,
        socket.id
      );

      if (!success) {
        socket.emit("ERROR", { message: "Reconnection failed" });
        return;
      }

      socket.join(lobbyId);

      emitLobbyUpdate(io, lobbyId);
    });

    socket.on("START_GAME", ({ lobbyId }) => {
      const lobby = lobbyManager.getLobby(lobbyId);
      if (!lobby) return;

      lobby.status = "playing";

      // GameManager will later initialize game here

      io.to(lobbyId).emit("GAME_STARTED");
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected:", socket.id);
      lobbyManager.removeSocket(socket.id);
    });
  });
}

function emitLobbyUpdate(io: Server, lobbyId: string) {
  const lobby = lobbyManager.getLobby(lobbyId);
  if (!lobby) return;

  io.to(lobbyId).emit("LOBBY_UPDATE", {
    players: Array.from(lobby.players.values()).map(p => ({
      id: p.id,
      name: p.name
    })),
    status: lobby.status
  });
}