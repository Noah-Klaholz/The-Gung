import { Lobby } from "../lobby/lobbyManager";
import "DeckManager";
// import { TheGung } from "gameLogic";

interface ActiveGame {
  lobbyCode: string;
  game: any; // specific game instance
}

export class GameManager {
  private activeGames = new Map<string, ActiveGame>();

  startGame(lobby: Lobby) {
    //TODO
  }

  getGame(lobbyCode: string) {
    return this.activeGames.get(lobbyCode)?.game;
  }

  endGame(lobbyCode: string) {
    this.activeGames.delete(lobbyCode);
  }
}