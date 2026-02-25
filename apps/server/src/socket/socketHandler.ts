import { Server, Socket } from "socket.io";
import { LobbyManager } from "../lobby/lobbyManager.ts";

const lobbyManager = new LobbyManager();

export function setupSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(" Connected:", socket.id);

    socket.on("CREATE_LOBBY", ({ playerName }) => {
      const result = lobbyManager.createLobby(playerName, socket.id);

      socket.join(result.joinCode);

      socket.emit("LOBBY_CREATED", result);
      emitLobbyUpdate(io, result.joinCode);
    });

    socket.on("JOIN_LOBBY", ({ joinCode, playerName }) => {
      const result = lobbyManager.joinLobby(joinCode, playerName, socket.id);

      if (!result) {
        socket.emit("ERROR", { message: "Lobby not found" });
        return;
      }

      socket.join(result.joinCode);

      socket.emit("LOBBY_JOINED", result);
      emitLobbyUpdate(io, result.joinCode);
    });

    socket.on("RECONNECT_PLAYER", ({ joinCode, playerId }) => {
      const success = lobbyManager.reconnectPlayerByCode(
        joinCode,
        playerId,
        socket.id,
      );

      if (!success) {
        socket.emit("ERROR", { message: "Reconnection failed" });
        return;
      }

      socket.join(joinCode);
      emitLobbyUpdate(io, joinCode);
    });

    socket.on("START_GAME", ({ joinCode }) => {
      const lobby = lobbyManager.getLobbyByCode(joinCode);
      if (!lobby) return;

      lobby.status = "playing";
      console.log("Starting game")

      io.to(joinCode).emit("GAME_STARTED");
    });

    socket.on("TOGGLE_READY", ({joinCode, playerId}) => {
      const success = lobbyManager.setPlayerReady(
        joinCode,
        playerId,
      );

      if (!success) {
        socket.emit("ERROR", { message: "Reconnection failed" });
        return;
      }

      emitLobbyUpdate(io, joinCode);
    })
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
