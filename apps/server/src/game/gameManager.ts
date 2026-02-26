import { v4 as uuid } from "uuid";
import { Lobby } from "../lobby/lobbyManager";
import "DeckManager";
import { gameLogic } from "./gameLogic";
import { act } from "react";

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