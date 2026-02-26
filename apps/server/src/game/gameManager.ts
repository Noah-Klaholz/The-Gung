import type { Lobby } from "../lobby/lobbyManager.ts";
import { gameLogic } from "./gameLogic.ts";

interface ActiveGame {
  lobbyCode: string;
  game: gameLogic; // specific game instance
}

export class GameManager {
  private activeGames = new Map<string, ActiveGame>();

  startGame(lobby: Lobby) {
    const playerArr = Array.from(lobby.players.values());
    const game = new gameLogic(playerArr);
    this.activeGames.set( lobby.joinCode, { lobbyCode: lobby.joinCode, game });
  }

  getGame(lobbyCode: string) {
    return this.activeGames.get(lobbyCode); // can return undefined
  }

  endGame(lobbyCode: string) {
    this.activeGames.delete(lobbyCode);
  }
}