import type { Lobby } from "../lobby/lobbyManager.js";
import { gameLogic } from "./gameLogic.js";
import type { ChipAction, HeistResult } from "./gameLogic.js";

interface ActiveGame {
  lobbyCode: string;
  game: gameLogic; // specific game instance
}

interface ChipActionResult {
  ok: boolean;
  error?: string;
  heistResolved: HeistResult | null;
  gameEnded: boolean;
}

export class GameManager {
  private activeGames = new Map<string, ActiveGame>();

  startGame(lobby: Lobby) {
    const playerArr = Array.from(lobby.players.values());
    const game = new gameLogic(playerArr);
    game.startGame();
    this.activeGames.set(lobby.joinCode, { lobbyCode: lobby.joinCode, game });
  }

  getGame(lobbyCode: string) {
    return this.activeGames.get(lobbyCode); // can return undefined
  }

  applyChipAction(
    lobbyCode: string,
    playerId: string,
    action: ChipAction,
  ): ChipActionResult {
    const activeGame = this.activeGames.get(lobbyCode);
    if (!activeGame) {
      return {
        ok: false,
        error: "Game not found",
        heistResolved: null,
        gameEnded: false,
      };
    }

    const result = activeGame.game.applyChipAction(playerId, action);
    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
        heistResolved: null,
        gameEnded: false,
      };
    }

    return {
      ok: true,
      heistResolved: result.heistResolved ?? null,
      gameEnded: result.gameEnded ?? false,
    };
  }

  getPublicState(lobbyCode: string) {
    const activeGame = this.activeGames.get(lobbyCode);
    if (!activeGame) {
      return null;
    }

    return activeGame.game.getPublicState();
  }

  getPrivateState(lobbyCode: string, playerId: string) {
    const activeGame = this.activeGames.get(lobbyCode);
    if (!activeGame) {
      return null;
    }

    return activeGame.game.getPrivateState(playerId);
  }

  getGameResult(lobbyCode: string) {
    const activeGame = this.activeGames.get(lobbyCode);
    if (!activeGame) {
      return null;
    }

    return activeGame.game.getWinnerState();
  }

  endGame(lobbyCode: string) {
    this.activeGames.delete(lobbyCode);
  }
}