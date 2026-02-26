import { v4 as uuid } from "uuid";
import { Lobby } from "../lobby/lobbyManager";
import "DeckManager";
import { gameLogic } from "./gameLogic";
import { act } from "react";

interface ActiveGame {
  lobbyCode: string;
  game: any; // specific game instance
}

export class GameManager {
  private activeGames = new Map<string, gameLogic>();

  startGame(lobby: Lobby) {
    const gameId = uuid();
    const playerArr = Array.from(lobby.players.values());
    this.activeGames.set(gameId, new gameLogic(playerArr));
  }

  getGame(lobbyCode: string) {
    return this.activeGames.get(lobbyCode); // can return undefined
  }

  endGame(lobbyCode: string) {
    this.activeGames.delete(lobbyCode);
  }
}